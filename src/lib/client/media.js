import { secureFetch } from '@/lib/client/secureFetch';

/**
 * Replace a story's stored narration reference with a short-lived signed URL obtained
 * after a server-side authorisation check. Returns the story with audioUrl=null when
 * there is no narration or access is not permitted.
 */
export async function withPlayableNarration(story) {
  if (!story) return story;
  if (!story.audioPath && !story.audioUrl) return { ...story, audioUrl: null };
  try {
    const response = await secureFetch(`/api/media/narration?storyId=${encodeURIComponent(story.id)}`);
    if (!response.ok) return { ...story, audioUrl: null };
    const { url } = await response.json();
    return { ...story, audioUrl: typeof url === 'string' ? url : null };
  } catch {
    return { ...story, audioUrl: null };
  }
}
