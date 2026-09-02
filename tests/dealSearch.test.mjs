import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { buildDealSearchFilter, sanitizeSearchTerm, isSearchableTerm, SEARCH_COLUMNS } =
  require(path.join(process.cwd(), 'lib', 'dealSearch.js'));

test('search covers description, not just title/store/city', () => {
  // The reported bug: a deal with "parfum" in its description was unfindable.
  assert.ok(SEARCH_COLUMNS.includes('description'));
  const filter = buildDealSearchFilter('parfum');
  assert.match(filter, /description\.ilike\.\*parfum\*/);
  assert.match(filter, /titre\.ilike\.\*parfum\*/);
  assert.match(filter, /magasin\.ilike\.\*parfum\*/);
  assert.match(filter, /ville\.ilike\.\*parfum\*/);
});

test('short or empty terms produce no filter at all', () => {
  for (const term of ['', ' ', 'a', null, undefined]) {
    assert.equal(buildDealSearchFilter(term), '');
    assert.equal(isSearchableTerm(term), false);
  }
});

test('PostgREST filter delimiters in user input cannot break out of the filter', () => {
  // Commas and parens delimit the or=(...) grammar; quotes/backslash/star are
  // its quoting characters. None may survive into the built filter.
  const nasty = 'par(fum),titre.ilike.*x*,"a"\\b';
  const cleaned = sanitizeSearchTerm(nasty);
  for (const char of ['(', ')', ',', '"', "'", '\\', '*']) {
    assert.ok(!cleaned.includes(char), `sanitized term still contains ${char}: ${cleaned}`);
  }
  const filter = buildDealSearchFilter(nasty);
  // Exactly one clause per searchable column — no injected extra clauses.
  assert.equal(filter.split(',').length, SEARCH_COLUMNS.length);
});

test('ilike wildcards typed by the user are not treated as wildcards', () => {
  const cleaned = sanitizeSearchTerm('100% _off');
  assert.ok(!cleaned.includes('%'));
  assert.ok(!cleaned.includes('_'));
});

test('very long input is capped', () => {
  assert.ok(sanitizeSearchTerm('x'.repeat(500)).length <= 80);
});

test('the deals API applies the search filter, and the search tab queries it', async () => {
  const [api, home] = await Promise.all([
    readFile(path.join(process.cwd(), 'pages', 'api', 'bons-plans.js'), 'utf8'),
    readFile(path.join(process.cwd(), 'pages', 'index.js'), 'utf8'),
  ]);
  assert.match(api, /const searchFilter = buildDealSearchFilter\(q\)/);
  assert.match(api, /if \(searchFilter\) query = query\.or\(searchFilter\)/);
  // The search tab must hit the API, not filter the paginated feed in memory.
  assert.match(home, /fetch\(`\/api\/bons-plans\?\$\{params\}`/);
  assert.doesNotMatch(home, /deals\.filter\(d => matchSearch\(/);
});
