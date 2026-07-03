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

test('light, dark and system are accepted themes', () => {
  assert.deepEqual([...THEME_VALUES], ['light', 'dark', 'system']);
  assert.equal(normalizeTheme('light'), 'light');
  assert.equal(normalizeTheme('dark'), 'dark');
  assert.equal(normalizeTheme('system'), 'system');
  assert.equal(normalizeTheme(undefined), 'system');
});

test('theme toggle always selects the opposite explicit theme', () => {
  assert.equal(getNextTheme('light'), 'dark');
  assert.equal(getNextTheme('dark'), 'light');
  assert.equal(getNextTheme(undefined), 'dark');
});
