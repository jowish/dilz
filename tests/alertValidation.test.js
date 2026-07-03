const test = require('node:test');
const assert = require('node:assert/strict');
const {
  MAX_ALERTS_PER_USER,
  cleanOptionalText,
  hasReachedAlertLimit,
  normalizeAlertInput,
} = require('../lib/alertValidation');

test('normalizes all supported alert criteria', () => {
  const result = normalizeAlertInput({ city: ' Tel Aviv ', category: ' Fashion ', online_only: 1, min_discount_percent: '25', keyword: ' shoes ' });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.value, { city: 'Tel Aviv', category: 'Fashion', online_only: true, min_discount_percent: 25, keyword: 'shoes' });
});

for (const value of [undefined, null, '', '   ']) {
  test(`rejects an alert without criteria: ${String(value)}`, () => {
    const result = normalizeAlertInput({ city: value, category: value, keyword: value, min_discount_percent: value });
    assert.ok(result.errors.includes('At least one alert criterion is required.'));
  });
}

for (const value of [-1, 101, 'abc', Infinity, NaN]) {
  test(`rejects invalid discount ${String(value)}`, () => {
    const result = normalizeAlertInput({ min_discount_percent: value });
    assert.ok(result.errors.includes('min_discount_percent must be between 0 and 100.'));
  });
}

for (const value of [0, 0.5, 50, 100, '30']) {
  test(`accepts valid discount ${String(value)}`, () => {
    const result = normalizeAlertInput({ min_discount_percent: value });
    assert.deepEqual(result.errors, []);
    assert.equal(result.value.min_discount_percent, Number(value));
  });
}

test('truncates city and keyword to database limits', () => {
  const result = normalizeAlertInput({ city: 'c'.repeat(150), keyword: 'k'.repeat(120) });
  assert.equal(result.value.city.length, 100);
  assert.equal(result.value.keyword.length, 80);
});

test('online-only is a valid standalone criterion', () => {
  const result = normalizeAlertInput({ online_only: true });
  assert.deepEqual(result.errors, []);
  assert.equal(result.value.online_only, true);
});

test('category is a valid standalone alert criterion', () => {
  const result = normalizeAlertInput({ category: 'Other' });
  assert.deepEqual(result.errors, []);
  assert.equal(result.value.category, 'Other');
});

test('rejects unsupported alert categories', () => {
  const result = normalizeAlertInput({ category: 'Furniture' });
  assert.ok(result.errors.includes('category is not supported.'));
});

test('optional text converts non-string values safely', () => {
  assert.equal(cleanOptionalText(123, 10), '123');
  assert.equal(cleanOptionalText(false, 10), 'false');
  assert.equal(cleanOptionalText('  ', 10), null);
});

for (const [count, reached] of [[0, false], [19, false], [20, true], [21, true], ['20', true], [null, false]]) {
  test(`alert limit for ${String(count)} is ${reached}`, () => {
    assert.equal(hasReachedAlertLimit(count), reached);
  });
}

test('exports the expected per-user alert limit', () => {
  assert.equal(MAX_ALERTS_PER_USER, 20);
});
