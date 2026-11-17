import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyParent, verifyFreshParent } from '@/lib/server/requireParent';
import { adminDb } from '@/lib/server/firebaseAdmin';
import { approvalPatch, checkApproval, withdrawalPatch } from '@/lib/storyStatus.mjs';

export const runtime = 'nodejs';
const NO_STORE = { 'Cache-Control': 'no-store' };
const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

async function loadStory(request, params, { fresh = false } = {}) {
  const auth = fresh ? await verifyFreshParent(request) : await verifyParent(request);
  if (!auth.ok) return { response: auth.response };
  const { id } = await params;
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
    return { response: NextResponse.json({ error: 'Story not found' }, { status: 404, headers: NO_STORE }) };
  }
  const ref = adminDb().collection('stories').doc(id);
  return { auth, id, ref };
}

/**
 * POST /api/stories/:id/approve — parent approves and publishes a story to Child Mode.
 * Requires a Firebase ID token whose auth_time is within the last 5 minutes, i.e.
 * the parent re-entered their password (Parent Verification gate, Figma 105:*).
 * This is the ONLY path that can set status=approved / isPublished=true.
 */
export async function POST(request, { params }) {
  // Approval requires a password re-authentication (a PIN-restored session is not enough).
  const ctx = await loadStory(request, params, { fresh: true });
  if (ctx.response) return ctx.response;
  const { auth, id, ref } = ctx;
  try {
    const result = await adminDb().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const story = snap.exists ? snap.data() : null;
      const check = checkApproval({
        story,
        uid: auth.uid,
        authTimeSeconds: auth.token.auth_time,
        nowSeconds: Math.floor(Date.now() / 1000),
      });
      if (!check.ok) return check;
      tx.update(ref, approvalPatch(auth.uid, FieldValue.serverTimestamp()));
      tx.create(adminDb().collection('auditLog').doc(), {
        type: 'story_approved', storyId: id, familyId: auth.uid, actor: auth.uid, at: FieldValue.serverTimestamp(),
      });
      return { ok: true };
    });
    if (!result.ok) return NextResponse.json({ error: result.error, code: result.code }, { status: result.status, headers: NO_STORE });
    return NextResponse.json({ status: 'approved' }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: 'Approval could not be saved' }, { status: 500, headers: NO_STORE });
  }
}

/** DELETE /api/stories/:id/approve — withdraw a story from Child Mode (no re-auth needed). */
export async function DELETE(request, { params }) {
  const ctx = await loadStory(request, params);
  if (ctx.response) return ctx.response;
  const { auth, id, ref } = ctx;
  try {
    const snap = await ref.get();
    const story = snap.exists ? snap.data() : null;
    if (!story || story.familyId !== auth.uid || story.userId !== auth.uid) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404, headers: NO_STORE });
    }
    await ref.update(withdrawalPatch(FieldValue.serverTimestamp()));
    await adminDb().collection('auditLog').add({
      type: 'story_withdrawn', storyId: id, familyId: auth.uid, actor: auth.uid, at: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ status: 'review_required' }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: 'The story could not be withdrawn' }, { status: 500, headers: NO_STORE });
  }
}
