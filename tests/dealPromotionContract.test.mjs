import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const read = (...parts) => readFile(path.join(process.cwd(), ...parts), 'utf8');

const [migration, readme, api, comments, dealCard, dealPage, home] = await Promise.all([
  read('supabase-deal-promotion-setup.sql'),
  read('README.md'),
  read('pages', 'api', 'bons-plans.js'),
  read('pages', 'api', 'commentaires.js'),
  read('components', 'deals', 'DealCard.js'),
  read('pages', 'deal', '[id].js'),
  read('pages', 'index.js'),
]);

test('migration adds is_pinned and is_ad as not-null booleans defaulting to false, schema only', () => {
  assert.match(migration, /ALTER TABLE bons_plans ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE/);
  assert.match(migration, /ALTER TABLE bons_plans ADD COLUMN IF NOT EXISTS is_ad BOOLEAN NOT NULL DEFAULT FALSE/);
  assert.doesNotMatch(migration, /CREATE POLICY|ALTER POLICY|DROP POLICY|ROW LEVEL SECURITY/i);
});

test('README lists the new setup file so local setup stays runnable end to end', () => {
  assert.match(readme, /supabase-deal-promotion-setup\.sql/);
});

test('the deals GET query sorts pinned deals first in every sort mode and excludes ads from the paginated result', () => {
  assert.match(api, /\.eq\('is_ad', false\)\s*\n\s*\.order\('is_pinned', \{ ascending: false \}\);/);
});

test('ads are fetched separately (independent of sort/pagination) only on the first page', () => {
  assert.match(api, /if \(responseOffset === 0\) \{/);
  assert.match(api, /\.eq\('is_ad', true\)/);
  assert.match(api, /ads: \[\.\.\.array\]|ads,/);
});

test('voting rejects an is_ad deal server-side, before the vote RPC ever runs', () => {
  const voteAction = api.slice(api.indexOf("action === 'vote'"), api.indexOf("action === 'edit'"));
  // Extended to also select auteur_id in issue #45, to recompute the
  // author's contribution points after a vote — is_ad is still the first
  // field selected and still checked before the vote RPC below.
  assert.match(voteAction, /\.select\('is_ad,auteur_id'\)/);
  assert.match(voteAction, /if \(targetDeal\?\.is_ad\) \{\s*return res\.status\(403\)/);
  // The is_ad check must run before the vote RPC call, not after.
  assert.ok(voteAction.indexOf('is_ad') < voteAction.indexOf('cast_bon_plan_vote'));
});

test('commenting rejects an is_ad deal server-side, before the comment insert ever runs', () => {
  assert.match(comments, /\.select\('is_ad'\)/);
  assert.match(comments, /if \(targetDeal\?\.is_ad\) \{\s*return res\.status\(403\)/);
  assert.ok(comments.indexOf('is_ad') < comments.indexOf('.insert([rowWithId])'));
});

test('DealCard shows a subtle sponsored tag (not the author line) and hides vote/save/share for an ad deal', () => {
  assert.match(dealCard, /const isAd = Boolean\(deal\.is_ad\)/);
  assert.match(dealCard, /const renderSaveButton = \(\) => \(onSave && !isAd\)/);
  assert.match(dealCard, /\{!isAd && \(\s*<div className="dilz-deal-card__actions"/);
  // Superseded by issue #33: no more bold "Sponsored" text replacing the
  // author line — see dealAdIndicator.test.mjs for the current contract.
  assert.doesNotMatch(dealCard, /const authorName = isAd \? text\.sponsored/);
});

test('the deal detail page also hides vote/save/share/comment controls for an ad deal', () => {
  assert.match(dealPage, /\{!deal\.is_ad && \(/);
  assert.match(dealPage, /sponsored: 'Sponsored'/);
  assert.match(dealPage, /deal\.is_ad \? \(\s*<strong>\{text\.sponsored\}<\/strong>/);
});

test('the home feed composes pinned/ad ordering from a separately fetched ad pool', () => {
  assert.match(home, /import \{ composeFeedWithPinnedAndAds \} from '\.\.\/lib\/feedComposition'/);
  assert.match(home, /const \[ads, setAds\] = useState\(\[\]\)/);
  assert.match(home, /const composedDeals = composeFeedWithPinnedAndAds\(visibleDeals, ads\)/);
  // The composed (pinned+ad) array drives rendering, but pagination/empty-state
  // logic still reads the uncomposed visibleDeals — ads must never affect
  // hasMore/dealTotal/empty-state calculations.
  assert.match(home, /\{composedDeals\.map\(deal => \(/);
  assert.match(home, /key=\{deal\._feedKey \|\| deal\.id\}/);
});
