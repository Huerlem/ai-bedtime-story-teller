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

test('parent signs in through the real login page', async () => {
  await page.goto(`${BASE}/login`);
  await page.fill('#email', P.email);
  await page.fill('#password', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 20000 });
});

test('Parent Dashboard renders family data (production build visual capture)', async () => {
  await page.getByRole('heading', { level: 1, name: /Good (morning|afternoon|evening)/ }).waitFor({ timeout: 20000 });
  await page.getByText('Lucas').first().waitFor();
  await page.getByText(APPROVED).first().waitFor();
  assert.ok(await page.getByRole('link', { name: /Create Story/ }).isVisible());
  mkdirSync('artifacts/visual', { recursive: true });
  for (const [w, h] of [[390, 844], [393, 852], [430, 932], [375, 667]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `artifacts/visual/dashboard-${w}x${h}.png` });
  }
  await page.setViewportSize({ width: 390, height: 844 });
});

test('Create Story renders for the parent (production build visual capture)', async () => {
  await page.goto(`${BASE}/create-story`);
  await page.getByRole('heading', { name: 'Create a new story' }).waitFor({ timeout: 20000 });
  await page.fill('#story-prompt', 'A friendly dragon who learns to be brave.');
  assert.ok(await page.getByRole('button', { name: /Generate Story/ }).isEnabled());
  for (const [w, h] of [[390, 844], [393, 852], [430, 932], [375, 667]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `artifacts/visual/create-story-${w}x${h}.png` });
  }
  await page.setViewportSize({ width: 390, height: 844 });
});

test('Create Story without a provider key fails safely and keeps the idea', async () => {
  await page.getByRole('button', { name: /Generate Story/ }).click();
  await page.getByRole('alert').filter({ hasText: /couldn.t write the story|story limit/i }).waitFor({ timeout: 20000 });
  assert.equal(await page.inputValue('#story-prompt'), 'A friendly dragon who learns to be brave.');
  assert.match(page.url(), /\/create-story/);
});

test('parent enters Child Mode from profile selection', async () => {
  await page.goto(`${BASE}/kid-mode`);
  await page.getByRole('button', { name: /Emma/ }).click();
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
