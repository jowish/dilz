import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  formatDealPrice,
  formatOriginalPrice,
  getDealDiscount,
  isFreeDeal,
  availabilityLabel,
  locationLabel,
  storeMetaSegments,
  isExpiredDeal,
} = require(path.join(process.cwd(), 'lib', 'dealPresentation.js'));

test('a free deal reads FREE, never 0 ₪', () => {
  assert.equal(isFreeDeal({ prix: 0 }), true);
  assert.equal(formatDealPrice({ prix: 0 }), 'FREE');
  assert.equal(formatDealPrice({ prix: 0 }, 'he'), 'חינם');
  assert.doesNotMatch(formatDealPrice({ prix: 0 }), /0/);
});

test('a missing price is not treated as free', () => {
  assert.equal(isFreeDeal({}), false);
  assert.equal(isFreeDeal({ prix: null }), false);
  assert.equal(formatDealPrice({}), '');
  assert.equal(formatDealPrice({ prix: 'abc' }), '');
});

test('a normal price keeps its currency', () => {
  assert.equal(formatDealPrice({ prix: 49.9 }), '49.90 ₪');
  assert.equal(formatDealPrice({ prix: 1200 }), '1,200 ₪');
});

test('original price only shows when it is genuinely higher', () => {
  assert.equal(formatOriginalPrice({ prix: 50, prix_original: 90 }), '90 ₪');
  assert.equal(formatOriginalPrice({ prix: 50, prix_original: 50 }), '');
  assert.equal(formatOriginalPrice({ prix: 50, prix_original: 30 }), '');
  assert.equal(formatOriginalPrice({ prix: 50, prix_original: 0 }), '');
  assert.equal(formatOriginalPrice({ prix: 50 }), '');
});

test('discount is only computed from two valid prices', () => {
  assert.equal(getDealDiscount({ prix: 50, prix_original: 100 }), 50);
  assert.equal(getDealDiscount({ prix: 799, prix_original: 999 }), 20);
  // Impossible or meaningless discounts must not render at all.
  assert.equal(getDealDiscount({ prix: 100, prix_original: 50 }), null);
  assert.equal(getDealDiscount({ prix: 50, prix_original: 50 }), null);
  assert.equal(getDealDiscount({ prix: 0, prix_original: 100 }), null, 'free deal shows FREE, not -100%');
  assert.equal(getDealDiscount({ prix: 50 }), null);
  assert.equal(getDealDiscount({ prix: -5, prix_original: 100 }), null);
});

test('an online deal never renders its city twice', () => {
  const online = { magasin: 'KSP', ville: 'Online', categorie: 'Online' };
  assert.equal(locationLabel(online), null);
  assert.equal(availabilityLabel(online), 'Online');
  const segments = storeMetaSegments(online);
  assert.deepEqual(segments, ['KSP', 'Online']);
  assert.equal(segments.filter((s) => s === 'Online').length, 1);
});

test('an in-store deal shows store, city and in-store once each', () => {
  const inStore = { magasin: 'Rami Levy', ville: 'Haifa', categorie: 'Food' };
  assert.deepEqual(storeMetaSegments(inStore), ['Rami Levy', 'Haifa', 'In-store']);
});

test('a store named like its city is not printed twice', () => {
  const segments = storeMetaSegments({ magasin: 'Haifa', ville: 'haifa', categorie: 'Food' });
  assert.deepEqual(segments, ['Haifa', 'In-store']);
});

test('city translation is used when provided', () => {
  const translateCity = (city, lang) => (lang === 'he' && city === 'Haifa' ? 'חיפה' : city);
  assert.equal(locationLabel({ ville: 'Haifa' }, { translateCity, lang: 'he' }), 'חיפה');
});

test('expiry is date-only and independent of price', () => {
  assert.equal(isExpiredDeal({ date_fin: '2000-01-01' }), true);
  assert.equal(isExpiredDeal({ date_fin: '2999-01-01' }), false);
  assert.equal(isExpiredDeal({ date_fin: null }), false);
  assert.equal(isExpiredDeal({}), false);
  // A free deal is not expired by virtue of costing nothing.
  assert.equal(isExpiredDeal({ prix: 0, date_fin: '2999-01-01' }), false);
});
