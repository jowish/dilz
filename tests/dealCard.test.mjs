import test from 'node:test';
import assert from 'node:assert/strict';
import { formatPrice, getDiscount, timeAgo, timeRemaining } from '../lib/dealCard.js';

// ─── getDiscount ───────────────────────────────────────────────────────────────

test('getDiscount returns null when no original price is set', () => {
  assert.equal(getDiscount({ prix: 50 }), null);
});

test('getDiscount computes 100% for a free item with an original price', () => {
  assert.equal(getDiscount({ prix: 0, prix_original: 100 }), 100);
});

test('getDiscount returns null when current price equals or exceeds original', () => {
  assert.equal(getDiscount({ prix: 100, prix_original: 100 }), null);
  assert.equal(getDiscount({ prix: 120, prix_original: 100 }), null);
});

for (const [current, original, expected] of [
  [50, 100, 50],
  [75, 100, 25],
  [99, 100, 1],
  ['50', '100', 50],
]) {
  test(`getDiscount computes ${expected}% for ${current}/${original}`, () => {
    assert.equal(getDiscount({ prix: current, prix_original: original }), expected);
  });
}

// ─── formatPrice ──────────────────────────────────────────────────────────────

test('formatPrice formats integers without a decimal point', () => {
  assert.equal(formatPrice(100), '100');
  assert.equal(formatPrice(0), '0');
});

test('formatPrice formats decimals to exactly two places', () => {
  assert.equal(formatPrice(9.9), '9.90');
  assert.equal(formatPrice(10.55), '10.55');
});

test('formatPrice inserts thousand separators for large numbers', () => {
  assert.equal(formatPrice(1234567), '1,234,567');
});

for (const value of ['abc', undefined, NaN, Infinity]) {
  test(`formatPrice returns empty string for ${String(value)}`, () => {
    assert.equal(formatPrice(value), '');
  });
}

// Number(null) === 0, so null formats as '0' rather than ''
test('formatPrice formats null as zero', () => {
  assert.equal(formatPrice(null), '0');
});

// ─── timeRemaining ────────────────────────────────────────────────────────────

test('timeRemaining returns null for a missing end date', () => {
  assert.equal(timeRemaining(null, 'en'), null);
  assert.equal(timeRemaining(undefined, 'en'), null);
  assert.equal(timeRemaining('', 'en'), null);
});

test('timeRemaining returns "Expired" for a past date', () => {
  assert.equal(timeRemaining('2020-01-01', 'en'), 'Expired');
  assert.equal(timeRemaining('2020-01-01', 'he'), 'פג תוקף');
});

function dateInDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

test('timeRemaining returns a short countdown for near-future deals', () => {
  // A deal ending today has ~0.5–1 day left due to Math.ceil, giving "Ends in 1d"
  const resultEn = timeRemaining(dateInDays(0), 'en');
  assert.match(resultEn, /^Ends in \d+d$/);

  const resultHe = timeRemaining(dateInDays(0), 'he');
  assert.match(resultHe, /^מסתיים בעוד \d+ ימים$/);
});

test('timeRemaining returns a formatted date for deals more than 3 days away', () => {
  const enResult = timeRemaining(dateInDays(10), 'en');
  assert.ok(enResult.startsWith('Ends ') && !enResult.includes(' in '), `Got: "${enResult}"`);

  const heResult = timeRemaining(dateInDays(10), 'he');
  assert.ok(heResult.startsWith('מסתיים ב-'), `Got: "${heResult}"`);
});

// ─── timeAgo ──────────────────────────────────────────────────────────────────

test('timeAgo returns "Just now" for events less than one hour ago', () => {
  const recent = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  assert.equal(timeAgo(recent, 'en'), 'Just now');
  assert.equal(timeAgo(recent, 'he'), 'עכשיו');
});

test('timeAgo returns hours ago for events within the same day', () => {
  const twoHoursAgo = new Date(Date.now() - 2 * 3600000).toISOString();
  assert.equal(timeAgo(twoHoursAgo, 'en'), '2h ago');
  assert.equal(timeAgo(twoHoursAgo, 'he'), 'לפני 2 שעות');
});

test('timeAgo returns days ago for events older than 24 hours', () => {
  const yesterday = new Date(Date.now() - 25 * 3600000).toISOString();
  assert.equal(timeAgo(yesterday, 'en'), '1d ago');
  assert.equal(timeAgo(yesterday, 'he'), 'לפני 1 ימים');
});
