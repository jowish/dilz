import test from 'node:test';
import assert from 'node:assert/strict';
import {
  THEME_STORAGE_KEY,
  THEME_VALUES,
  getNextTheme,
  normalizeTheme,
} from '../lib/themePreference.js';

test('theme preference uses a browser-only storage key', () => {
  assert.equal(THEME_STORAGE_KEY, 'dilzTheme');
});

test('only light and dark are accepted themes', () => {
  assert.deepEqual([...THEME_VALUES], ['light', 'dark']);
  assert.equal(normalizeTheme('light'), 'light');
  assert.equal(normalizeTheme('dark'), 'dark');
  assert.equal(normalizeTheme('system'), 'dark');
  assert.equal(normalizeTheme(undefined), 'dark');
});

test('theme toggle always selects the opposite explicit theme', () => {
  assert.equal(getNextTheme('light'), 'dark');
  assert.equal(getNextTheme('dark'), 'light');
  assert.equal(getNextTheme(undefined), 'light');
});
