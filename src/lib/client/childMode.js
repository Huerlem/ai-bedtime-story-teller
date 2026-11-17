import { signInWithCustomToken, signOut } from 'firebase/auth';
import { auth } from '@/firebase/firebaseConfig';
import { secureFetch } from '@/lib/client/secureFetch';
import { confirmParentPassword, ReauthRequiredError } from '@/lib/client/storyApproval';

async function json(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(body.error || 'Request failed');
    err.code = body.code;
    err.status = response.status;
    err.retryAfterSeconds = body.retryAfterSeconds;
    throw err;
  }
  return body;
}

/** Parent → Child Mode. Replaces the parent session on this device with a restricted one. */
export async function enterChildMode(childId) {
  const { token } = await json(await secureFetch('/api/child-mode/enter', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ childId }),
  }));
  await signInWithCustomToken(auth, token);
}

/** Child Mode → parent, verified server-side by the Parental Verification code. */
export async function exitChildModeWithPin(pin) {
  const { token } = await json(await secureFetch('/api/child-mode/exit', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }),
  }));
  await signInWithCustomToken(auth, token);
}

/** "Forgot code?" — end the child session; the parent signs in again with their password. */
export async function leaveChildModeWithPassword() {
  await signOut(auth);
}

export async function getParentPinStatus() {
  return json(await secureFetch('/api/parent-gate/pin'));
}

/** Set or change the code. Prompts for the password through `password` when the server asks. */
export async function setParentPin(pin, password) {
  const send = async () => json(await secureFetch('/api/parent-gate/pin', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }),
  }));
  try {
    return await send();
  } catch (err) {
    if (err.code !== 'reauth_required') throw err;
    if (!password) throw new ReauthRequiredError();
    await confirmParentPassword(password);
    return send();
  }
}
