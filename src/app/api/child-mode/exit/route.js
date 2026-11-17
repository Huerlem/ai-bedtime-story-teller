import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/server/firebaseAdmin';
import { verifyPin } from '@/lib/server/pinHash';
import { afterFailure, CHILD_MODE_ROLE, isPinShaped, lockState } from '@/lib/parentGatePolicy.mjs';

export const runtime = 'nodejs';
const NO_STORE = { 'Cache-Control': 'no-store' };
const deny = (status, body, headers = {}) => NextResponse.json(body, { status, headers: { ...NO_STORE, ...headers } });

/**
 * POST { pin } — Parental Verification from inside Child Mode.
 * Caller must hold a Child Mode ID token. The code is checked server-side against the
 * scrypt hash with escalating lockouts. On success a custom token restores the parent
 * session; it is NOT a password sign-in, so approvals, code changes, export and account
 * deletion still require the parent's password.
 */
export async function POST(request) {
  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Bearer ') || header.length > 11000) return deny(401, { error: 'Sign in required' });
  let token;
  try { token = await adminAuth().verifyIdToken(header.slice(7), true); } catch { return deny(401, { error: 'Session expired' }); }
  if (token.dtRole !== CHILD_MODE_ROLE || typeof token.familyId !== 'string') return deny(403, { error: 'Not in Child Mode' });

  let body;
  try { body = await request.json(); } catch { return deny(400, { error: 'Invalid JSON' }); }
  if (!isPinShaped(body?.pin)) return deny(400, { error: 'Enter the 4-digit code' });

  const ref = adminDb().collection('parentSecrets').doc(token.familyId);
  const now = Date.now();

  // Reserve the attempt atomically BEFORE verifying: the failure is pre-counted inside a
  // transaction, so parallel guesses cannot exceed the lockout schedule. A correct code
  // resets the counter afterwards.
  let reservation;
  try {
    reservation = await adminDb().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists || !snap.data().pinHash) return { status: 'no_pin' };
      const secrets = snap.data();
      const lock = lockState(secrets, now);
      if (lock.locked) return { status: 'locked', retryAfterSeconds: lock.retryAfterSeconds };
      const next = afterFailure(secrets, now);
      tx.update(ref, { ...next, lastAttemptAt: FieldValue.serverTimestamp() });
      return { status: 'reserved', secrets, next };
    });
  } catch {
    return deny(503, { error: 'Verification is temporarily unavailable. Please try again.' });
  }
  if (reservation.status === 'no_pin') return deny(409, { error: 'No code is set. Use your password instead.', code: 'pin_required' });
  if (reservation.status === 'locked') {
    return deny(429, { error: 'Too many attempts. Please try again later or use your password.', code: 'locked', retryAfterSeconds: reservation.retryAfterSeconds }, { 'Retry-After': String(reservation.retryAfterSeconds) });
  }

  const ok = await verifyPin(body.pin, reservation.secrets);
  if (!ok) {
    await adminDb().collection('auditLog').add({ type: 'parent_gate_failed', familyId: token.familyId, childId: token.childId || null, at: FieldValue.serverTimestamp() });
    const lockedNow = reservation.next.lockedUntilMs > now;
    return deny(lockedNow ? 429 : 401, {
      error: lockedNow ? 'Too many attempts. Please try again later or use your password.' : 'That code is not correct. Try again.',
      code: lockedNow ? 'locked' : 'invalid_pin',
    });
  }
  await ref.update({ failedAttempts: 0, lockedUntilMs: 0 });
  const parentToken = await adminAuth().createCustomToken(token.familyId, { parentGateAt: Math.floor(now / 1000) });
  await adminDb().collection('auditLog').add({ type: 'parent_gate_passed', familyId: token.familyId, childId: token.childId || null, at: FieldValue.serverTimestamp() });
  return NextResponse.json({ token: parentToken }, { headers: NO_STORE });
}
