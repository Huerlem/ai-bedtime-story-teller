// Production-build visual capture (Nunito via next/font) at Final Vision iPhone sizes.
// Output: artifacts/visual/<screen>-<w>x<h>.png for comparison against Figma 50:14.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:3100';
const SIZES = [[390, 844, 'iPhone 13/14'], [393, 852, 'iPhone 15/16'], [430, 932, 'iPhone Pro Max'], [375, 667, 'iPhone SE']];
const SCREENS = [['parent-gate', '/kid/parent-gate', 'Parental Verification']];
mkdirSync('artifacts/visual', { recursive: true });
const browser = await chromium.launch();
const report = [];
for (const [w, h, label] of SIZES) {
  const page = await (await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 })).newPage();
  for (const [name, path, heading] of SCREENS) {
    await page.goto(BASE + path);
    await page.getByRole('heading', { name: heading }).waitFor({ timeout: 20000 });
    await page.evaluate(() => document.fonts.ready);
    const font = await page.evaluate(() => getComputedStyle(document.querySelector('h1')).fontFamily);
    const nunitoLoaded = await page.evaluate(() => [...document.fonts].some((f) => /nunito/i.test(f.family) && f.status === 'loaded'));
    const overflow = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    await page.screenshot({ path: `artifacts/visual/${name}-${w}x${h}.png` });
    report.push({ screen: name, size: `${w}x${h}`, device: label, font, nunitoLoaded, verticalOverflowPx: overflow });
  }
  await page.context().close();
}
await browser.close();
console.log(JSON.stringify(report, null, 2));
if (report.some((r) => !r.nunitoLoaded)) { console.error('Nunito did not load'); process.exit(1); }
