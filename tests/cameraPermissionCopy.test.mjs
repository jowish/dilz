import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const read = (...parts) => readFile(path.join(process.cwd(), ...parts), 'utf8');

const [infoPlist, reviewNotes, readiness, appStoreConnect] = await Promise.all([
  read('ios', 'App', 'App', 'Info.plist'),
  read('docs', 'app-store', 'REVIEW_NOTES.md'),
  read('docs', 'app-store', 'READINESS.md'),
  read('docs', 'app-store', 'APP_STORE_CONNECT.md'),
]);

// The barcode scanner (pages/scan.js) was deleted in issue #15. This doc set
// and the iOS permission string described it as a still-live feature; guard
// against that regressing back in, since a submission-facing doc or
// permission string describing a feature that doesn't exist is a real App
// Review risk.
test('the iOS camera permission string describes deal photo upload, not the deleted barcode scanner', () => {
  assert.match(infoPlist, /NSCameraUsageDescription/);
  assert.doesNotMatch(infoPlist, /barcode|scan/i);
});

test('App Review notes no longer send reviewers to test a barcode scanner', () => {
  assert.doesNotMatch(reviewNotes, /barcode|scanner|scan action/i);
});

test('the App Store readiness checklist no longer references barcode/scanning', () => {
  assert.doesNotMatch(readiness, /barcode|camera scanning/i);
});

test('the App Store Connect submission copy no longer promises barcode scanning', () => {
  assert.doesNotMatch(appStoreConnect, /scan a barcode/i);
});
