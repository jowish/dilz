import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const home = await readFile(path.join(process.cwd(), 'pages', 'index.js'), 'utf8');

test('returning from a deal restores the feed position instead of guessing on a timer', () => {
  // The old version did window.scrollTo inside setTimeout(..., 300), which
  // fired before the feed had been fetched, so the document was still short
  // and the scroll clamped near the top.
  assert.doesNotMatch(home, /setTimeout\(\(\) => window\.scrollTo/);
  assert.match(home, /pendingRestoreRef\.current = \{/);
  // Scrolls only once the layout is genuinely tall enough for the target.
  assert.match(home, /const maxScroll = document\.documentElement\.scrollHeight - window\.innerHeight/);
  assert.match(home, /if \(maxScroll >= pending\.y - 4\)/);
  assert.match(home, /window\.scrollTo\(\{ top: pending\.y, behavior: 'instant' \}\)/);
});

test('enough pages are re-fetched to reach where the user was, but the retry is bounded', () => {
  assert.match(home, /const RESTORE_MAX_PAGES = \d+/);
  assert.match(home, /deals\.length < target\.count/);
  assert.match(home, /restorePagesFetchedRef\.current < RESTORE_MAX_PAGES/);
});

test('the feed records how deep the user was before navigating away', () => {
  assert.match(home, /router\.events\.on\('routeChangeStart', rememberFeedPosition\)/);
  assert.match(home, /sessionStorage\.setItem\('dilzDealCount', String\(deals\.length\)\)/);
  assert.match(home, /sessionStorage\.setItem\('dilzScrollY', String\(window\.scrollY\)\)/);
});

test('a deliberate user scroll cancels the pending restore', () => {
  assert.match(home, /window\.addEventListener\('wheel', abandonRestore/);
  assert.match(home, /window\.addEventListener\('touchstart', abandonRestore/);
});
