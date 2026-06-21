import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const splashDirectory = path.join(process.cwd(), 'ios', 'App', 'App', 'Assets.xcassets', 'Splash.imageset');
const splashFiles = ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png'];
const webIcons = [
  ['icon-180.png', 180],
  ['icon-192.png', 192],
  ['icon-512.png', 512],
];

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

test('web app icons use the declared PNG dimensions', async () => {
  for (const [file, size] of webIcons) {
    const metadata = await sharp(path.join(process.cwd(), 'public', file)).metadata();
    assert.equal(metadata.width, size, file);
    assert.equal(metadata.height, size, file);
    assert.equal(metadata.format, 'png', file);
  }
});

test('web manifest exposes the standard installable icon sizes', async () => {
  const manifest = JSON.parse(await readFile(path.join(process.cwd(), 'public', 'manifest.webmanifest'), 'utf8'));
  assert.deepEqual(
    manifest.icons.map(({ src, sizes, type }) => ({ src, sizes, type })),
    [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  );
});

test('the iOS app icon uses the same artwork as the 512px web icon', async () => {
  const iosPath = path.join(process.cwd(), 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset', 'AppIcon-512@2x.png');
  const iosMetadata = await sharp(iosPath).metadata();
  assert.equal(iosMetadata.width, 1024);
  assert.equal(iosMetadata.height, 1024);

  const [webPixels, iosPixels] = await Promise.all([
    sharp(path.join(process.cwd(), 'public', 'icon-512.png')).raw().toBuffer(),
    sharp(iosPath).resize(512, 512).raw().toBuffer(),
  ]);
  assert.deepEqual(webPixels, iosPixels);
});
