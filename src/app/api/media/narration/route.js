import { NextResponse } from 'next/server';
import { adminAuth, adminBucket, adminDb } from '@/lib/server/firebaseAdmin';
import { canAccessStoryMedia, narrationPath, SIGNED_URL_TTL_SECONDS } from '@/lib/mediaAccess.mjs';
import { CHILD_MODE_ROLE, isValidId } from '@/lib/parentGatePolicy.mjs';

export const runtime = 'nodejs';
const NO_STORE = { 'Cache-Control': 'no-store' };
const notFound = () => NextResponse.json({ error: 'Not found' }, { status: 404, headers: NO_STORE });

/**
 * GET /api/media/narration?storyId=… — short-lived (10 min) signed URL for a story's narration.
 * Parents: their own family's stories. Child Mode: only parent-approved stories of its family.
 * Replaces long-lived Firebase download URLs, which bypass Storage rules.
 */
export async function GET(request) {
  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Bearer ') || header.length > 11000) return NextResponse.json({ error: 'Sign in required' }, { status: 401, headers: NO_STORE });
  let token;
  try { token = await adminAuth().verifyIdToken(header.slice(7), true); } catch { return NextResponse.json({ error: 'Session expired' }, { status: 401, headers: NO_STORE }); }

  let principal;
  if (token.dtRole === CHILD_MODE_ROLE) {
    principal = { kind: 'child', familyId: token.familyId };
  } else {
    const profile = (await adminDb().collection('users').doc(token.uid).get()).data();
    if (!profile || profile.role !== 'parent' || profile.familyId !== token.uid) return notFound();
    principal = { kind: 'parent', uid: token.uid };
  }

  const storyId = new URL(request.url).searchParams.get('storyId');
  if (!isValidId(storyId)) return notFound();
  const snap = await adminDb().collection('stories').doc(storyId).get();
  const story = snap.exists ? snap.data() : null;
  if (!canAccessStoryMedia(story, principal)) return notFound();
  const path = narrationPath(story);
  if (!path) return notFound();

  if (process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
    // Emulator Suite has no URL signing; the authorisation decision above is what is tested.
    const host = process.env.FIREBASE_STORAGE_EMULATOR_HOST;
    const url = `http://${host}/v0/b/${adminBucket().name}/o/${encodeURIComponent(path)}?alt=media`;
    return NextResponse.json({ url, expiresIn: SIGNED_URL_TTL_SECONDS, emulator: true }, { headers: NO_STORE });
  }
  const [url] = await adminBucket().file(path).getSignedUrl({
    version: 'v4', action: 'read', expires: Date.now() + SIGNED_URL_TTL_SECONDS * 1000,
  });
  return NextResponse.json({ url, expiresIn: SIGNED_URL_TTL_SECONDS }, { headers: NO_STORE });
}
