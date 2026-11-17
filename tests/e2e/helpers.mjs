// Shared helpers for end-to-end tests against the Firebase Emulator Suite and a production
// build of the app (started by scripts/e2e/run.mjs). Never used outside CI/local testing.
import { initializeApp, deleteApp } from 'firebase/app';
import {
  getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signInWithCustomToken,
} from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, setDoc, serverTimestamp } from 'firebase/firestore';

export const BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:3100';
export const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-dream-tales';
const CONFIG = { apiKey: 'demo-key', authDomain: `${PROJECT_ID}.firebaseapp.com`, projectId: PROJECT_ID };

let n = 0;
const apps = [];
export function newClient() {
  const app = initializeApp(CONFIG, `e2e-${Date.now()}-${n++}`);
  apps.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  return { app, auth, db };
}
export async function closeClients() { await Promise.all(apps.splice(0).map((a) => deleteApp(a).catch(() => {}))); }

export const uniqueEmail = (tag) => `${tag}.${Date.now()}.${Math.random().toString(36).slice(2, 7)}@e2e.dreamtales.test`;
export const PASSWORD = 'Sleepy-Fox-2026!';

/** Register a parent exactly as the app does (Auth + self-created profile under rules). */
export async function signUpParent(tag) {
  const client = newClient();
  const email = uniqueEmail(tag);
  const cred = await createUserWithEmailAndPassword(client.auth, email, PASSWORD);
  const uid = cred.user.uid;
  await setDoc(doc(client.db, 'users', uid), {
    email, displayName: tag, role: 'parent', familyId: uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  return { ...client, uid, email };
}

export async function addChild(parent, name = 'Emma', age = 6) {
  const id = `child_${Math.random().toString(36).slice(2, 10)}`;
  await setDoc(doc(parent.db, 'users', id), { id, name, age, role: 'child', familyId: parent.uid, parentId: parent.uid, createdAt: serverTimestamp() });
  return id;
}

export async function addStory(parent, { id, title, childId = null, audio = false }) {
  const data = {
    id, title, content: `${title} — once upon a time a little fox found a star.`, excerpt: title,
    userId: parent.uid, familyId: parent.uid, status: 'review_required', isPublished: false, isFavorite: false,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  };
  if (childId) data.childId = childId;
  if (audio) data.audioPath = `audio/${parent.uid}/${id}.mp3`;
  await setDoc(doc(parent.db, 'stories', id), data);
  return id;
}

export async function idToken(client) { return client.auth.currentUser.getIdToken(true); }

export async function api(path, { token, method = 'GET', body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, body: json };
}

/** Child Mode sign-in exactly as the app does: custom token from /api/child-mode/enter. */
export async function enterChildMode(parent, childId) {
  const res = await api('/api/child-mode/enter', { token: await idToken(parent), method: 'POST', body: { childId } });
  if (res.status !== 200) throw new Error(`enter child mode failed: ${res.status} ${JSON.stringify(res.body)}`);
  const client = newClient();
  await signInWithCustomToken(client.auth, res.body.token);
  return client;
}

export const isPermissionDenied = (err) => /permission|PERMISSION_DENIED|insufficient/i.test(String(err?.code || err?.message));
