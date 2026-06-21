import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldDismissSheet } from '../lib/sheetGesture.js';

test('a deliberate downward drag dismisses a sheet', () => {
  assert.equal(shouldDismissSheet(72, 0.1), true);
  assert.equal(shouldDismissSheet(90, 0), true);
});

test('a short fast flick dismisses while incidental movement does not', () => {
  assert.equal(shouldDismissSheet(40, 0.7), true);
  assert.equal(shouldDismissSheet(35, 2), false);
  assert.equal(shouldDismissSheet(50, 0.2), false);
  assert.equal(shouldDismissSheet(-20, 2), false);
});
