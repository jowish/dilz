import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const read = (...parts) => readFile(path.join(process.cwd(), ...parts), 'utf8');
const [api, feedApi, detail, sql, card] = await Promise.all([
  read('pages', 'api', 'deal-availability.js'),
  read('pages', 'api', 'bons-plans.js'),
  read('pages', 'deal', '[id].js'),
  read('supabase-deal-lifecycle-setup.sql'),
  read('components', 'deals', 'DealCard.js'),
]);

test('recording availability requires a signed-in user, checked before anything else', () => {
  // 401 for an anonymous caller rather than a 500 that leaks server config.
  const postBlock = api.slice(api.indexOf("req.method === 'POST'"));
  const authIndex = postBlock.indexOf('Sign in to confirm availability.');
  const configIndex = postBlock.indexOf('SUPABASE_SERVICE_KEY is required');
  assert.ok(authIndex > 0 && configIndex > 0);
  assert.ok(authIndex < configIndex, 'the auth check must come before the config check');
  assert.match(api, /supabaseAdmin\.auth\.getUser\(token\)/);
});

test('the answer is validated and stored one row per user per deal', () => {
  assert.match(api, /typeof available !== 'boolean'/);
  assert.match(api, /Number\.isSafeInteger\(dealId\)/);
  // Upsert on the composite key: answering again updates the same row, so one
  // person cannot stack reports to bury a deal.
  assert.match(api, /onConflict: 'bon_plan_id,user_id'/);
});

test('expired deals drop out of the active feed but stay reachable', () => {
  assert.match(feedApi, /include_expired/);
  assert.match(feedApi, /date_fin\.is\.null,date_fin\.gte\./);
});

test('the deal page asks the community whether a deal is still available', () => {
  assert.match(detail, /Still available\?/);
  assert.match(detail, /submitAvailability\(true\)/);
  assert.match(detail, /submitAvailability\(false\)/);
  assert.match(detail, /lifecycleLabel\(deal, \{ lang \}\)/);
});

test('the card shows lifecycle status instead of a bare age', () => {
  assert.match(card, /lifecycleLabel\(deal, \{ lang \}\)/);
  assert.match(card, /dilz-deal-freshness/);
});

test('the schema is additive and keeps existing rows valid', () => {
  // Every new column is nullable or defaulted, so existing deals stay legal.
  assert.match(sql, /ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS availability_no_count INTEGER NOT NULL DEFAULT 0/);
  assert.match(sql, /lifecycle_override IN \('active', 'expired'\)/);
  // Moderation status is a different dimension and must not be repurposed.
  // Checked against executable SQL only — the prose above mentions `statut`
  // precisely to explain why it is left alone.
  const statements = sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');
  assert.doesNotMatch(statements, /statut/);
  assert.doesNotMatch(statements, /DROP COLUMN/);
  // Row level security must be on, with per-user write policies.
  assert.match(sql, /ALTER TABLE deal_availability_confirmations ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /auth\.uid\(\) = user_id/);
  assert.match(sql, /UNIQUE \(bon_plan_id, user_id\)/);
});
