// Dream Tales V2 — private media access policy (pure).
import { isChildVisible } from './storyStatus.mjs';

export const SIGNED_URL_TTL_SECONDS = 10 * 60;

/**
 * Resolve the private Storage object path for a story's narration. New stories store
 * `audioPath`; legacy stories stored a tokenised download URL or a public
 * storage.googleapis.com URL, from which the object path is recovered so access can be
 * re-checked and served through a short-lived signed URL instead.
 */
export function narrationPath(story) {
  if (!story) return null;
  const owner = story.userId;
  const ok = (p) => typeof p === 'string' && typeof owner === 'string' && p.startsWith(`audio/${owner}/`) && !p.includes('..') ? p : null;
  if (story.audioPath) return ok(story.audioPath);
  const url = story.audioUrl;
  if (typeof url !== 'string') return null;
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\/o\/([^/]+)$/);
    if (m) return ok(decodeURIComponent(m[1]));
    if (u.hostname === 'storage.googleapis.com') return ok(decodeURIComponent(u.pathname.split('/').slice(2).join('/')));
  } catch { /* not a URL */ }
  return null;
}

/** Who may play this story's narration? */
export function canAccessStoryMedia(story, principal) {
  if (!story || !principal) return false;
  if (principal.kind === 'parent') return story.familyId === principal.uid && story.userId === principal.uid;
  if (principal.kind === 'child') return story.familyId === principal.familyId && isChildVisible(story);
  return false;
}
