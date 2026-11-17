import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root));
const sha = (p) => createHash('sha256').update(read(p)).digest('hex');
const pngSize = (p) => { const b = read(p); return [b.readUInt32BE(16), b.readUInt32BE(20), b[25]]; };

test('approved icon source and transparent fox mascot are committed unchanged in format', () => {
  assert.deepEqual(pngSize('public/brand/dreamtales-app-icon-source.png').slice(0, 2), [1254, 1254]);
  const [w, h, colourType] = pngSize('public/brand/dreamtales-fox-mascot.png');
  assert.deepEqual([w, h], [1024, 1024]);
  assert.equal(colourType, 6, 'mascot must keep its alpha channel (RGBA)');
});

test('App Store master icon is 1024 opaque RGB', () => {
  const [w, h, colourType] = pngSize('resources/ios/AppStore-1024.png');
  assert.deepEqual([w, h, colourType], [1024, 1024, 2]);
});

test('web manifest references only files that exist', () => {
  const manifest = JSON.parse(read('public/site.webmanifest'));
  assert.equal(manifest.name, 'Dream Tales');
  for (const icon of manifest.icons) assert.ok(existsSync(new URL('public' + icon.src, root)), icon.src);
  assert.ok(manifest.icons.some((i) => i.purpose === 'maskable'));
});

test('App Router icon files are the approved pack, not Next.js defaults', () => {
  assert.equal(sha('src/app/favicon.ico'), sha('public/icons/favicon.ico'));
  assert.equal(sha('src/app/icon.png'), sha('public/icons/icon-512.png'));
  assert.equal(sha('src/app/apple-icon.png'), sha('public/icons/apple-touch-icon.png'));
  assert.ok(statSync(new URL('src/app/favicon.ico', root)).size > 1000);
});

test('UI font is Nunito, self-hosted; no third-party font requests or legacy brand', () => {
  const layout = read('src/app/layout.js').toString();
  assert.match(layout, /next\/font\/local/);
  assert.match(layout, /Nunito-VariableFont_wght\.ttf/);
  assert.doesNotMatch(layout, /next\/font\/google/);
  assert.ok(existsSync('src/app/fonts/Nunito-OFL.txt'), 'OFL licence ships with the font');
  assert.doesNotMatch(layout, /Poppins|AI Bedtime Story|aibedtimestory\.com/);
  const css = read('src/styles/globals.css').toString();
  assert.doesNotMatch(css, /fonts\.googleapis\.com/);
  assert.match(css, /var\(--font-nunito\)/);
});

test('asset inventory documents committed, composite-only and missing artwork', () => {
  const inv = read('docs/ASSET_INVENTORY.md').toString();
  for (const s of ['COMMITTED', 'COMPOSITE-ONLY', 'NOT FOUND', 'wordmark', 'four premium storybook scenes']) assert.ok(inv.includes(s), s);
});

test('Create Story select shows only the Lucide chevron (forms-plugin arrow suppressed)', () => {
  const view = read('src/components/v2/CreateStoryView.jsx').toString();
  assert.match(view, /<select[\s\S]*?appearance-none bg-none/);
});
