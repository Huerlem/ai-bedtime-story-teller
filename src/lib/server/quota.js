import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './firebaseAdmin';
import { decideQuota, quotaWindow, resolveLimits } from '../quotaPolicy.mjs';

/**
 * Atomically charge one unit of `kind` to the parent's daily usage document
 * usage/{uid}_{YYYY-MM-DD}. The document is closed to clients by Firestore rules.
 * Fails closed: if the counter cannot be read or written, the request is refused.
 */
export async function consumeQuota(uid, kind, now = new Date()) {
  const { limits, total } = resolveLimits(process.env);
  const window = quotaWindow(now);
  const ref = adminDb().collection('usage').doc(`${uid}_${window.day}`);
  try {
    return await adminDb().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const counts = snap.exists ? snap.data().counts || {} : {};
      const decision = decideQuota({ counts, kind, limits, total });
      if (!decision.allowed) return { ...decision, ...window };
      tx.set(ref, {
        uid,
        day: window.day,
        counts: { [kind]: FieldValue.increment(1) },
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      return { ...decision, ...window };
    });
  } catch {
    return { allowed: false, error: 'Usage could not be verified. Please try again.', ...window };
  }
}
