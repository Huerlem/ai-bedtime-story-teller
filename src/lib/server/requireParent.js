import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from './firebaseAdmin';
import { consumeQuota } from './quota';
import { checkFreshPassword } from '../parentGatePolicy.mjs';

const MAX_AUTH_HEADER = 11000;

/**
 * Verify the caller is a signed-in parent account-holder.
 * The Firebase ID token is verified with the Admin SDK (revocation checked) and
 * the role/family are read from the server-side profile, never from the client.
 *
 * @returns {Promise<{ok:true, uid:string, profile:object, token:object}|{ok:false, response:NextResponse}>}
 */
export async function verifyParent(request) {
  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Bearer ') || header.length > MAX_AUTH_HEADER) {
    return { ok: false, response: NextResponse.json({ error: 'Sign in required' }, { status: 401 }) };
  }
  try {
    const token = await adminAuth().verifyIdToken(header.slice(7), true);
    // Child Mode sessions (custom tokens carrying dtRole) are never parents. A parent session
    // restored by the Parent Gate (custom token, no dtRole) is accepted here, but privileged
    // actions additionally require verifyFreshParent (password re-authentication).
    if (token.dtRole) {
      return { ok: false, response: NextResponse.json({ error: 'Parent access required' }, { status: 403 }) };
    }
    const profile = (await adminDb().collection('users').doc(token.uid).get()).data();
    if (!profile || profile.role !== 'parent' || profile.familyId !== token.uid) {
      return { ok: false, response: NextResponse.json({ error: 'Parent access required' }, { status: 403 }) };
    }
    return { ok: true, uid: token.uid, profile, token };
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'Authentication could not be verified' }, { status: 401 }) };
  }
}

/**
 * Gate for AI / TTS routes. Returns a NextResponse to send when access is denied,
 * or null when the request may proceed.
 *
 * @param {Request} request
 * @param {{quota?: string}} [options] quota bucket to charge (see lib/quotaPolicy.mjs)
 */
export async function requireParent(request, options = {}) {
  const result = await verifyParent(request);
  if (!result.ok) return result.response;
  if (options.quota) {
    const quota = await consumeQuota(result.uid, options.quota);
    if (!quota.allowed) {
      return NextResponse.json(
        { error: quota.error, code: 'quota_exceeded', resetsAt: quota.resetsAt },
        { status: 429, headers: { 'Retry-After': String(quota.retryAfterSeconds), 'Cache-Control': 'no-store' } }
      );
    }
  }
  return null;
}

/**
 * Parent gate for privileged actions: requires a password sign-in within the last
 * 5 minutes (re-authentication), never a Child Mode or PIN-restored session.
 */
export async function verifyFreshParent(request) {
  const result = await verifyParent(request);
  if (!result.ok) return result;
  const fresh = checkFreshPassword(result.token, Math.floor(Date.now() / 1000));
  if (!fresh.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Please confirm your password to continue', code: 'reauth_required' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      ),
    };
  }
  return result;
}
