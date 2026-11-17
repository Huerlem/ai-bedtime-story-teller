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
  const snap = await ref.get();
  if (!snap.exists || !snap.data().pinHash) return deny(409, { error: 'No code is set. Use your password instead.', code: 'pin_required' });
  const secrets = snap.data();
  const lock = lockState(secrets, now);
  if (lock.locked) return deny(429, { error: 'Too many attempts. Please try again later or use your password.', code: 'locked', retryAfterSeconds: lock.retryAfterSeconds }, { 'Retry-After': String(lock.retryAfterSeconds) });

  const ok = await verifyPin(body.pin, secrets);
  if (!ok) {
    const next = afterFailure(secrets, now);
    await ref.update({ ...next, lastFailureAt: FieldValue.serverTimestamp() });
    await adminDb().collection('auditLog').add({ type: 'parent_gate_failed', familyId: token.familyId, childId: token.childId || null, at: FieldValue.serverTimestamp() });
    return deny(401, { error: 'That code is not correct. Try again.', code: 'invalid_pin', locked: next.lockedUntilMs > now });
  }
  await ref.update({ failedAttempts: 0, lockedUntilMs: 0 });
  const parentToken = await adminAuth().createCustomToken(token.familyId, { parentGateAt: Math.floor(now / 1000) });
  await adminDb().collection('auditLog').add({ type: 'parent_gate_passed', familyId: token.familyId, childId: token.childId || null, at: FieldValue.serverTimestamp() });
  return NextResponse.json({ token: parentToken }, { headers: NO_STORE });
}
