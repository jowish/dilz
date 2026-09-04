import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Normalised to LF: git checks these files out with CRLF on Windows, and the
// patterns below span line breaks.
const read = async (...parts) => {
  const text = await readFile(path.join(process.cwd(), ...parts), 'utf8');
  return text.split('\r\n').join('\n');
};
const [sql, dealsApi] = await Promise.all([
  read('supabase-performance-tuning-setup.sql'),
  read('pages', 'api', 'bons-plans.js'),
]);

const policyBlocks = [...sql.matchAll(/alter policy "([^"]+)" on public\.(\w+)([\s\S]*?);/g)];

test('every policy the file touches evaluates auth.uid() once per query', () => {
  assert.equal(policyBlocks.length, 18);
  for (const [block, name, table] of policyBlocks) {
    assert.match(block, /\(select auth\.uid\(\)\)/, `${table}."${name}" must wrap auth.uid()`);
    // A bare auth.uid() anywhere in the statement is the thing being fixed.
    assert.doesNotMatch(
      block.replace(/\(select auth\.uid\(\)\)/g, 'OK'),
      /auth\.uid\(\)/,
      `${table}."${name}" still calls auth.uid() per row`
    );
  }
});

test('the rewrite only changes how often auth.uid() runs, never who matches', () => {
  // Each statement documents the expression it replaces; stripping the wrapper
  // must give back exactly that "before" comment.
  const withBefore = [...sql.matchAll(/-- before: (\([^\n]*?\))(?: —[^\n]*)?\n(alter policy[\s\S]*?;)/g)];
  assert.equal(withBefore.length, 18, 'every statement records what it replaces');
  for (const [, before, statement] of withBefore) {
    const rewritten = statement.replace(/\(select auth\.uid\(\)\)/g, 'auth.uid()');
    const normalize = (text) => text.replace(/\s+/g, ' ').trim();
    assert.ok(
      normalize(rewritten).includes(normalize(before)),
      `rewrite drifted from its documented "before": ${before}`
    );
  }
});

test('no policy is dropped or created — the access rules are untouched', () => {
  assert.doesNotMatch(sql, /\bdrop policy\b/i);
  assert.doesNotMatch(sql, /\bcreate policy\b/i);
  assert.doesNotMatch(sql, /\bdisable row level security\b/i);
});

test('the six unindexed foreign keys are all covered', () => {
  for (const [table, column] of [
    ['deal_availability_confirmations', 'user_id'],
    ['notifications', 'followed_user_id'],
    ['prix', 'enseigne_code'],
    ['promo_codes', 'user_id'],
    ['shopping_deal_comments', 'user_id'],
    ['shopping_deal_votes', 'user_id'],
  ]) {
    const pattern = new RegExp(`create index if not exists \\w+\\s*\\n?\\s*on public\\.${table} \\(${column}\\)`);
    assert.match(sql, pattern, `${table}.${column} needs a covering index`);
  }
});

test('the feed indexes match the predicate the feed actually queries with', () => {
  // If the API's filter changes, these partial indexes stop being usable —
  // so the two are pinned together.
  assert.match(dealsApi, /\.or\('statut\.eq\.actif,statut\.is\.null'\)/);
  assert.match(dealsApi, /\.eq\('is_ad', false\)/);
  assert.match(dealsApi, /\.order\('is_pinned', \{ ascending: false \}\)/);

  const feedIndexes = [...sql.matchAll(/create index if not exists (idx_bons_plans_feed_\w+)([\s\S]*?);/g)];
  assert.equal(feedIndexes.length, 3);
  for (const [block, name] of feedIndexes) {
    assert.match(
      block,
      /where is_ad = false and \(statut = 'actif' or statut is null\)/,
      `${name} must be partial on the feed's own predicate`
    );
    assert.match(block, /is_pinned desc/, `${name} must lead with the pinned ordering`);
  }
});

test('indexes are idempotent so the file can be re-run', () => {
  const creates = sql.match(/create index/g) || [];
  const guarded = sql.match(/create index if not exists/g) || [];
  assert.equal(creates.length, guarded.length);
  assert.equal(guarded.length, 10);
});

test('the file says what it deliberately leaves alone', () => {
  // The seven tables with RLS disabled are a separate, human decision (§4).
  assert.match(sql, /RLS disabled[\s\S]*?bons_plans, commentaires, prix, produits/);
});
