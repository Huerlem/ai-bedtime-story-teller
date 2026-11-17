// Dream Tales V2 — Sleep Mode (read-only bedtime playback). Approved 17 Nov 2026 as
// functionality only: NO user interface until a Sleep Mode design is approved in Figma.
// Sleep Mode can only ever play stories that a parent approved server-side; it never
// creates, generates, edits or publishes anything.
import { isChildVisible } from './storyStatus.mjs';

export const SLEEP_TIMER_OPTIONS_MIN = Object.freeze([10, 20, 30, 45]);
export const DEFAULT_SLEEP_TIMER_MIN = 20;
export const MAX_QUEUE = 5;

/**
 * Build the bedtime queue from stories already loaded through the approved-only Child Mode
 * query. Re-checks approval defensively, keeps the child's own stories first, then
 * family-wide ones, newest first, and caps the length.
 */
export function buildSleepQueue(stories, { childId, maxStories = MAX_QUEUE } = {}) {
  const ok = (stories || []).filter((s) => isChildVisible(s) && (!s.childId || s.childId === childId));
  const time = (v) => v?.toDate?.()?.getTime?.() ?? (v ? new Date(v).getTime() : 0) ?? 0;
  const ranked = ok.sort((a, b) => {
    const own = Number(b.childId === childId) - Number(a.childId === childId);
    return own || time(b.approvedAt || b.createdAt) - time(a.approvedAt || a.createdAt);
  });
  return ranked.slice(0, Math.max(0, Math.min(maxStories, MAX_QUEUE)));
}

/** Clamp a requested timer to the allowed options (parent setting; default 20 minutes). */
export function sleepTimerMinutes(requested) {
  return SLEEP_TIMER_OPTIONS_MIN.includes(requested) ? requested : DEFAULT_SLEEP_TIMER_MIN;
}

/**
 * Playback controller state machine, framework-agnostic. Actions: start, trackEnded, tick,
 * stop. Auto-advances through the queue and stops when the timer expires or the queue ends.
 * Never autoplays on load (handoff 139:18): playback begins only with an explicit `start`.
 */
export function sleepReducer(state, action) {
  switch (action.type) {
    case 'start':
      if (!action.queue?.length) return { ...state, status: 'empty' };
      return { status: 'playing', queue: action.queue, index: 0, remainingSec: sleepTimerMinutes(action.timerMin) * 60 };
    case 'trackEnded':
      if (state.status !== 'playing') return state;
      return state.index + 1 < state.queue.length ? { ...state, index: state.index + 1 } : { ...state, status: 'finished' };
    case 'tick': {
      if (state.status !== 'playing') return state;
      const remainingSec = Math.max(0, state.remainingSec - (action.seconds ?? 1));
      return remainingSec === 0 ? { ...state, remainingSec, status: 'timer_elapsed' } : { ...state, remainingSec };
    }
    case 'stop':
      return { ...state, status: 'stopped' };
    default:
      return state;
  }
}
