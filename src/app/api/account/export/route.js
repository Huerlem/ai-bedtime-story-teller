import { NextResponse } from 'next/server';
import { verifyFreshParent } from '@/lib/server/requireParent';
import { collectFamilyData } from '@/lib/server/accountData';

export const runtime = 'nodejs';

/** GET /api/account/export — JSON download of the family's data. Requires password re-authentication. */
export async function GET(request) {
  const auth = await verifyFreshParent(request);
  if (!auth.ok) return auth.response;
  const data = await collectFamilyData(auth.uid);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="dream-tales-export-${new Date().toISOString().slice(0, 10)}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
