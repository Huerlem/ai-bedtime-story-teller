import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyParent } from '@/lib/server/requireParent';
import { adminAuth, adminDb } from '@/lib/server/firebaseAdmin';
import { childModeClaims, childModeUid, isValidId } from '@/lib/parentGatePolicy.mjs';

export const runtime = 'nodejs';
const NO_STORE = { 'Cache-Control': 'no-store' };

/**
 * POST { childId } — the parent hands the device to a child.
 * Returns a Firebase custom token for a restricted Child Mode identity whose claims
 * (dtRole=child_mode, familyId, childId) let Firestore rules expose only that family's
 * parent-approved stories. The device's parent session is replaced, so parent APIs,
 * approvals and settings are unreachable until the Parent Gate is passed.
 */
export async function POST(request) {
  const auth = await verifyParent(request);
  if (!auth.ok) return auth.response;
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: NO_STORE }); }
  const childId = body?.childId;
  if (!isValidId(childId)) return NextResponse.json({ error: 'Child not found' }, { status: 404, headers: NO_STORE });
  const child = await adminDb().collection('users').doc(childId).get();
  if (!child.exists || child.data().role !== 'child' || child.data().familyId !== auth.uid) {
    return NextResponse.json({ error: 'Child not found' }, { status: 404, headers: NO_STORE });
  }
  const secrets = await adminDb().collection('parentSecrets').doc(auth.uid).get();
  if (!secrets.exists || !secrets.data().pinHash) {
    return NextResponse.json({ error: 'Set a Parental Verification code before entering Child Mode', code: 'pin_required' }, { status: 409, headers: NO_STORE });
  }
  const token = await adminAuth().createCustomToken(childModeUid(childId), childModeClaims({ familyId: auth.uid, childId }));
  await adminDb().collection('auditLog').add({ type: 'child_mode_entered', familyId: auth.uid, childId, actor: auth.uid, at: FieldValue.serverTimestamp() });
  return NextResponse.json({ token }, { headers: NO_STORE });
}
