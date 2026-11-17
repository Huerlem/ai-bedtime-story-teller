// Dream Tales V2 — per-parent daily quotas for paid AI / narration providers.
// Values can be tuned per environment without code changes, e.g.
// DREAMTALES_QUOTA_STORY=20. A value of 0 disables the feature entirely.

export const DEFAULT_DAILY_LIMITS = Object.freeze({
  story: 15,        // Groq story generation
  title: 40,        // Groq title suggestions
  suggestion: 40,   // Groq prompt suggestions
  image: 10,        // illustration generation
  tts: 20,          // Google Cloud TTS (up to 4,500 characters each)
});

/** Global ceiling across all quota kinds for one account per day. */
export const DEFAULT_DAILY_TOTAL = 100;

export function resolveLimits(env = {}) {
  const limits = {};
  for (const [kind, fallback] of Object.entries(DEFAULT_DAILY_LIMITS)) {
    limits[kind] = parseLimit(env[`DREAMTALES_QUOTA_${kind.toUpperCase()}`], fallback);
  }
  return { limits, total: parseLimit(env.DREAMTALES_QUOTA_TOTAL, DEFAULT_DAILY_TOTAL) };
}

function parseLimit(raw, fallback) {
  if (raw === undefined || raw === null || raw === '') return fallback;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 && n <= 100000 ? n : fallback;
}

/** UTC day key and seconds until the next UTC midnight. */
export function quotaWindow(now = new Date()) {
  const day = now.toISOString().slice(0, 10);
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return { day, resetsAt: new Date(next).toISOString(), retryAfterSeconds: Math.max(1, Math.ceil((next - now.getTime()) / 1000)) };
}

/**
 * Pure decision: given the current counters, may one more `kind` request proceed?
 * @param {{counts:Record<string,number>, kind:string, limits:Record<string,number>, total:number}} p
 */
export function decideQuota({ counts = {}, kind, limits, total }) {
  if (!Object.prototype.hasOwnProperty.call(limits, kind)) {
    return { allowed: false, error: 'Unknown usage category' };
  }
  const used = Number(counts[kind] || 0);
  const usedTotal = Object.keys(limits).reduce((sum, k) => sum + Number(counts[k] || 0), 0);
  if (limits[kind] === 0) return { allowed: false, error: 'This feature is currently unavailable' };
  if (used >= limits[kind]) return { allowed: false, error: 'Daily limit reached for this feature. Please try again tomorrow.' };
  if (usedTotal >= total) return { allowed: false, error: 'Daily usage limit reached. Please try again tomorrow.' };
  return { allowed: true, remaining: limits[kind] - used - 1 };
}
