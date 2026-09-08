import test from 'node:test';
import assert from 'node:assert/strict';
import {
  THEME_STORAGE_KEY,
  THEME_VALUES,
  THEME_CLASSES,
  getNextTheme,
  normalizeTheme,
} from '../lib/themePreference.js';

test('theme preference uses a browser-only storage key', () => {
  assert.equal(THEME_STORAGE_KEY, 'dilzTheme');
});

test('light, dark, warm and system are accepted themes', () => {
  assert.deepEqual([...THEME_VALUES], ['light', 'dark', 'warm', 'system']);
  assert.equal(normalizeTheme('light'), 'light');
  assert.equal(normalizeTheme('dark'), 'dark');
  assert.equal(normalizeTheme('warm'), 'warm');
  assert.equal(normalizeTheme('system'), 'system');
  assert.equal(normalizeTheme(undefined), 'system');
  assert.equal(normalizeTheme('sepia'), 'system');
});

test('only the class-backed themes are handed to next-themes', () => {
  // 'system' resolves to light or dark, so it is never a class on <html>.
  assert.deepEqual([...THEME_CLASSES], ['light', 'dark', 'warm']);
  assert.ok(!THEME_CLASSES.includes('system'));
  for (const value of THEME_CLASSES) assert.ok(THEME_VALUES.includes(value));
});

test('theme toggle stays on the light/dark axis, warm included', () => {
  assert.equal(getNextTheme('light'), 'dark');
  assert.equal(getNextTheme('dark'), 'light');
  assert.equal(getNextTheme(undefined), 'dark');
  // The header toggle is a two-state switch; from warm it goes to dark
  // rather than cycling, so warm is only ever chosen in account settings.
  assert.equal(getNextTheme('warm'), 'dark');
});
