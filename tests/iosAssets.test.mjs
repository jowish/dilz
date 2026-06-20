import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const splashDirectory = path.join(process.cwd(), 'ios', 'App', 'App', 'Assets.xcassets', 'Splash.imageset');
const splashFiles = ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png'];

test('all iOS splash assets use the required square resolution', async () => {
  for (const file of splashFiles) {
    const metadata = await sharp(path.join(splashDirectory, file)).metadata();
    assert.equal(metadata.width, 2732, file);
    assert.equal(metadata.height, 2732, file);
    assert.equal(metadata.format, 'png', file);
  }
});

test('all iOS splash scales use the same branded artwork', async () => {
  const hashes = await Promise.all(splashFiles.map(async file => {
    const bytes = await readFile(path.join(splashDirectory, file));
    return createHash('sha256').update(bytes).digest('hex');
  }));
  assert.equal(new Set(hashes).size, 1);
});
