// Firestore security-rules integration tests (Firebase Emulator).
// Run: npm run test:rules   (requires Java + firebase-tools; executed in CI)
import test, { before, after, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';

const PROJECT_ID = 'dream-tales-rules-test';
let env;

const PARENT_A = 'parentA';
const PARENT_B = 'parentB';
const CHILD_A = 'childA';
const CHILD_B = 'childB';

before(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8') },
  });
});
after(async () => env?.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await db.doc(`users/${PARENT_A}`).set({ role: 'parent', familyId: PARENT_A, displayName: 'A' });
    await db.doc(`users/${PARENT_B}`).set({ role: 'parent', familyId: PARENT_B, displayName: 'B' });
    await db.doc(`users/${CHILD_A}`).set({ role: 'child', familyId: PARENT_A, name: 'Emma' });
    await db.doc(`users/${CHILD_B}`).set({ role: 'child', familyId: PARENT_B, name: 'Lucas' });
    await db.doc('stories/approvedA').set({
      userId: PARENT_A, familyId: PARENT_A, childId: CHILD_A, title: 'Fox', content: 'Once',
      status: 'approved', isPublished: true, approvedBy: PARENT_A,
    });
    await db.doc('stories/draftA').set({
      userId: PARENT_A, familyId: PARENT_A, title: 'Draft', content: 'Draft',
      status: 'review_required', isPublished: false,
    });
  });
});

const as = (uid) => env.authenticatedContext(uid).firestore();
const anon = () => env.unauthenticatedContext().firestore();

// --- registration & privilege escalation -------------------------------------------
test('new user can self-register only as a parent of their own family', async () => {
  await assertSucceeds(as('newParent').doc('users/newParent').set({ role: 'parent', familyId: 'newParent', displayName: 'N' }));
});

test('self-registration as a child is denied', async () => {
  await assertFails(as('sneaky').doc('users/sneaky').set({ role: 'child', familyId: PARENT_A }));
});

test('registering into another family is denied', async () => {
  await assertFails(as('sneaky').doc('users/sneaky').set({ role: 'parent', familyId: PARENT_A }));
});

test('parent cannot change own role or familyId', async () => {
  await assertFails(as(PARENT_B).doc(`users/${PARENT_B}`).update({ familyId: PARENT_A }));
  await assertFails(as(PARENT_B).doc(`users/${PARENT_B}`).update({ role: 'admin' }));
  await assertSucceeds(as(PARENT_B).doc(`users/${PARENT_B}`).update({ displayName: 'Bee' }));
});

test('parent cannot grant themselves subscription entitlements', async () => {
  await assertFails(as(PARENT_A).doc(`users/${PARENT_A}`).update({ entitlements: { premium: true } }));
});

// --- cross-family isolation ------------------------------------------------------
test('parent reads own children but not another family\'s', async () => {
  await assertSucceeds(as(PARENT_A).doc(`users/${CHILD_A}`).get());
  await assertFails(as(PARENT_B).doc(`users/${CHILD_A}`).get());
  await assertFails(as(PARENT_B).doc(`users/${PARENT_A}`).get());
});

test('family children query is scoped to own family', async () => {
  await assertSucceeds(as(PARENT_A).collection('users').where('familyId', '==', PARENT_A).where('role', '==', 'child').get());
  await assertFails(as(PARENT_B).collection('users').where('familyId', '==', PARENT_A).where('role', '==', 'child').get());
});

test('parent cannot create a child profile in another family', async () => {
  await assertFails(as(PARENT_B).doc('users/stolenChild').set({ role: 'child', familyId: PARENT_A, name: 'X' }));
  await assertSucceeds(as(PARENT_A).doc('users/newChild').set({ role: 'child', familyId: PARENT_A, name: 'Theo', age: 5 }));
});

test('parent cannot move or delete another family\'s child', async () => {
  await assertFails(as(PARENT_B).doc(`users/${CHILD_A}`).update({ familyId: PARENT_B }));
  await assertFails(as(PARENT_B).doc(`users/${CHILD_A}`).delete());
  await assertFails(as(PARENT_A).doc(`users/${CHILD_A}`).update({ familyId: PARENT_B }));
});

test('stories are invisible to other families and anonymous users', async () => {
  await assertSucceeds(as(PARENT_A).doc('stories/approvedA').get());
  await assertFails(as(PARENT_B).doc('stories/approvedA').get());
  await assertFails(anon().doc('stories/approvedA').get());
  await assertFails(as(PARENT_B).collection('stories').where('childId', '==', CHILD_A).get());
});

// --- parental approval -------------------------------------------------------------
test('client cannot create a story that is already approved or published', async () => {
  const base = { userId: PARENT_A, familyId: PARENT_A, title: 'T', content: 'C' };
  await assertFails(as(PARENT_A).doc('stories/x1').set({ ...base, status: 'approved', isPublished: false }));
  await assertFails(as(PARENT_A).doc('stories/x2').set({ ...base, status: 'review_required', isPublished: true }));
  await assertFails(as(PARENT_A).doc('stories/x3').set({ ...base, status: 'review_required', isPublished: false, approvedBy: PARENT_A }));
  await assertSucceeds(as(PARENT_A).doc('stories/x4').set({ ...base, status: 'review_required', isPublished: false }));
});

test('client cannot create a story for another family\'s child', async () => {
  await assertFails(as(PARENT_A).doc('stories/x5').set({
    userId: PARENT_A, familyId: PARENT_A, childId: CHILD_B, title: 'T', content: 'C', status: 'review_required', isPublished: false,
  }));
});

test('client cannot approve or publish an existing story', async () => {
  await assertFails(as(PARENT_A).doc('stories/draftA').update({ status: 'approved' }));
  await assertFails(as(PARENT_A).doc('stories/draftA').update({ isPublished: true }));
});

test('editing approved content withdraws approval', async () => {
  await assertFails(as(PARENT_A).doc('stories/approvedA').update({ content: 'changed' }));
  await assertSucceeds(as(PARENT_A).doc('stories/approvedA').update({ content: 'changed', status: 'review_required', isPublished: false }));
});

test('favourite toggle does not touch approval', async () => {
  await assertSucceeds(as(PARENT_A).doc('stories/approvedA').update({ isFavorite: true }));
});

test('ownership fields on stories are immutable', async () => {
  await assertFails(as(PARENT_A).doc('stories/draftA').update({ familyId: PARENT_B }));
});

// --- server-only collections ----------------------------------------------------------
test('usage counters and audit log are closed to clients', async () => {
  await assertFails(as(PARENT_A).doc(`usage/${PARENT_A}_2026-11-17`).set({ story: 0 }));
  await assertFails(as(PARENT_A).doc(`usage/${PARENT_A}_2026-11-17`).get());
  await assertFails(as(PARENT_A).doc('auditLog/a').set({}));
});

test('contact messages are create-only', async () => {
  await assertSucceeds(anon().collection('contactMessages').add({ name: 'N', email: 'n@example.com', message: 'Hi', status: 'new' }));
  await assertFails(anon().collection('contactMessages').get());
});
