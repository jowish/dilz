import test from 'node:test';
import assert from 'node:assert/strict';
import { composeFeedWithPinnedAndAds } from '../lib/feedComposition.js';

function deal(id, extra = {}) {
  return { id, titre: `Deal ${id}`, ...extra };
}

test('with no pinned deals and no ads, order is unchanged (aside from a stable feed key)', () => {
  const deals = [deal(1), deal(2), deal(3)];
  const composed = composeFeedWithPinnedAndAds(deals, []);
  assert.deepEqual(composed.map((d) => d.id), [1, 2, 3]);
  assert.ok(composed.every((d) => d._feedKey));
});

test('pinned deals always render first, regardless of their position in the input', () => {
  const deals = [deal(1), deal(2, { is_pinned: true }), deal(3), deal(4, { is_pinned: true })];
  const composed = composeFeedWithPinnedAndAds(deals, []);
  assert.deepEqual(composed.map((d) => d.id), [2, 4, 1, 3]);
});

test('an ad is inserted only after 8 regular deals, never at position 1', () => {
  const regular = Array.from({ length: 9 }, (_, i) => deal(i + 1));
  const ads = [deal(100, { is_ad: true })];
  const composed = composeFeedWithPinnedAndAds(regular, ads);
  // 8 regular deals, then the ad, then the 9th regular deal.
  assert.deepEqual(composed.map((d) => d.id), [1, 2, 3, 4, 5, 6, 7, 8, 100, 9]);
  assert.equal(composed[8].is_ad, true);
  assert.notEqual(composed[0].is_ad, true);
});

test('fewer than 8 regular deals never surface an ad, even with ads available', () => {
  const regular = Array.from({ length: 7 }, (_, i) => deal(i + 1));
  const composed = composeFeedWithPinnedAndAds(regular, [deal(100, { is_ad: true })]);
  assert.equal(composed.some((d) => d.is_ad), false);
  assert.equal(composed.length, 7);
});

test('the ad-insertion counter counts only regular deals — pinned deals do not push the first ad slot back or forward', () => {
  const deals = [
    deal(1, { is_pinned: true }),
    deal(2, { is_pinned: true }),
    ...Array.from({ length: 9 }, (_, i) => deal(i + 10)),
  ];
  const composed = composeFeedWithPinnedAndAds(deals, [deal(100, { is_ad: true })]);
  // 2 pinned, then 8 regular, then the ad, then the 9th regular.
  assert.deepEqual(composed.map((d) => d.id), [1, 2, 10, 11, 12, 13, 14, 15, 16, 17, 100, 18]);
});

test('a deal that is both pinned and an ad is treated as pinned for ordering purposes', () => {
  const deals = [deal(1, { is_pinned: true, is_ad: true }), deal(2), deal(3)];
  const composed = composeFeedWithPinnedAndAds(deals, []);
  assert.deepEqual(composed.map((d) => d.id), [1, 2, 3]);
  // Its own is_ad flag is preserved for display purposes (Sponsored label, no controls).
  assert.equal(composed[0].is_ad, true);
});

test('ads cycle through the pool when there are more ad slots than ads, each with a distinct feed key', () => {
  const regular = Array.from({ length: 17 }, (_, i) => deal(i + 1));
  const composed = composeFeedWithPinnedAndAds(regular, [deal(100, { is_ad: true })]);
  const adSlots = composed.filter((d) => d.is_ad);
  assert.equal(adSlots.length, 2);
  assert.equal(adSlots[0].id, 100);
  assert.equal(adSlots[1].id, 100);
  assert.notEqual(adSlots[0]._feedKey, adSlots[1]._feedKey);
});

test('empty input produces empty output without throwing', () => {
  assert.deepEqual(composeFeedWithPinnedAndAds([], []), []);
  assert.deepEqual(composeFeedWithPinnedAndAds([], [deal(100, { is_ad: true })]), []);
});
