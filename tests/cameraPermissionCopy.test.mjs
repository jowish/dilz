import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const read = (...parts) => readFile(path.join(process.cwd(), ...parts), 'utf8');

const [reviewNotes, readiness, appStoreConnect] = await Promise.all([
  read('docs', 'app-store', 'REVIEW_NOTES.md'),
  read('docs', 'app-store', 'READINESS.md'),
  read('docs', 'app-store', 'APP_STORE_CONNECT.md'),
]);

// The barcode scanner (pages/scan.js) was deleted in issue #15. These docs
// described it as a still-live feature; guard against that regressing back
// in, since a submission-facing doc describing a feature that doesn't exist
// is a real App Review risk.
//
// ios/App/App/Info.plist's NSCameraUsageDescription still describes the
// deleted barcode scanner too, and needs the same fix — deliberately left
// untouched here. AGENTS.md §4 restricts agents from modifying native ios/
// or android/ directories without the human doing it directly; flagged
// instead of edited. See the PR description.
test('App Review notes no longer send reviewers to test a barcode scanner', () => {
  assert.doesNotMatch(reviewNotes, /barcode|scanner|scan action/i);
});

test('the App Store readiness checklist no longer references barcode/scanning', () => {
  assert.doesNotMatch(readiness, /barcode|camera scanning/i);
});

test('the App Store Connect submission copy no longer promises barcode scanning', () => {
  assert.doesNotMatch(appStoreConnect, /scan a barcode/i);
});
