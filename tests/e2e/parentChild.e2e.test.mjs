// End-to-end Parent–Child journeys, privilege-escalation and cross-family attempts.
// Runs against `next start` (production build) + Firebase Auth/Firestore/Storage emulators.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import {
  addChild, addStory, api, closeClients, enterChildMode, idToken, isPermissionDenied, signUpParent,
} from './helpers.mjs';

let A; let B; let childA; const PIN = '4826';
before(async () => {
  A = await signUpParent('parentA');
  B = await signUpParent('parentB');
  childA = await addChild(A, 'Emma', 6);
  await addStory(A, { id: `sA1_${A.uid.slice(0, 6)}`, title: 'The Fox and the Starlight Forest', childId: childA, audio: true });
  await addStory(A, { id: `sA2_${A.uid.slice(0, 6)}`, title: 'Draft not yet reviewed', childId: childA, audio: true });
});
after(closeClients);
const s1 = () => `sA1_${A.uid.slice(0, 6)}`;
const s2 = () => `sA2_${A.uid.slice(0, 6)}`;

test('every protected API rejects unauthenticated requests', async () => {
  const routes = [
    ['/api/generate-story', 'POST', { prompt: 'x' }], ['/api/tts', 'POST', { text: 'x' }],
    ['/api/stories/abc/approve', 'POST'], ['/api/stories/abc/approve', 'DELETE'],
    ['/api/parent-gate/pin', 'GET'], ['/api/parent-gate/pin', 'POST', { pin: '4826' }],
    ['/api/child-mode/enter', 'POST', { childId: 'x' }], ['/api/child-mode/exit', 'POST', { pin: '4826' }],
    ['/api/media/narration?storyId=abc', 'GET'], ['/api/account/export', 'GET'], ['/api/account', 'DELETE', { confirm: 'DELETE' }],
  ];
  for (const [path, method, body] of routes) {
    const res = await api(path, { method, body });
    assert.equal(res.status, 401, `${method} ${path}`);
  }
  const forged = await api('/api/stories/abc/approve', { method: 'POST', token: 'forged.token.value' });
  assert.equal(forged.status, 401, 'forged token');
});

test('clients cannot approve or publish directly — only the server approval route can', async () => {
  await assert.rejects(updateDoc(doc(A.db, 'stories', s2()), { status: 'approved' }), isPermissionDenied);
  await assert.rejects(updateDoc(doc(A.db, 'stories', s2()), { isPublished: true }), isPermissionDenied);
});

test('Child Mode cannot start until a Parental Verification code exists', async () => {
  const res = await api('/api/child-mode/enter', { token: await idToken(A), method: 'POST', body: { childId: childA } });
  assert.equal(res.status, 409);
  assert.equal(res.body.code, 'pin_required');
});

test('weak codes are rejected; parent sets a code with a fresh password session', async () => {
  const weak = await api('/api/parent-gate/pin', { token: await idToken(A), method: 'POST', body: { pin: '1234' } });
  assert.equal(weak.status, 400);
  const ok = await api('/api/parent-gate/pin', { token: await idToken(A), method: 'POST', body: { pin: PIN } });
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  const status = await api('/api/parent-gate/pin', { token: await idToken(A) });
  assert.deepEqual(status.body, { hasPin: true });
});

test('parent approves one story through the server; the other stays a draft', async () => {
  const res = await api(`/api/stories/${s1()}/approve`, { token: await idToken(A), method: 'POST' });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const snap = await getDoc(doc(A.db, 'stories', s1()));
  assert.equal(snap.data().status, 'approved');
  assert.equal(snap.data().isPublished, true);
  assert.equal(snap.data().approvedBy, A.uid);
});

test('Child Mode sees only approved stories and cannot reach drafts or parent data', async () => {
  const child = await enterChildMode(A, childA);
  const lib = await getDocs(query(collection(child.db, 'stories'),
    where('familyId', '==', A.uid), where('status', '==', 'approved'), where('isPublished', '==', true)));
  assert.deepEqual(lib.docs.map((d) => d.id), [s1()]);
  await assert.rejects(getDoc(doc(child.db, 'stories', s2())), isPermissionDenied);
  await assert.rejects(getDocs(query(collection(child.db, 'stories'), where('familyId', '==', A.uid))), isPermissionDenied);
  await assert.rejects(getDoc(doc(child.db, 'users', A.uid)), isPermissionDenied);
  await assert.rejects(setDoc(doc(child.db, 'users', child.auth.currentUser.uid), { role: 'parent', familyId: child.auth.currentUser.uid }), isPermissionDenied);
  assert.equal((await getDoc(doc(child.db, 'users', childA))).data().name, 'Emma');
});

test('Child Mode tokens are refused by every parent API', async () => {
  const child = await enterChildMode(A, childA);
  const t = await idToken(child);
  const attempts = [
    ['/api/generate-story', 'POST', { prompt: 'a fox' }], ['/api/tts', 'POST', { text: 'hi' }],
    [`/api/stories/${s2()}/approve`, 'POST'], [`/api/stories/${s1()}/approve`, 'DELETE'],
    ['/api/parent-gate/pin', 'POST', { pin: '9071' }], ['/api/child-mode/enter', 'POST', { childId: childA }],
    ['/api/account/export', 'GET'], ['/api/account', 'DELETE', { confirm: 'DELETE' }],
  ];
  for (const [path, method, body] of attempts) {
    const res = await api(path, { token: t, method, body });
    assert.ok([401, 403].includes(res.status), `${method} ${path} -> ${res.status}`);
  }
});

test('narration links are issued only for authorised stories', async () => {
  const child = await enterChildMode(A, childA);
  assert.equal((await api(`/api/media/narration?storyId=${s1()}`, { token: await idToken(child) })).status, 200);
  assert.equal((await api(`/api/media/narration?storyId=${s2()}`, { token: await idToken(child) })).status, 404, 'draft hidden from child');
  assert.equal((await api(`/api/media/narration?storyId=${s2()}`, { token: await idToken(A) })).status, 200, 'parent may preview drafts');
  assert.equal((await api(`/api/media/narration?storyId=${s1()}`, { token: await idToken(B) })).status, 404, 'other family');
});

test('cross-family access is denied for data, approvals, Child Mode and media', async () => {
  await assert.rejects(getDoc(doc(B.db, 'stories', s1())), isPermissionDenied);
  await assert.rejects(getDoc(doc(B.db, 'users', childA)), isPermissionDenied);
  await assert.rejects(updateDoc(doc(B.db, 'users', childA), { familyId: B.uid }), isPermissionDenied);
  await assert.rejects(setDoc(doc(B.db, 'stories', 'hijack'), {
    userId: B.uid, familyId: B.uid, childId: childA, title: 't', content: 'c', status: 'review_required', isPublished: false,
  }), isPermissionDenied);
  assert.equal((await api(`/api/stories/${s2()}/approve`, { token: await idToken(B), method: 'POST' })).status, 404);
  assert.equal((await api(`/api/stories/${s1()}/approve`, { token: await idToken(B), method: 'DELETE' })).status, 404);
  assert.equal((await api('/api/child-mode/enter', { token: await idToken(B), method: 'POST', body: { childId: childA } })).status, 404);
});

test('Parent Gate: wrong codes are throttled server-side and lock out; a parent token cannot use the gate', async () => {
  const parentUse = await api('/api/child-mode/exit', { token: await idToken(A), method: 'POST', body: { pin: PIN } });
  assert.equal(parentUse.status, 403);
  const child = await enterChildMode(A, childA);
  const t = await idToken(child);
  const results = [];
  for (const pin of ['1111', '2222', '3333', '4444', '5555']) {
    results.push((await api('/api/child-mode/exit', { token: t, method: 'POST', body: { pin } })).status);
  }
  assert.deepEqual(results, [401, 401, 401, 401, 429]);
  const correctWhileLocked = await api('/api/child-mode/exit', { token: t, method: 'POST', body: { pin: PIN } });
  assert.equal(correctWhileLocked.status, 429, 'correct code must not bypass an active lockout');
});

test('parallel guesses cannot exceed the attempt limit', async () => {
  const C = await signUpParent('parentParallel');
  const kid = await addChild(C, 'Lucas', 4);
  assert.equal((await api('/api/parent-gate/pin', { token: await idToken(C), method: 'POST', body: { pin: '7351' } })).status, 200);
  const child = await enterChildMode(C, kid);
  const t = await idToken(child);
  const guesses = ['0001', '0002', '0003', '0004', '0005', '0006', '0007', '0008', '0009', '0010', '0011', '0012'];
  const statuses = await Promise.all(guesses.map((pin) => api('/api/child-mode/exit', { token: t, method: 'POST', body: { pin } }).then((r) => r.status)));
  const evaluated = statuses.filter((s) => s === 401).length;
  assert.ok(evaluated <= 4, `at most 4 codes evaluated before lockout, got ${evaluated} (${statuses})`);
  assert.ok(statuses.every((s) => [401, 429, 503].includes(s)), String(statuses));
});

test('correct code restores the parent session (custom token, not a password sign-in)', async () => {
  const D = await signUpParent('parentExit');
  const kid = await addChild(D, 'Lucas', 4);
  await api('/api/parent-gate/pin', { token: await idToken(D), method: 'POST', body: { pin: '6093' } });
  const child = await enterChildMode(D, kid);
  const res = await api('/api/child-mode/exit', { token: await idToken(child), method: 'POST', body: { pin: '6093' } });
  assert.equal(res.status, 200);
  assert.ok(typeof res.body.token === 'string');
});

test('daily quota stops paid AI calls (fails closed with 429)', async () => {
  const E = await signUpParent('parentQuota');
  const t = await idToken(E);
  const statuses = [];
  for (let i = 0; i < 3; i += 1) statuses.push((await api('/api/generate-story', { token: t, method: 'POST', body: { prompt: 'A kind fox' } })).status);
  // DREAMTALES_QUOTA_STORY=2 in the E2E environment; no provider key, so allowed calls return 503.
  assert.deepEqual(statuses, [503, 503, 429]);
});

test('account deletion erases the family and its Auth user', async () => {
  const F = await signUpParent('parentDelete');
  const kid = await addChild(F, 'Theo', 5);
  await addStory(F, { id: `sF_${F.uid.slice(0, 6)}`, title: 'To be deleted', childId: kid });
  const exported = await api('/api/account/export', { token: await idToken(F) });
  assert.equal(exported.status, 200);
  assert.equal(exported.body.stories.length, 1);
  assert.equal(exported.body.children.length, 1);
  const bad = await api('/api/account', { token: await idToken(F), method: 'DELETE', body: { confirm: 'nope' } });
  assert.equal(bad.status, 400);
  const res = await api('/api/account', { token: await idToken(F), method: 'DELETE', body: { confirm: 'DELETE' } });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.counts.stories, 1);
  assert.equal(res.body.counts.children, 1);
  const after = await api('/api/account/export', { token: await F.auth.currentUser.getIdToken(true).catch(() => 'revoked') });
  assert.equal(after.status, 401);
});
