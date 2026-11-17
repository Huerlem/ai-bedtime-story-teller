import { getApps, initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
// Server-only module; use verified Firebase ID tokens, never client-controlled role cookies.
function app() {
  if (getApps().length) return getApps()[0];
  const emulatorHosts = Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIRESTORE_EMULATOR_HOST);
  if (emulatorHosts && process.env.DREAMTALES_ALLOW_EMULATORS !== 'true') {
    // Fail closed: emulator host variables on a real deployment are a misconfiguration.
    throw new Error('Firebase emulator variables are set without DREAMTALES_ALLOW_EMULATORS=true');
  }
  const emulated = emulatorHosts;
  if (emulated) {
    // Emulator Suite (CI end-to-end tests): no credentials are used or required.
    return initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  }
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
