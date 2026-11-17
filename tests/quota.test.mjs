import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decideQuota, resolveLimits, quotaWindow, DEFAULT_DAILY_LIMITS } from '../src/lib/quotaPolicy.mjs';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const { limits, total } = resolveLimits({});

test('defaults apply when env is empty or invalid', () => {
  assert.deepEqual(limits, { ...DEFAULT_DAILY_LIMITS });
  const r = resolveLimits({ DREAMTALES_QUOTA_STORY: 'abc', DREAMTALES_QUOTA_TTS: '-1', DREAMTALES_QUOTA_IMAGE: '3' });
  assert.equal(r.limits.story, DEFAULT_DAILY_LIMITS.story);
  assert.equal(r.limits.tts, DEFAULT_DAILY_LIMITS.tts);
  assert.equal(r.limits.image, 3);
});

test('allows until the per-feature limit is reached', () => {
  assert.equal(decideQuota({ counts: {}, kind: 'story', limits, total }).allowed, true);
  assert.equal(decideQuota({ counts: { story: limits.story - 1 }, kind: 'story', limits, total }).allowed, true);
  assert.equal(decideQuota({ counts: { story: limits.story }, kind: 'story', limits, total }).allowed, false);
});

test('global daily ceiling applies across features', () => {
  const r = decideQuota({ counts: { story: 1, tts: 1 }, kind: 'title', limits, total: 2 });
  assert.equal(r.allowed, false);
});

test('a zero limit disables a feature and unknown kinds are refused', () => {
  assert.equal(decideQuota({ counts: {}, kind: 'image', limits: { ...limits, image: 0 }, total }).allowed, false);
  assert.equal(decideQuota({ counts: {}, kind: 'video', limits, total }).allowed, false);
});

test('quota window resets at UTC midnight', () => {
  const w = quotaWindow(new Date('2026-11-17T23:59:30Z'));
  assert.equal(w.day, '2026-11-17');
  assert.equal(w.resetsAt, '2026-11-18T00:00:00.000Z');
  assert.equal(w.retryAfterSeconds, 30);
});

test('every paid AI/TTS route charges a quota after verifying the parent', () => {
  for (const [route, kind] of [['generate-story', 'story'], ['generate-title', 'title'], ['generate-suggestion', 'suggestion'], ['generate-image', 'image'], ['tts', 'tts']]) {
    assert.match(read(`src/app/api/${route}/route.js`), new RegExp(`await requireParent\\((request|req), \\{ quota: '${kind}' \\}\\)`), route);
  }
  const gate = read('src/lib/server/requireParent.js');
  assert.match(gate, /profile\.familyId !== token\.uid/);
  assert.match(gate, /status: 429/);
  const store = read('src/lib/server/quota.js');
  assert.match(store, /runTransaction/);
  assert.match(store, /allowed: false, error: 'Usage could not be verified/, 'must fail closed');
});
