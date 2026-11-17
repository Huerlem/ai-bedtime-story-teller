import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '@/firebase/firebaseConfig';
import { secureFetch } from '@/lib/client/secureFetch';

export class ReauthRequiredError extends Error {
  constructor(message = 'Please confirm your password to approve stories') {
    super(message);
    this.name = 'ReauthRequiredError';
  }
}

/**
 * Re-authenticate the signed-in parent. The resulting ID token carries a fresh
 * auth_time, which the approval API requires (≤ 5 minutes old). The password is
 * sent only to Firebase Authentication, never to Dream Tales servers.
 */
export async function confirmParentPassword(password) {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error('Sign in required');
  const credential = EmailAuthProvider.credential(user.email, password);
  await reauthenticateWithCredential(user, credential);
  await user.getIdToken(true);
}

async function call(storyId, method) {
  const response = await secureFetch(`/api/stories/${encodeURIComponent(storyId)}/approve`, { method });
  const body = await response.json().catch(() => ({}));
  if (response.status === 401 && body.code === 'reauth_required') throw new ReauthRequiredError(body.error);
  if (!response.ok) throw new Error(body.error || 'Request failed');
  return body;
}

/** Approve and publish a story to Child Mode (server-enforced). */
export const approveStory = (storyId) => call(storyId, 'POST');

/** Withdraw a story from Child Mode. */
export const withdrawStory = (storyId) => call(storyId, 'DELETE');
