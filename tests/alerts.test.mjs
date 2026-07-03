import test from 'node:test';
import assert from 'node:assert/strict';
import { computeDiscountPct, matchDealToAlert } from '../lib/alerts.js';

for (const [current, original, expected] of [[50, 100, 50], [75, 100, 25], [99, 100, 1], [100, 100, 0], [120, 100, 0], [0, 100, 100], [50, 0, 0], ['50', '100', 50]]) {
  test(`computes discount ${current}/${original} as ${expected}%`, () => {
    assert.equal(computeDiscountPct({ prix: current, prix_original: original }), expected);
  });
}

test('matches an alert when every criterion matches', () => {
  const deal = { titre: 'Nike running shoes', description: 'Weekend sale', prix: 50, prix_original: 100, magasin: 'Sport', ville: 'Tel Aviv', categorie: 'Fashion' };
  assert.equal(matchDealToAlert(deal, { city: 'tel aviv', min_discount_percent: 40, keyword: 'NIKE' }), true);
});

test('rejects a city mismatch', () => {
  assert.equal(matchDealToAlert({ ville: 'Haifa' }, { city: 'Tel Aviv' }), false);
});

test('matches exact deal categories', () => {
  assert.equal(matchDealToAlert({ categorie: 'Tech' }, { category: 'Tech' }), true);
  assert.equal(matchDealToAlert({ categorie: 'Food' }, { category: 'Tech' }), false);
  assert.equal(matchDealToAlert({ categorie: 'Other' }, { category: 'Other' }), true);
});

test('matches city case-insensitively', () => {
  assert.equal(matchDealToAlert({ ville: 'TEL AVIV' }, { city: 'tel aviv' }), true);
});

test('rejects an insufficient discount', () => {
  assert.equal(matchDealToAlert({ prix: 80, prix_original: 100 }, { min_discount_percent: 30 }), false);
});

test('searches keywords across title, description, store and category', () => {
  for (const deal of [{ titre: 'Pizza night' }, { description: 'Pizza night' }, { magasin: 'Pizza Place' }, { categorie: 'Pizza' }]) {
    assert.equal(matchDealToAlert(deal, { keyword: 'pizza' }), true);
  }
});

test('rejects a missing keyword', () => {
  assert.equal(matchDealToAlert({ titre: 'Laptop' }, { keyword: 'phone' }), false);
});

test('matches online deals by category', () => {
  assert.equal(matchDealToAlert({ categorie: 'Online' }, { online_only: true }), true);
});

test('rejects physical deals for online-only alerts', () => {
  assert.equal(matchDealToAlert({ categorie: 'Food', ville: 'Haifa' }, { online_only: true }), false);
});

test('an alert without criteria matches any deal', () => {
  assert.equal(matchDealToAlert({}, {}), true);
});
