// Cloud Storage security-rules integration tests (Firebase Emulator).
import test, { before, after } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';

let env;
const mp3 = new Uint8Array([0x49, 0x44, 0x33, 0x03]);
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'dream-tales-rules-test',
    firestore: { rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8') },
    storage: { rules: readFileSync(new URL('../../storage.rules', import.meta.url), 'utf8') },
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    await ctx.firestore().doc('users/childA').set({ role: 'child', familyId: 'parentA', name: 'Emma' });
  });
});
after(async () => env?.cleanup());

const store = (uid) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).storage();

test('narration audio is private to its owner', async () => {
  await assertSucceeds(store('parentA').ref('audio/parentA/s1.mp3').put(mp3, { contentType: 'audio/mpeg' }));
  await assertFails(store('parentB').ref('audio/parentA/s1.mp3').getDownloadURL());
  await assertFails(store(null).ref('audio/parentA/s1.mp3').getDownloadURL());
  await assertFails(store('parentB').ref('audio/parentA/s2.mp3').put(mp3, { contentType: 'audio/mpeg' }));
});

test('uploads are type-restricted', async () => {
  await assertFails(store('parentA').ref('audio/parentA/evil.html').put(mp3, { contentType: 'text/html' }));
  await assertFails(store('parentA').ref('profile-images/parentA/p.svg').put(png, { contentType: 'image/svg+xml' }));
});

test('child avatars only writable by the child\'s own family', async () => {
  await assertSucceeds(store('parentA').ref('child-profiles/childA/a.png').put(png, { contentType: 'image/png' }));
  await assertFails(store('parentB').ref('child-profiles/childA/b.png').put(png, { contentType: 'image/png' }));
  await assertFails(store('parentB').ref('child-profiles/childA/a.png').getDownloadURL());
});

test('server-generated family media is read-only to clients', async () => {
  await assertFails(store('parentA').ref('families/parentA/scenes/1.png').put(png, { contentType: 'image/png' }));
});

test('unknown paths are denied', async () => {
  await assertFails(store('parentA').ref('public/anything.png').put(png, { contentType: 'image/png' }));
});
