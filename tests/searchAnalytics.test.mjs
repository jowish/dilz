import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSearchKey, normalizeSearchKeyword, popularSearchesFromRows, validSearchKeyword } from '../lib/searchAnalytics.js';

test('search keywords normalize whitespace and case for aggregation', () => {
  assert.equal(normalizeSearchKeyword('  iPhone   15  '), 'iPhone 15');
  assert.equal(normalizeSearchKey('  iPhone   15  '), 'iphone 15');
  assert.equal(validSearchKeyword(' x '), '');
  assert.equal(validSearchKeyword(' ps5 '), 'ps5');
});

test('popular searches require the configured minimum count and sort by real volume', () => {
  const rows = [
    ...Array.from({ length: 19 }, (_, index) => ({ query: 'PS5', normalized_query: 'ps5', created_at: `2026-07-04T10:${String(index).padStart(2, '0')}:00Z` })),
    ...Array.from({ length: 20 }, (_, index) => ({ query: 'iPhone', normalized_query: 'iphone', created_at: `2026-07-04T11:${String(index).padStart(2, '0')}:00Z` })),
    ...Array.from({ length: 25 }, (_, index) => ({ query: 'MacBook', normalized_query: 'macbook', created_at: `2026-07-04T12:${String(index).padStart(2, '0')}:00Z` })),
  ];

  assert.deepEqual(popularSearchesFromRows(rows, { minCount: 20, limit: 8 }).map((item) => [item.keyword, item.count]), [
    ['MacBook', 25],
    ['iPhone', 20],
  ]);
});

test('popular searches respect the output limit', () => {
  const rows = [
    ...Array.from({ length: 21 }, () => ({ query: 'A', normalized_query: 'a' })),
    ...Array.from({ length: 22 }, () => ({ query: 'B', normalized_query: 'b' })),
    ...Array.from({ length: 23 }, () => ({ query: 'C', normalized_query: 'c' })),
  ];

  assert.deepEqual(popularSearchesFromRows(rows, { minCount: 20, limit: 2 }).map((item) => item.keyword), ['C', 'B']);
});
