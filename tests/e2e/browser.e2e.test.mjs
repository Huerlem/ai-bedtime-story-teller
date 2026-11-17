// Browser end-to-end: real UI in a production build against the emulators (Playwright).
// Covers direct-navigation bypass attempts from Child Mode and the Parent Gate exit.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { addChild, addStory, api, BASE, closeClients, idToken, PASSWORD, signUpParent } from './helpers.mjs';

let browser; let page; let P; let kid; const PIN = '5072';
const APPROVED = 'Moonlit Valley Adventure';
const DRAFT = 'Unreviewed Draft Story';

before(async () => {
  P = await signUpParent('browserParent');
  kid = await addChild(P, 'Emma', 6);
  await addChild(P, 'Lucas', 4);
  const approved = await addStory(P, { id: `b1_${P.uid.slice(0, 6)}`, title: APPROVED, childId: kid });
  await addStory(P, { id: `b2_${P.uid.slice(0, 6)}`, title: DRAFT, childId: kid });
  assert.equal((await api('/api/parent-gate/pin', { token: await idToken(P), method: 'POST', body: { pin: PIN } })).status, 200);
  assert.equal((await api(`/api/stories/${approved}/approve`, { token: await idToken(P), method: 'POST' })).status, 200);
  browser = await chromium.launch();
  page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) consoleLog.push(`[${m.type()}] ${m.text()}`.slice(0, 400)); });
  page.on('pageerror', (e) => consoleLog.push(`[pageerror] ${e.message}`.slice(0, 400)));
});
const consoleLog = [];
async function diagnose(label) {
  const text = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 1200);
  console.log(`DIAG ${label} url=${page.url()}\nDIAG text: ${text}\nDIAG console:\n${consoleLog.slice(-15).join('\n')}`);
}
after(async () => { await browser?.close(); await closeClients(); });

const settle = (ms = 1500) => page.waitForTimeout(ms);
const SIZES = [[390, 844], [393, 852], [430, 932], [375, 667]];
async function shoot(name, target = page) {
  mkdirSync('artifacts/visual', { recursive: true });
  for (const [w, h] of SIZES) {
    await target.setViewportSize({ width: w, height: h });
    await target.evaluate(() => document.fonts.ready);
    await target.waitForTimeout(300);
    await target.screenshot({ path: `artifacts/visual/${name}-${w}x${h}.png` });
  }
  await target.setViewportSize({ width: 390, height: 844 });
}
async function signIn(target, who) {
  await target.goto(`${BASE}/login`);
  await target.fill('#email', who.email);
  await target.fill('#password', PASSWORD);
  await target.click('button[type="submit"]');
  await target.waitForURL(/\/dashboard/, { timeout: 20000 });
}

test('parent signs in through the real login page', async () => {
  await signIn(page, P);
});

// Visual QA uses the same family, names and story titles as the Final Vision (screen 3) so the
// production screenshots can be compared like for like. Morning greeting as in the design.
test('Final Vision fixture: Dashboard and Create Story captured for comparison', async () => {
  const alex = await signUpParent('Alex');
  await addChild(alex, 'Emma', 6);
  await addChild(alex, 'Lucas', 4);
  // Newest first on the dashboard: seed in reverse so the order matches the Final Vision.
  for (const [i, title] of ["Theo's Underwater Adventure", 'Luna and the Rainbow Bridge', 'The Fox and the Starlight Forest'].entries()) {
    await addStory(alex, { id: `fv${i}_${alex.uid.slice(0, 6)}`, title });
  }
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'UTC' });
  const now = new Date();
  if (now.getUTCHours() >= 12) {
    const morning = new Date(now); morning.setUTCHours(9, 41, 0, 0);
    await ctx.clock.setFixedTime(morning);
  }
  const fv = await ctx.newPage();
  try {
    await signIn(fv, alex);
    await fv.getByRole('heading', { level: 1, name: 'Good morning, Alex!' }).waitFor({ timeout: 20000 });
    await fv.getByText("Theo's Underwater Adventure").waitFor();
    await shoot('dashboard', fv);
    await fv.goto(`${BASE}/create-story`);
    await fv.getByRole('heading', { name: 'Create a new story' }).waitFor({ timeout: 20000 });
    await fv.fill('#story-prompt', 'A friendly dragon who learns to be brave.');
    await fv.locator('#story-prompt').blur();
    await shoot('create-story', fv);
  } finally {
    await ctx.close();
  }
});

test('Parent Dashboard renders family data with neutral pending covers (no shared artwork)', async () => {
  try {
    await page.getByRole('heading', { level: 1, name: /Good (morning|afternoon|evening)/ }).waitFor({ timeout: 20000 });
  } catch (err) { await diagnose('dashboard'); throw err; }
  await page.getByText('Lucas').first().waitFor();
  await page.getByText(APPROVED).first().waitFor();
  assert.ok(await page.getByRole('link', { name: /Create Story/ }).isVisible());
  assert.equal(await page.locator('img[src*="story-scenes"]').count(), 0, 'no shared scene art used as a cover');
  assert.equal(await page.locator('[data-cover="pending"]').count(), 2);
});

test('Create Story renders for the parent', async () => {
  await page.goto(`${BASE}/create-story`);
  await page.getByRole('heading', { name: 'Create a new story' }).waitFor({ timeout: 20000 });
  await page.fill('#story-prompt', 'A friendly dragon who learns to be brave.');
  assert.ok(await page.getByRole('button', { name: /Generate Story/ }).isEnabled());
});

test('Create Story without a provider key fails safely and keeps the idea', async () => {
  await page.getByRole('button', { name: /Generate Story/ }).click();
  await page.getByRole('alert').filter({ hasText: /couldn.t write the story|story limit/i }).waitFor({ timeout: 20000 });
  assert.equal(await page.inputValue('#story-prompt'), 'A friendly dragon who learns to be brave.');
  assert.match(page.url(), /\/create-story/);
});

test('parent enters Child Mode contextually from My Children (sheet captured for approval)', async () => {
  await page.goto(`${BASE}/dashboard`);
  await page.getByRole('button', { name: /^Emma, age 6$/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Emma' });
  await sheet.waitFor({ timeout: 10000 });
  assert.ok(await sheet.getByRole('button', { name: 'Start Child Mode' }).isVisible());
  await shoot('enter-child-mode-sheet');
  await page.keyboard.press('Escape');
  await sheet.waitFor({ state: 'detached' });
  await page.getByRole('button', { name: /^Emma, age 6$/ }).click();
  await page.getByRole('dialog', { name: 'Emma' }).getByRole('button', { name: 'Start Child Mode' }).click();
  await page.waitForURL(/\/kid\/dashboard/, { timeout: 20000 });
});

test('Child Mode library shows the approved story and never the draft', async () => {
  try {
    await page.getByText(APPROVED).first().waitFor({ timeout: 20000 });
  } catch (err) { await diagnose('library'); throw err; }
  assert.equal(await page.getByText(DRAFT).count(), 0);
});

test('direct navigation to parent areas from Child Mode is redirected and exposes no parent data', async () => {
  for (const path of ['/dashboard', '/settings', '/create-story', '/my-stories', '/my-children', '/kid-mode', `/edit-story/b2_${P.uid.slice(0, 6)}`]) {
    await page.goto(`${BASE}${path}`);
    try { await page.waitForURL(/\/kid\/dashboard/, { timeout: 15000 }); } catch (err) { await diagnose(path); throw err; }
    await settle(500);
    assert.equal(await page.getByText(DRAFT).count(), 0, `draft leaked on ${path}`);
    assert.equal(await page.getByText(P.email).count(), 0, `parent email leaked on ${path}`);
  }
});

test('Parent Gate rejects a wrong code and accepts the correct one', async () => {
  await page.goto(`${BASE}/kid/parent-gate`);
  await page.getByRole('heading', { name: 'Parental Verification' }).waitFor();
  assert.equal(await page.getByRole('button', { name: '.' }).count(), 0, 'no "." key');
  for (const d of '1111') await page.getByRole('button', { name: d, exact: true }).click();
  await page.getByRole('alert').filter({ hasText: /not correct/i }).waitFor({ timeout: 15000 });
  assert.match(page.url(), /\/kid\/parent-gate/);
  for (const d of PIN) await page.getByRole('button', { name: d, exact: true }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 20000 });
});

test('"Forgot code?" ends Child Mode and requires the parent password', async () => {
  await page.goto(`${BASE}/kid-mode`);
  await page.getByRole('button', { name: /Emma/ }).click();
  await page.waitForURL(/\/kid\/dashboard/, { timeout: 20000 });
  await page.goto(`${BASE}/kid/parent-gate`);
  await page.getByRole('button', { name: 'Forgot code?' }).click();
  await page.waitForURL(/\/login/, { timeout: 15000 });
  await page.goto(`${BASE}/dashboard`);
  await page.waitForURL(/\/login/, { timeout: 15000 });
});
