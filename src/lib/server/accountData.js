import { adminAuth, adminBucket, adminDb } from './firebaseAdmin';
import { childModeUid } from '../parentGatePolicy.mjs';

const SERVER_ONLY_PROFILE_KEYS = ['entitlements', 'usage', 'subscription'];

/** Everything Dream Tales stores about a family, for export (UK GDPR Art. 15/20). */
export async function collectFamilyData(uid) {
  const db = adminDb();
  const [profileSnap, childrenSnap, storiesSnap] = await Promise.all([
    db.collection('users').doc(uid).get(),
    db.collection('users').where('familyId', '==', uid).where('role', '==', 'child').get(),
    db.collection('stories').where('familyId', '==', uid).get(),
  ]);
  const clean = (data) => JSON.parse(JSON.stringify(data, (k, v) => (v && typeof v.toDate === 'function' ? v.toDate().toISOString() : v)));
  const profile = profileSnap.exists ? clean(profileSnap.data()) : null;
  if (profile) for (const k of SERVER_ONLY_PROFILE_KEYS) delete profile[k];
  return {
    exportedAt: new Date().toISOString(),
    format: 'dream-tales-export/1',
    account: profile,
    children: childrenSnap.docs.map((d) => ({ id: d.id, ...clean(d.data()) })),
    stories: storiesSnap.docs.map((d) => {
      const { audioUrl, ...rest } = clean(d.data()); // never export bearer-token URLs
      return { id: d.id, ...rest };
    }),
    note: 'Narration audio and images are listed by storage path; request copies from support or download them in the app.',
  };
}

async function deleteQuery(query) {
  const db = adminDb();
  let deleted = 0;
  for (;;) {
    const snap = await query.limit(400).get();
    if (snap.empty) return deleted;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    deleted += snap.size;
  }
}

/**
 * Permanently erase a parent account and all family data: stories, child profiles,
 * Child Mode identities, PIN secrets, usage counters, audit entries and Storage files.
 * The Firebase Auth user is deleted last so a partial failure can be retried.
 */
export async function deleteFamily(uid) {
  const db = adminDb();
  const bucket = adminBucket();
  const children = await db.collection('users').where('familyId', '==', uid).where('role', '==', 'child').get();
  const childIds = children.docs.map((d) => d.id).filter((id) => id !== uid);

  const prefixes = [`audio/${uid}/`, `profile-images/${uid}/`, `families/${uid}/`, ...childIds.map((c) => `child-profiles/${c}/`)];
  for (const prefix of prefixes) await bucket.deleteFiles({ prefix, force: true });

  const counts = {
    stories: await deleteQuery(db.collection('stories').where('familyId', '==', uid)),
    legacyStories: await deleteQuery(db.collection('stories').where('userId', '==', uid)),
    legacyAudios: await deleteQuery(db.collection('audios').where('userId', '==', uid)),
    usage: await deleteQuery(db.collection('usage').where('uid', '==', uid)),
    auditLog: await deleteQuery(db.collection('auditLog').where('familyId', '==', uid)),
    children: 0,
  };
  for (const id of childIds) {
    await db.collection('users').doc(id).delete();
    counts.children += 1;
    await adminAuth().deleteUser(childModeUid(id)).catch(() => {}); // may never have been created
  }
  await db.collection('parentSecrets').doc(uid).delete();
  await db.collection('users').doc(uid).delete();
  await adminAuth().deleteUser(uid);
  return counts;
}
