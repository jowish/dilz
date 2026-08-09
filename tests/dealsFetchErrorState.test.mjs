import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const read = (...parts) => readFile(path.join(process.cwd(), ...parts), 'utf8');

const [home, emptyState, css, readiness] = await Promise.all([
  read('pages', 'index.js'),
  read('components', 'ui', 'EmptyState.js'),
  read('styles', 'globals.css'),
  read('docs', 'app-store', 'READINESS.md'),
]);

// A failed feed fetch used to clear deals to [] and render the exact same
// "no deals yet, be the first to share" empty state as a genuinely empty
// category — a network failure looked like an invitation to post. Guard
// against that regressing: a fetch failure must be tracked separately from
// "zero results" and shown with distinct copy and a retry action.
test('fetchDealsPage treats a non-ok response as a failure, not zero results', () => {
  assert.match(home, /if \(!response\.ok\) throw new Error\(`Failed to load deals \(\$\{response\.status\}\)`\)/);
});

test('a failed initial fetch is tracked separately from an empty result set', () => {
  assert.match(home, /const \[dealsFetchError, setDealsFetchError\] = useState\(false\)/);
  assert.match(home, /setDealsFetchError\(false\);\s*fetchDealsPage\(\{ offset: 0, append: false/);
  assert.match(home, /if \(error\.name !== 'AbortError'\) \{\s*setLoadingDeals\(false\);\s*setHasMoreDeals\(false\);\s*setDealsFetchError\(true\);/);
});

test('the fetch-error state renders distinct bilingual copy with a retry action, before the empty-category state', () => {
  const errorBranchIndex = home.indexOf("visibleDeals.length === 0 && dealsFetchError ? (");
  const emptyCategoryBranchIndex = home.indexOf('visibleDeals.length === 0 && !hasMoreDeals ? (');
  assert.ok(errorBranchIndex > -1, 'error branch missing');
  assert.ok(emptyCategoryBranchIndex > -1, 'empty-category branch missing');
  assert.ok(errorBranchIndex < emptyCategoryBranchIndex, 'error branch must be checked before the empty-category branch');

  assert.match(home, /tone="error"/);
  assert.match(home, /"Can't load deals" : 'לא ניתן לטעון דילים'/);
  assert.match(home, /'Retry' : 'נסה שוב'/);
  assert.match(home, /onAction=\{retryDealsFetch\}/);
  assert.match(home, /const retryDealsFetch = useCallback\(\(\) => \{\s*setDealsFetchRetryCount\(\(count\) => count \+ 1\);/);
});

test('EmptyState supports a distinct error tone with its own icon and modifier class', () => {
  assert.match(emptyState, /tone = 'empty'/);
  assert.match(emptyState, /tone === 'error' && 'is-error'/);
  assert.match(emptyState, /tone === 'error' \? <WifiOffIcon \/> : <BoxIcon \/>/);
});

test('the error tone is visually distinct from the default empty state (danger tokens, not the brand accent)', () => {
  assert.match(css, /\.dilz-empty-state\.is-error \.dilz-empty-state__mark\s*\{[^}]*background:\s*var\(--danger-soft\)[^}]*color:\s*var\(--danger\)/s);
});

test('the readiness doc no longer claims an offline fallback page exists', () => {
  assert.doesNotMatch(readiness, /offline fallback page/);
});
