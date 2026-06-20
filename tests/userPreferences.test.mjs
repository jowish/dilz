import test from 'node:test';
import assert from 'node:assert/strict';
import { DEAL_SORT_PREFERENCES, normalizeDealSortPreference, readDealSortPreference, writeDealSortPreference } from '../lib/userPreferences.js';

for (const value of DEAL_SORT_PREFERENCES) {
  test(`accepts deal sort preference ${value}`, () => assert.equal(normalizeDealSortPreference(value), value));
}

for (const value of [undefined, null, '', 'nearby', 'HOT', 1]) {
  test(`normalizes invalid preference ${String(value)} to hot`, () => assert.equal(normalizeDealSortPreference(value), 'hot'));
}

test('reads hot during server-side rendering', () => {
  const originalWindow = globalThis.window;
  delete globalThis.window;
  try { assert.equal(readDealSortPreference(), 'hot'); } finally { if (originalWindow !== undefined) globalThis.window = originalWindow; }
});

test('reads and writes normalized preferences in local storage', () => {
  const originalWindow = globalThis.window;
  const values = new Map([['dilzDealSortPreference', 'comments']]);
  globalThis.window = { localStorage: { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value) } };
  try {
    assert.equal(readDealSortPreference(), 'comments');
    assert.equal(writeDealSortPreference('latest'), 'latest');
    assert.equal(values.get('dilzDealSortPreference'), 'latest');
    assert.equal(writeDealSortPreference('invalid'), 'hot');
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});

test('storage failures safely fall back to hot', () => {
  const originalWindow = globalThis.window;
  globalThis.window = { localStorage: { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } } };
  try {
    assert.equal(readDealSortPreference(), 'hot');
    assert.equal(writeDealSortPreference('comments'), 'comments');
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});
