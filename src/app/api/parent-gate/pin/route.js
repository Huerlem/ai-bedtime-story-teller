import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyFreshParent, verifyParent } from '@/lib/server/requireParent';
import { adminDb } from '@/lib/server/firebaseAdmin';
import { hashPin } from '@/lib/server/pinHash';
import { validateNewPin } from '@/lib/parentGatePolicy.mjs';

export const runtime = 'nodejs';
const NO_STORE = { 'Cache-Control': 'no-store' };

/** GET — does this parent have a Parental Verification code? (never returns the code) */
export async function GET(request) {
  const auth = await verifyParent(request);
  if (!auth.ok) return auth.response;
  const snap = await adminDb().collection('parentSecrets').doc(auth.uid).get();
  return NextResponse.json({ hasPin: Boolean(snap.exists && snap.data().pinHash) }, { headers: NO_STORE });
}

/** POST { pin } — set or change the code. Requires password re-authentication within 5 minutes. */
export async function POST(request) {
  const auth = await verifyFreshParent(request);
  if (!auth.ok) return auth.response;
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: NO_STORE }); }
  const valid = validateNewPin(body?.pin);
  if (!valid.ok) return NextResponse.json({ error: valid.error }, { status: 400, headers: NO_STORE });
  const hashed = await hashPin(body.pin);
  await adminDb().collection('parentSecrets').doc(auth.uid).set({
    ...hashed, failedAttempts: 0, lockedUntilMs: 0, updatedAt: FieldValue.serverTimestamp(),
  });
  await adminDb().collection('auditLog').add({ type: 'parent_pin_set', familyId: auth.uid, actor: auth.uid, at: FieldValue.serverTimestamp() });
  return NextResponse.json({ hasPin: true }, { headers: NO_STORE });
}
