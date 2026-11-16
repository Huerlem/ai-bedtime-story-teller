import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from './firebaseAdmin';
export async function requireParent(request) {
  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Bearer ') || header.length > 11000) {
    return NextResponse.json({error:'Sign in required'}, {status:401});
  }
  try {
    const verified = await adminAuth().verifyIdToken(header.slice(7), true);
    const profile = (await adminDb().collection('users').doc(verified.uid).get()).data();
    if (!profile || profile.role !== 'parent' || (profile.familyId && profile.familyId !== verified.uid)) {
      return NextResponse.json({error:'Parent access required'}, {status:403});
    }
    return null;
  } catch {
    return NextResponse.json({error:'Authentication could not be verified'}, {status:401});
  }
}
