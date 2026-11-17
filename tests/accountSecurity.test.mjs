import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');

test('middleware makes no decision from the unsigned role cookie', () => {
  const mw = read('src/middleware.js');
  assert.doesNotMatch(mw, /JSON\.parse/);
  assert.doesNotMatch(mw, /\.role\b/);
  assert.doesNotMatch(mw, /redirect\(/);
});

test('login no longer writes a role cookie', () => {
  const ctx = read('src/contexts/AuthContext.jsx');
  assert.doesNotMatch(ctx, /document\.cookie\s*=\s*`user=\$\{/);
});

test('registration always creates a parent of their own family', () => {
  const auth = read('src/firebase/auth.js');
  assert.match(auth, /export const registerUser = async \(email, password, displayName\)/);
  assert.match(auth, /const role = 'parent';/);
  assert.match(auth, /const familyId = user\.uid;/);
  const page = read('src/app/(auth)/register/page.jsx');
  assert.doesNotMatch(page, /USER_ROLES\.CHILD/);
  assert.doesNotMatch(page, /name="familyId"/);
});

test('cookie-trusting and unauthenticated legacy duplicates are removed', () => {
  for (const p of ['src/utils/middleware.js', 'src/utils/auth.js', 'src/components/auth/RegisterForm.js']) {
    assert.equal(existsSync(new URL(p, root)), false, p);
  }
});

test('Firestore rules exist, deny by default and forbid child self-registration', () => {
  const rules = read('firestore.rules');
  assert.match(rules, /match \/\{document=\*\*\} \{\s*allow read, write: if false;/);
  assert.match(rules, /request\.resource\.data\.role == 'parent'\s*\n\s*&& request\.resource\.data\.familyId == uid\(\)/);
  assert.doesNotMatch(rules, /allow (read|write|read, write)\s*:\s*if true/);
  assert.doesNotMatch(rules, /request\.time < timestamp\.date/);
});

test('Storage rules exist with no public paths', () => {
  const rules = read('storage.rules');
  assert.match(rules, /match \/\{allPaths=\*\*\} \{\s*allow read, write: if false;/);
  assert.doesNotMatch(rules, /allow read(, write)?\s*:\s*if true/);
  assert.doesNotMatch(rules, /allow read:\s*if request\.auth != null;/);
});

test('framework versions are on maintained, patched release lines', () => {
  const pkg = JSON.parse(read('package.json'));
  const minor = (range) => range.replace(/^[~^]/, '').split('.').map(Number);
  const [nMaj, nMin, nPatch] = minor(pkg.dependencies.next);
  // 15.1.x is unmaintained; all published 15.x advisories are fixed from 15.5.18.
  assert.ok(nMaj > 15 || (nMaj === 15 && (nMin > 5 || (nMin === 5 && nPatch >= 18))), `next ${pkg.dependencies.next}`);
  const [rMaj, rMin, rPatch] = minor(pkg.dependencies.react);
  assert.ok(rMaj === 19 && (rMin > 2 || (rMin === 2 && rPatch >= 6)), `react ${pkg.dependencies.react}`);
  assert.equal(pkg.dependencies.react, pkg.dependencies['react-dom']);
});

test('dependencies are locked and CI installs them reproducibly with a security gate', () => {
  const lock = JSON.parse(read('package-lock.json'));
  const pkg = JSON.parse(read('package.json'));
  assert.equal(lock.lockfileVersion, 3);
  for (const [name, range] of Object.entries({ ...pkg.dependencies, ...pkg.devDependencies })) {
    assert.equal(lock.packages[''].dependencies?.[name] ?? lock.packages[''].devDependencies?.[name], range, `lock out of sync for ${name}`);
  }
  const build = read('.github/workflows/dream-tales-build.yml');
  assert.doesNotMatch(build, /npm install/);
  assert.match(build, /npm audit --omit=dev --audit-level=high/);
  assert.doesNotMatch(read('.github/workflows/dream-tales-validation.yml'), /npm install/);
});

test('no hard-coded demo credentials ship in the app', () => {
  const login = read('src/app/login/page.js');
  assert.doesNotMatch(login, /password123|Quick Test Logins|quickLogin/);
});
