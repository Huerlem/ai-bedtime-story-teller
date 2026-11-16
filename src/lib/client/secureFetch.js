import { auth } from '@/firebase/firebaseConfig';
// Drop-in replacement for fetch on protected first-party API calls.
export async function secureFetch(url, options = {}) {
  if (!auth.currentUser) throw new Error('Sign in required');
  const token = await auth.currentUser.getIdToken();
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  return fetch(url, {...options, headers, cache:'no-store'});
}
