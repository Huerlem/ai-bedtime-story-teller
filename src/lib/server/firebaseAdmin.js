import { getApps, initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
// Server-only module; use verified Firebase ID tokens, never client-controlled role cookies.
function app() {
  if (getApps().length) return getApps()[0];
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const credential = raw ? cert(JSON.parse(raw)) : applicationDefault();
  return initializeApp({
    credential,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}
export function adminAuth() { return getAuth(app()); }
export function adminDb() { return getFirestore(app()); }
export function adminBucket() { return getStorage(app()).bucket(); }
