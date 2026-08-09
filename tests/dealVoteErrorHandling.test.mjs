import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const read = (...parts) => readFile(path.join(process.cwd(), ...parts), 'utf8');

const [home, dealPage, errorToast] = await Promise.all([
  read('pages', 'index.js'),
  read('pages', 'deal', '[id].js'),
  read('components', 'ui', 'ErrorToast.js'),
]);

// A genuine fetch rejection (offline, DNS failure, timeout) used to skip the
// vote's rollback logic entirely: the optimistic UI update stayed applied
// with no error shown, and only silently reverted on next reload. Guard
// against that regressing — the vote fetch must be inside a try/catch whose
// catch path rolls back the same way a non-ok response does.
for (const [name, source] of [['pages/index.js', home], ['pages/deal/[id].js', dealPage]]) {
  test(`${name}: the vote request is wrapped in try/catch with a shared rollback on both failure paths`, () => {
    assert.match(source, /const rollbackVote = \(\) => \{/);
    assert.match(source, /try \{\s*const apiRes = await fetch\('\/api\/bons-plans'/);
    assert.match(source, /\} else \{\s*rollbackVote\(\);\s*\}\s*\} catch \{\s*rollbackVote\(\);\s*\}/);
  });

  test(`${name}: a failed vote shows a brief, non-blocking error message`, () => {
    assert.match(source, /setVoteError\(lang === 'he' \? '.+' : 'Vote failed\. Please try again\.'\)/);
    assert.match(source, /window\.setTimeout\(\(\) => setVoteError\(''\), 1800\)/);
    assert.match(source, /<ErrorToast message=\{voteError\} \/>/);
  });
}

test('ErrorToast renders the given message and nothing when empty', () => {
  assert.match(errorToast, /if \(!message\) return null/);
  assert.match(errorToast, /role="status" aria-live="polite"/);
});
