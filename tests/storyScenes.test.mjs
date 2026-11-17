import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STORY_SCENES, BRAND, maxCrispSize } from '../src/lib/brandAssets.mjs';
const root = new URL('../', import.meta.url);
const jpegSize = (buf) => { // SOF0/SOF2 marker scan
  let i = 2;
  while (i < buf.length) {
    const marker = buf[i + 1]; const len = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xc3) return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
    i += 2 + len;
  }
  return null;
};

test('the four supplied premium scenes are committed at their registered native size', () => {
  for (const [key, scene] of Object.entries(STORY_SCENES)) {
    const buf = readFileSync(new URL('public' + scene.src, root));
    assert.deepEqual(jpegSize(buf), [scene.width, scene.height], key);
    assert.ok(scene.alt.length > 10, `${key} needs alt text`);
    assert.ok(scene.use.length > 0);
  }
});

test('scenes are only sharp at card sizes on @3x devices (documented limitation)', () => {
  const crisp = maxCrispSize(STORY_SCENES.foxDiscoversStar, 3);
  assert.ok(crisp.width < 390 / 2, 'not full-bleed capable');
  assert.ok(crisp.width >= 105, 'fits the 105×143 pt recent-story cover slot (prototype 141:2)');
});

test('no wordmark is fabricated while the original file is missing', () => {
  assert.equal(BRAND.wordmark, null);
});
