import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildSleepQueue, sleepReducer, sleepTimerMinutes, MAX_QUEUE } from '../src/lib/sleepMode.mjs';

const ok = (id, extra = {}) => ({ id, familyId: 'p1', userId: 'p1', status: 'approved', isPublished: true, approvedBy: 'p1', createdAt: `2026-11-1${id.length}T20:00:00Z`, ...extra });

test('Sleep Mode queue contains only server-approved stories for this child or the family', () => {
  const q = buildSleepQueue([
    ok('a', { childId: 'c1' }), ok('bb'), ok('ccc', { childId: 'c2' }),
    { id: 'draft', familyId: 'p1', status: 'review_required', isPublished: false, childId: 'c1' },
    { id: 'legacy', familyId: 'p1', isPublished: true, childId: 'c1' },
  ], { childId: 'c1' });
  assert.deepEqual(q.map((s) => s.id), ['a', 'bb']);
});

test('queue is capped and own stories come first', () => {
  const many = Array.from({ length: 9 }, (_, i) => ok(`s${'x'.repeat(i)}`, i % 2 ? {} : { childId: 'c1' }));
  const q = buildSleepQueue(many, { childId: 'c1' });
  assert.equal(q.length, MAX_QUEUE);
  assert.ok(q.slice(0, 3).every((s) => s.childId === 'c1'));
});

test('timer is clamped; playback never starts by itself and stops on timer or queue end', () => {
  assert.equal(sleepTimerMinutes(999), 20);
  let s = { status: 'idle' };
  assert.equal(sleepReducer(s, { type: 'tick' }).status, 'idle', 'no autoplay');
  s = sleepReducer(s, { type: 'start', queue: [ok('a'), ok('bb')], timerMin: 10 });
  assert.equal(s.remainingSec, 600);
  s = sleepReducer(s, { type: 'trackEnded' }); assert.equal(s.index, 1);
  s = sleepReducer(s, { type: 'trackEnded' }); assert.equal(s.status, 'finished');
  let t = sleepReducer({ status: 'idle' }, { type: 'start', queue: [ok('a')], timerMin: 10 });
  t = sleepReducer(t, { type: 'tick', seconds: 600 }); assert.equal(t.status, 'timer_elapsed');
  assert.equal(sleepReducer({ status: 'idle' }, { type: 'start', queue: [] }).status, 'empty');
});

test('Sleep Mode has no interface yet and no write capability', () => {
  const src = readFileSync(new URL('../src/lib/sleepMode.mjs', import.meta.url), 'utf8');
  const imports = [...src.matchAll(/^import .* from '([^']+)';$/gm)].map((m) => m[1]);
  assert.deepEqual(imports, ['./storyStatus.mjs']);
  assert.doesNotMatch(src, /fetch\(|setDoc\(|updateDoc\(|addDoc\(|secureFetch/);
});
