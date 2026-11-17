// Dream Tales V2 — Child Mode session and Parent Gate policy (pure, shared by server and tests).
// Figma: Parental Verification (50:14 screen 7; prototype 105:18–105:267). The handoff forbids
// client-side PINs; the PIN is verified only on the server, hashed and throttled.

export const CHILD_MODE_ROLE = 'child_mode';
export const PIN_LENGTH = 4;
export const FRESH_AUTH_SECONDS = 5 * 60;

/** Firebase Auth uid used for a child's restricted session (never a parent uid). */
export function childModeUid(childId) {
  return `cm-${childId}`;
}

export function isValidId(id) {
  return typeof id === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(id);
}

/** Reject malformed and trivially guessable codes. */
export function validateNewPin(pin) {
  if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) return { ok: false, error: 'The code must be exactly 4 digits' };
  if (/^(\d)\1{3}$/.test(pin)) return { ok: false, error: 'Please avoid repeated digits such as 1111' };
  const d = [...pin].map(Number);
  const step = d[1] - d[0];
  if ((step === 1 || step === -1) && d.every((v, i) => i === 0 || v - d[i - 1] === step)) {
    return { ok: false, error: 'Please avoid sequences such as 1234' };
  }
  if (['1212', '2580', '0852', '1004', '2000', '1122', '6969'].includes(pin)) return { ok: false, error: 'Please choose a less common code' };
  return { ok: true };
}

export function isPinShaped(pin) {
  return typeof pin === 'string' && /^\d{4}$/.test(pin);
}

// Escalating lockout after consecutive failures.
const LOCKOUTS = [
  { after: 15, seconds: 24 * 60 * 60 },
  { after: 10, seconds: 60 * 60 },
  { after: 5, seconds: 15 * 60 },
];

/** Is the gate locked right now? */
export function lockState({ lockedUntilMs = 0 }, nowMs) {
  if (lockedUntilMs > nowMs) return { locked: true, retryAfterSeconds: Math.ceil((lockedUntilMs - nowMs) / 1000) };
  return { locked: false, retryAfterSeconds: 0 };
}

/** New counters after a failed attempt. */
export function afterFailure({ failedAttempts = 0 }, nowMs) {
  const attempts = failedAttempts + 1;
  const rule = LOCKOUTS.find((r) => attempts >= r.after && attempts % 5 === 0);
  return { failedAttempts: attempts, lockedUntilMs: rule ? nowMs + rule.seconds * 1000 : 0 };
}

/** Fresh password sign-in required for privileged parent actions (approve, PIN change, delete, export). */
export function checkFreshPassword(token, nowSeconds) {
  if (!token || token.dtRole) return { ok: false, code: 'reauth_required' };
  const provider = token.firebase?.sign_in_provider;
  if (provider !== 'password') return { ok: false, code: 'reauth_required' };
  if (typeof token.auth_time !== 'number' || nowSeconds - token.auth_time > FRESH_AUTH_SECONDS) return { ok: false, code: 'reauth_required' };
  return { ok: true };
}

/** Claims embedded in the child-session custom token (read by Firestore rules). */
export function childModeClaims({ familyId, childId }) {
  return { dtRole: CHILD_MODE_ROLE, familyId, childId };
}
