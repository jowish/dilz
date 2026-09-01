import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const { canOptimizeImage, optimizedImageUrl } = await import('../lib/imageUrl.js');

const SUPABASE_IMG = 'https://wqkhetnkcocehekniwig.supabase.co/storage/v1/object/public/deal-images/u1/123.jpg';

test('routes known hosts through the Next image optimizer', () => {
  const out = optimizedImageUrl(SUPABASE_IMG, { width: 640, quality: 70 });
  assert.match(out, /^\/_next\/image\?url=/);
  assert.match(out, /&w=640&q=70$/);
  assert.equal(decodeURIComponent(out.split('url=')[1].split('&')[0]), SUPABASE_IMG);
});

test('leaves unknown hosts untouched so arbitrary retailer photos never break', () => {
  // DilzBot pulls product images from retailer domains that are not in
  // next.config.mjs's remotePatterns — the optimizer would 400 on those.
  const foreign = 'https://www.carrefour.co.il/media/product.jpg';
  assert.equal(canOptimizeImage(foreign), false);
  assert.equal(optimizedImageUrl(foreign), foreign);
});

test('leaves non-http sources alone', () => {
  for (const src of ['/local/file.png', 'data:image/png;base64,AAAA', '', null, undefined]) {
    assert.equal(optimizedImageUrl(src), src);
  }
});

test('never double-optimizes an already-optimized URL', () => {
  const once = optimizedImageUrl(SUPABASE_IMG);
  assert.equal(optimizedImageUrl(once), once);
});

test('falls back to an allowed width when given one Next would reject', () => {
  // Next 400s on widths outside its deviceSizes/imageSizes lists.
  const out = optimizedImageUrl(SUPABASE_IMG, { width: 617 });
  assert.match(out, /&w=640&/);
});

test('the optimizable host list matches next.config.mjs remotePatterns', async () => {
  const [helper, config] = await Promise.all([
    readFile(path.join(process.cwd(), 'lib', 'imageUrl.js'), 'utf8'),
    readFile(path.join(process.cwd(), 'next.config.mjs'), 'utf8'),
  ]);
  const configured = [...config.matchAll(/hostname:\s*'([^']+)'/g)].map((m) => m[1]);
  assert.ok(configured.length > 0, 'expected remotePatterns hostnames in next.config.mjs');
  for (const hostname of configured) {
    assert.ok(
      helper.includes(`'${hostname}'`),
      `${hostname} is allowed by next.config.mjs but missing from lib/imageUrl.js — it would be served unoptimized`,
    );
  }
});

test('feed cards defer off-screen photos and only eager-load the first few', async () => {
  const [card, home] = await Promise.all([
    readFile(path.join(process.cwd(), 'components', 'deals', 'DealCard.js'), 'utf8'),
    readFile(path.join(process.cwd(), 'pages', 'index.js'), 'utf8'),
  ]);
  assert.match(card, /loading=\{priority \? 'eager' : 'lazy'\}/);
  assert.match(card, /decoding="async"/);
  assert.match(card, /optimizedImageUrl\(primaryImage/);
  assert.match(home, /priority=\{index < 3\}/);
});
