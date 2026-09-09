import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const read = (...parts) => readFile(path.join(process.cwd(), ...parts), 'utf8');

const [home, dealCard, premiumCss] = await Promise.all([
  read('pages', 'index.js'),
  read('components', 'deals', 'DealCard.js'),
  read('styles', 'premium-refresh.css'),
]);

test('search results render the same row card as the feed, inside a grid its CSS can match', () => {
  // The broken card: search passed layout="list", a legacy layout whose rules
  // are all scoped under `.dilz-feed-grid.is-list`. `.dilz-search-deal-results`
  // carried neither class, so not one of those rules applied and the photo
  // rendered on top of the title. The row card used everywhere else is
  // `spotlight`, and its rules need `.dilz-feed-grid.is-spotlight` on the
  // container to apply.
  assert.match(home, /className="dilz-search-deal-results dilz-feed-grid is-spotlight"/);
  const searchBlock = home.slice(
    home.indexOf('dilz-search-deal-results'),
    home.indexOf('dilz-search-deal-results') + 900,
  );
  assert.match(searchBlock, /layout="spotlight"/);
  assert.doesNotMatch(searchBlock, /layout="list"/);
  // The rules the container has to match for the row card to lay out at all.
  assert.match(premiumCss, /\.dilz-feed-grid\.is-spotlight\s+\.dilz-deal-card/);
});

test('row cards request an image sized for the row slot, not the full-width slot', () => {
  // The row card's photo slot measures 104x200 CSS px; at DPR 3 that is ~312
  // device px. Every card asked the optimizer for w=640 regardless of layout —
  // roughly twice the pixels needed on the layout that shows the most cards,
  // which is what made photos pop in a second late on a phone connection.
  assert.match(dealCard, /const mediaWidth = \(layout === 'spotlight' \|\| layout === 'list'\) \? 384 : 640/);
  assert.match(dealCard, /optimizedImageUrl\(primaryImage, \{ width: mediaWidth, quality: 70 \}\)/);
  assert.doesNotMatch(dealCard, /optimizedImageUrl\(primaryImage, \{ width: 640/);
  // Off-screen cards still must not download at all, and the first screenful
  // still must not be deferred.
  assert.match(dealCard, /loading=\{priority \? 'eager' : 'lazy'\}/);
  assert.match(dealCard, /fetchPriority=\{priority \? 'high' : 'low'\}/);
  assert.match(home, /priority=\{index < 3\}/);
});
