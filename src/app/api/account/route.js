import { NextResponse } from 'next/server';
import { verifyFreshParent } from '@/lib/server/requireParent';
import { deleteFamily } from '@/lib/server/accountData';

export const runtime = 'nodejs';
const NO_STORE = { 'Cache-Control': 'no-store' };

/**
 * DELETE /api/account  body: { confirm: "DELETE" }
 * In-app account deletion (App Store 5.1.1(v), UK GDPR Art. 17). Requires a password
 * re-authentication within the last 5 minutes. Irreversible.
 */
export async function DELETE(request) {
  const auth = await verifyFreshParent(request);
  if (!auth.ok) return auth.response;
  let body = {};
  try { body = await request.json(); } catch { /* handled below */ }
  if (body?.confirm !== 'DELETE') return NextResponse.json({ error: 'Type DELETE to confirm' }, { status: 400, headers: NO_STORE });
  try {
    const counts = await deleteFamily(auth.uid);
    return NextResponse.json({ deleted: true, counts }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: 'Deletion did not complete. Please try again; nothing further will be shown to your children.' }, { status: 500, headers: NO_STORE });
  }
}
