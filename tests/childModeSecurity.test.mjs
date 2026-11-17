import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  validateNewPin, lockState, afterFailure, checkFreshPassword, childModeClaims, childModeUid, isValidId, FRESH_AUTH_SECONDS,
} from '../src/lib/parentGatePolicy.mjs';
import { hashPin, verifyPin } from '../src/lib/server/pinHash.js';
import { narrationPath, canAccessStoryMedia } from '../src/lib/mediaAccess.mjs';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const NOW = 1_800_000_000;

test('PIN policy rejects malformed and guessable codes', () => {
  for (const bad of ['', '123', '12345', 'abcd', '1111', '1234', '4321', '6789', '1212', '2580', 12, null]) {
    assert.equal(validateNewPin(bad).ok, false, String(bad));
  }
  for (const good of ['4826', '0397', '7150']) assert.equal(validateNewPin(good).ok, true, good);
});

test('PIN is stored as a salted scrypt hash and verified in constant time', async () => {
  const a = await hashPin('4826');
  const b = await hashPin('4826');
  assert.notEqual(a.pinHash, b.pinHash, 'salted');
  assert.doesNotMatch(JSON.stringify(a), /4826/);
  assert.equal(await verifyPin('4826', a), true);
  assert.equal(await verifyPin('4827', a), false);
  assert.equal(await verifyPin('4826', {}), false);
});

test('escalating lockout after repeated wrong codes', () => {
  let state = { failedAttempts: 0, lockedUntilMs: 0 };
  for (let i = 0; i < 4; i++) state = afterFailure(state, NOW * 1000);
  assert.equal(lockState(state, NOW * 1000).locked, false);
  state = afterFailure(state, NOW * 1000);
  assert.equal(state.failedAttempts, 5);
  assert.equal(lockState(state, NOW * 1000).retryAfterSeconds, 15 * 60);
  for (let i = 0; i < 5; i++) state = afterFailure(state, NOW * 1000);
  assert.equal(lockState(state, NOW * 1000).retryAfterSeconds, 60 * 60);
  assert.equal(lockState(state, NOW * 1000 + 61 * 60 * 1000).locked, false);
});

test('privileged actions need a fresh password sign-in, never Child Mode or a PIN-restored session', () => {
  const pw = { firebase: { sign_in_provider: 'password' }, auth_time: NOW - 30 };
  assert.equal(checkFreshPassword(pw, NOW).ok, true);
  assert.equal(checkFreshPassword({ ...pw, auth_time: NOW - FRESH_AUTH_SECONDS - 1 }, NOW).ok, false);
  assert.equal(checkFreshPassword({ ...pw, firebase: { sign_in_provider: 'custom' } }, NOW).ok, false);
  assert.equal(checkFreshPassword({ ...pw, dtRole: 'child_mode' }, NOW).ok, false);
});

test('Child Mode identity is separate from the parent and carries only family/child claims', () => {
  assert.equal(childModeUid('abc'), 'cm-abc');
  assert.deepEqual(childModeClaims({ familyId: 'p1', childId: 'c1' }), { dtRole: 'child_mode', familyId: 'p1', childId: 'c1' });
  assert.equal(isValidId('../users'), false);
});

test('narration paths are recovered only inside the owner\'s audio folder', () => {
  const s = { userId: 'p1', familyId: 'p1' };
  assert.equal(narrationPath({ ...s, audioPath: 'audio/p1/1.mp3' }), 'audio/p1/1.mp3');
  assert.equal(narrationPath({ ...s, audioPath: 'audio/p2/1.mp3' }), null);
  assert.equal(narrationPath({ ...s, audioPath: 'audio/p1/../p2/1.mp3' }), null);
  assert.equal(narrationPath({ ...s, audioUrl: 'https://firebasestorage.googleapis.com/v0/b/x.appspot.com/o/audio%2Fp1%2F9.mp3?alt=media&token=t' }), 'audio/p1/9.mp3');
  assert.equal(narrationPath({ ...s, audioUrl: 'https://storage.googleapis.com/x.appspot.com/audio/p1/9.mp3' }), 'audio/p1/9.mp3');
  assert.equal(narrationPath({ ...s, audioUrl: 'https://evil.example/audio/p1/9.mp3' }), null);
});

test('media access: parents see own family; Child Mode only approved stories of its family', () => {
  const approved = { userId: 'p1', familyId: 'p1', status: 'approved', isPublished: true, approvedBy: 'p1' };
  const draft = { userId: 'p1', familyId: 'p1', status: 'review_required', isPublished: false };
  assert.equal(canAccessStoryMedia(draft, { kind: 'parent', uid: 'p1' }), true);
  assert.equal(canAccessStoryMedia(draft, { kind: 'parent', uid: 'p2' }), false);
  assert.equal(canAccessStoryMedia(approved, { kind: 'child', familyId: 'p1' }), true);
  assert.equal(canAccessStoryMedia(draft, { kind: 'child', familyId: 'p1' }), false);
  assert.equal(canAccessStoryMedia(approved, { kind: 'child', familyId: 'p2' }), false);
});

test('server wiring: Child Mode tokens never pass the parent gate; privileged routes need fresh password', () => {
  const gate = read('src/lib/server/requireParent.js');
  assert.match(gate, /if \(token\.dtRole\) \{/);
  assert.match(gate, /export async function verifyFreshParent/);
  for (const f of ['src/app/api/account/route.js', 'src/app/api/account/export/route.js', 'src/app/api/parent-gate/pin/route.js']) {
    assert.match(read(f), /await verifyFreshParent\(request\)/, f);
  }
  assert.match(read('src/app/api/stories/[id]/approve/route.js'), /loadStory\(request, params, \{ fresh: true \}\)/);
  const enter = read('src/app/api/child-mode/enter/route.js');
  assert.match(enter, /child\.data\(\)\.familyId !== auth\.uid/);
  assert.match(enter, /code: 'pin_required'/);
  const exit = read('src/app/api/child-mode/exit/route.js');
  assert.match(exit, /token\.dtRole !== CHILD_MODE_ROLE/);
  assert.match(exit, /lockState\(secrets, now\)/);
  assert.match(exit, /afterFailure\(secrets, now\)/);
});

test('client: Child Mode never bootstraps a parent profile and uses claims for its library', () => {
  const ctx = read('src/contexts/AuthContext.jsx');
  const branch = ctx.slice(ctx.indexOf('tokenResult.claims.dtRole === CHILD_MODE_ROLE'), ctx.indexOf('return;', ctx.indexOf('tokenResult.claims.dtRole === CHILD_MODE_ROLE')));
  assert.ok(branch.length > 0);
  assert.doesNotMatch(branch, /setDoc/);
  assert.match(read('src/app/(kid-dashboard)/kid/dashboard/page.js'), /familyId=\{childProfile\.familyId\}/);
  assert.match(read('src/firebase/firestore.js'), /where\('isPublished', '==', true\)/);
  const gateUi = read('src/components/childmode/ParentGate.jsx');
  assert.doesNotMatch(gateUi, /pinHash|=== ?['"]\d{4}['"]/, 'no client-side PIN comparison');
});

test('narration is stored as a private path, not a tokenised download URL', () => {
  const tts = read('src/hooks/useTextToSpeech.js');
  assert.doesNotMatch(tts, /getDownloadURL/);
  assert.match(tts, /return storageRef\.fullPath;/);
  assert.match(read('src/app/(dashboard)/create-story/page.js'), /audioPath: audioUrl \|\| null/);
  assert.match(read('src/app/api/media/narration/route.js'), /getSignedUrl\(/);
});

test('Parent Gate submits the code outside React state updaters (no double submit)', () => {
  const ui = read('src/components/childmode/ParentGate.jsx');
  assert.doesNotMatch(ui, /setDigits\(\(current\) => \{[^}]*submit\(/s);
  assert.match(ui, /if \(next\.length === 4\) submit\(next\);/);
});
