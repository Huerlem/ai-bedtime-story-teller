// Dream Tales V2 — story approval state machine (shared by client and server).
// Engineering handoff (Figma 139:19): draft → generating → review_required →
// approved → published. In this implementation "approved" and "published" are
// granted together by the server-side approval endpoint; clients may only move a
// story into draft or review_required. Firestore rules enforce the same split.

export const STORY_STATUS = Object.freeze({
  DRAFT: 'draft',
  GENERATING: 'generating',
  REVIEW_REQUIRED: 'review_required',
  APPROVED: 'approved',
});

export const CLIENT_SETTABLE_STATUSES = Object.freeze([STORY_STATUS.DRAFT, STORY_STATUS.REVIEW_REQUIRED]);

/** Maximum age (seconds) of the parent's last sign-in for approval actions. */
export const APPROVAL_MAX_AUTH_AGE_SECONDS = 5 * 60;

/** Legacy documents created before V2 have no status; they need a fresh review. */
export function normaliseStatus(story) {
  const status = story?.status;
  if (Object.values(STORY_STATUS).includes(status)) return status;
  return STORY_STATUS.REVIEW_REQUIRED;
}

/** A story may be shown in Child Mode only after server-side parental approval. */
export function isChildVisible(story) {
  return Boolean(story)
    && normaliseStatus(story) === STORY_STATUS.APPROVED
    && story.isPublished === true
    && typeof story.approvedBy === 'string'
    && story.approvedBy.length > 0;
}

/**
 * Validate a server-side approval request.
 * @returns {{ok:true}|{ok:false,status:number,code:string,error:string}}
 */
export function checkApproval({ story, uid, authTimeSeconds, nowSeconds }) {
  if (!story) return { ok: false, status: 404, code: 'not_found', error: 'Story not found' };
  if (story.familyId !== uid || story.userId !== uid) {
    // Same response as not-found so story IDs of other families are not confirmed.
    return { ok: false, status: 404, code: 'not_found', error: 'Story not found' };
  }
  if (typeof authTimeSeconds !== 'number' || nowSeconds - authTimeSeconds > APPROVAL_MAX_AUTH_AGE_SECONDS) {
    return { ok: false, status: 401, code: 'reauth_required', error: 'Please confirm your password to approve stories' };
  }
  const status = normaliseStatus(story);
  if (status === STORY_STATUS.GENERATING) {
    return { ok: false, status: 409, code: 'not_ready', error: 'The story is still being generated' };
  }
  if (typeof story.title !== 'string' || !story.title.trim() || typeof story.content !== 'string' || !story.content.trim()) {
    return { ok: false, status: 422, code: 'incomplete', error: 'A story needs a title and text before approval' };
  }
  return { ok: true };
}

/** Fields written by the server when a parent approves a story. */
export function approvalPatch(uid, timestamp) {
  return {
    status: STORY_STATUS.APPROVED,
    isPublished: true,
    approvedBy: uid,
    approvedAt: timestamp,
    publishedAt: timestamp,
    updatedAt: timestamp,
  };
}

/** Fields written when a parent withdraws a story from Child Mode. */
export function withdrawalPatch(timestamp) {
  return {
    status: STORY_STATUS.REVIEW_REQUIRED,
    isPublished: false,
    updatedAt: timestamp,
  };
}
