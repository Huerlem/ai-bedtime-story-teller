import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  STORY_STATUS, isChildVisible, normaliseStatus, checkApproval, approvalPatch, withdrawalPatch,
  APPROVAL_MAX_AUTH_AGE_SECONDS,
} from '../src/lib/storyStatus.mjs';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const NOW = 1_800_000_000;
const story = (extra = {}) => ({ userId: 'p1', familyId: 'p1', title: 'Fox', content: 'Once upon a time', status: 'review_required', isPublished: false, ...extra });

test('legacy stories without status require review and are hidden from children', () => {
  assert.equal(normaliseStatus({ isPublished: true }), STORY_STATUS.REVIEW_REQUIRED);
  assert.equal(isChildVisible({ isPublished: true }), false);
});

test('only server-approved, published stories are child-visible', () => {
  assert.equal(isChildVisible(story({ status: 'approved', isPublished: true, approvedBy: 'p1' })), true);
  assert.equal(isChildVisible(story({ status: 'approved', isPublished: true })), false, 'needs approvedBy');
  assert.equal(isChildVisible(story({ status: 'approved', isPublished: false, approvedBy: 'p1' })), false);
  assert.equal(isChildVisible(story({ status: 'review_required', isPublished: true, approvedBy: 'p1' })), false);
  assert.equal(isChildVisible(null), false);
});

test('approval requires a fresh parent sign-in', () => {
  const stale = checkApproval({ story: story(), uid: 'p1', authTimeSeconds: NOW - APPROVAL_MAX_AUTH_AGE_SECONDS - 1, nowSeconds: NOW });
  assert.deepEqual([stale.ok, stale.status, stale.code], [false, 401, 'reauth_required']);
  assert.equal(checkApproval({ story: story(), uid: 'p1', authTimeSeconds: undefined, nowSeconds: NOW }).code, 'reauth_required');
  assert.equal(checkApproval({ story: story(), uid: 'p1', authTimeSeconds: NOW - 10, nowSeconds: NOW }).ok, true);
});

test('another family cannot approve, and gets not-found (no ID oracle)', () => {
  const r = checkApproval({ story: story(), uid: 'p2', authTimeSeconds: NOW, nowSeconds: NOW });
  assert.deepEqual([r.ok, r.status], [false, 404]);
  const forged = checkApproval({ story: story({ familyId: 'p2' }), uid: 'p2', authTimeSeconds: NOW, nowSeconds: NOW });
  assert.equal(forged.ok, false, 'userId must also match');
});

test('incomplete or generating stories cannot be approved', () => {
  assert.equal(checkApproval({ story: story({ content: '  ' }), uid: 'p1', authTimeSeconds: NOW, nowSeconds: NOW }).code, 'incomplete');
  assert.equal(checkApproval({ story: story({ status: 'generating' }), uid: 'p1', authTimeSeconds: NOW, nowSeconds: NOW }).code, 'not_ready');
  assert.equal(checkApproval({ story: null, uid: 'p1', authTimeSeconds: NOW, nowSeconds: NOW }).status, 404);
});

test('approval and withdrawal patches set consistent state', () => {
  const ts = 'TS';
  const a = approvalPatch('p1', ts);
  assert.equal(isChildVisible({ ...story(), ...a }), true);
  assert.equal(a.approvedBy, 'p1');
  const w = withdrawalPatch(ts);
  assert.equal(isChildVisible({ ...story(), ...a, ...w }), false);
});

test('approval route verifies parent, checks fresh auth in a transaction and audits', () => {
  const route = read('src/app/api/stories/[id]/approve/route.js');
  assert.match(route, /await verifyParent\(request\)/);
  assert.match(route, /authTimeSeconds: auth\.token\.auth_time/);
  assert.match(route, /runTransaction/);
  assert.match(route, /type: 'story_approved'/);
});

test('client code never publishes stories directly', () => {
  const create = read('src/app/(dashboard)/create-story/page.js');
  assert.match(create, /isPublished: false,/);
  assert.doesNotMatch(create, /isPublished: publish/);
  const edit = read('src/app/edit-story/[id]/page.js');
  assert.doesNotMatch(edit, /isPublished: formData\.isPublished/);
  assert.match(edit, /StoryApprovalPanel/);
  assert.doesNotMatch(read('src/firebase/firestore.js'), /export const setStoryPublishStatus/);
});

test('Child Mode surfaces only load server-approved stories', () => {
  assert.match(read('src/components/family/KidDashboard.jsx'), /getChildVisibleStories\(/);
  assert.match(read('src/app/(kid-dashboard)/kid/story/[id]/page.jsx'), /if \(!isChildVisible\(storyData\)\)/);
  const data = read('src/firebase/firestore.js');
  const fn = data.slice(data.indexOf('export async function getChildVisibleStories'));
  assert.match(fn, /where\('familyId', '==', familyId\)/);
  assert.match(fn, /where\('status', '==', STORY_STATUS\.APPROVED\)/);
  assert.match(fn, /isChildVisible\(story\)/);
});

test('Firestore rules reserve approval fields for the server', () => {
  const rules = read('firestore.rules');
  assert.match(rules, /function approvalKeys\(\)/);
  assert.match(rules, /'approvedAt', 'approvedBy', 'publishedAt'/);
  assert.match(rules, /request\.resource\.data\.get\('isPublished', false\) == false/);
});
