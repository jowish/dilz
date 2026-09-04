import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  ACTIVE, VERIFIED, POSSIBLY_EXPIRED, EXPIRED,
  deriveLifecycle, lifecycleLabel,
} = require(path.join(process.cwd(), 'lib', 'dealLifecycle.js'));

const NOW = Date.parse('2026-09-04T12:00:00Z');
const hoursAgo = (h) => new Date(NOW - h * 3600000).toISOString();

test('a plain deal with no signals is ACTIVE', () => {
  assert.equal(deriveLifecycle({}, { now: NOW }), ACTIVE);
  assert.equal(deriveLifecycle({ created_at: hoursAgo(24 * 75) }, { now: NOW }), ACTIVE);
});

test('a recent positive check makes it VERIFIED, and it decays back to ACTIVE', () => {
  assert.equal(deriveLifecycle({ last_verified_at: hoursAgo(2) }, { now: NOW }), VERIFIED);
  assert.equal(deriveLifecycle({ last_verified_at: hoursAgo(23) }, { now: NOW }), VERIFIED);
  assert.equal(deriveLifecycle({ last_verified_at: hoursAgo(30) }, { now: NOW }), ACTIVE);
});

test('an end date in the past is EXPIRED', () => {
  assert.equal(deriveLifecycle({ date_fin: '2026-09-03' }, { now: NOW }), EXPIRED);
  assert.equal(deriveLifecycle({ date_fin: '2026-09-04' }, { now: NOW }), ACTIVE, 'ends today is still live');
  assert.equal(deriveLifecycle({ date_fin: '2026-12-01' }, { now: NOW }), ACTIVE);
});

test('a single "not available" report never expires a deal', () => {
  const deal = { availability_no_count: 1, last_reported_unavailable_at: hoursAgo(1) };
  assert.equal(deriveLifecycle(deal, { now: NOW }), ACTIVE);
});

test('repeated "not available" reports flag it as POSSIBLY_EXPIRED, never EXPIRED', () => {
  const deal = { availability_no_count: 2, last_reported_unavailable_at: hoursAgo(1) };
  assert.equal(deriveLifecycle(deal, { now: NOW }), POSSIBLY_EXPIRED);
  const many = { availability_no_count: 25, last_reported_unavailable_at: hoursAgo(1) };
  assert.equal(deriveLifecycle(many, { now: NOW }), POSSIBLY_EXPIRED);
});

test('a later positive check clears earlier doubt', () => {
  const deal = {
    availability_no_count: 3,
    last_reported_unavailable_at: hoursAgo(10),
    last_verified_at: hoursAgo(1),
  };
  assert.equal(deriveLifecycle(deal, { now: NOW }), VERIFIED);
});

test('an admin decision overrides everything, in both directions', () => {
  assert.equal(deriveLifecycle({ lifecycle_override: 'expired', last_verified_at: hoursAgo(1) }, { now: NOW }), EXPIRED);
  // Brings a deal back even though its end date has passed (data-entry fix).
  assert.equal(deriveLifecycle({ lifecycle_override: 'active', date_fin: '2020-01-01' }, { now: NOW }), ACTIVE);
});

test('labels are meaningful status, not a bare age', () => {
  assert.equal(lifecycleLabel({ last_verified_at: hoursAgo(1) }, { now: NOW }), 'Verified today');
  assert.equal(lifecycleLabel({ last_verified_at: hoursAgo(40) }, { now: NOW }), 'Active · checked 1d ago');
  assert.equal(lifecycleLabel({ availability_no_count: 2, last_reported_unavailable_at: hoursAgo(1) }, { now: NOW }), 'Possibly expired');
  assert.equal(lifecycleLabel({ date_fin: '2020-01-01' }, { now: NOW }), 'Expired');
  assert.equal(lifecycleLabel({}, { now: NOW }), 'Active');
});

test('labels are translated for Hebrew', () => {
  assert.equal(lifecycleLabel({ date_fin: '2020-01-01' }, { now: NOW, lang: 'he' }), 'פג תוקף');
  assert.equal(lifecycleLabel({ availability_no_count: 2, last_reported_unavailable_at: hoursAgo(1) }, { now: NOW, lang: 'he' }), 'ייתכן שפג תוקף');
  assert.equal(lifecycleLabel({ last_verified_at: hoursAgo(1) }, { now: NOW, lang: 'he' }), 'אומת היום');
  assert.equal(lifecycleLabel({}, { now: NOW, lang: 'he' }), 'פעיל');
});

test('existing rows without any of the new columns still behave', () => {
  const legacy = { id: 1, titre: 'x', prix: 10, created_at: hoursAgo(24 * 200) };
  assert.equal(deriveLifecycle(legacy, { now: NOW }), ACTIVE);
  assert.equal(lifecycleLabel(legacy, { now: NOW }), 'Active');
});
