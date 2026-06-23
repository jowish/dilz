const test = require('node:test');
const assert = require('node:assert/strict');
const { moderateFields, moderateUserText } = require('../lib/contentModeration');

test('allows ordinary deal and comment content', () => {
  assert.equal(moderateUserText('Great price on coffee this week').allowed, true);
  assert.equal(moderateFields(['Coffee deal', 'Available until Friday', 'Local store']).allowed, true);
});

test('rejects clearly prohibited content', () => {
  const result = moderateUserText('You should kill yourself');
  assert.equal(result.allowed, false);
  assert.match(result.reason, /community rules/i);
});

test('rejects repeated-link spam', () => {
  const result = moderateUserText('https://a.test https://b.test https://c.test https://d.test');
  assert.equal(result.allowed, false);
  assert.match(result.reason, /links/i);
});

test('rejects Hebrew prohibited content', () => {
  assert.equal(moderateUserText('תתאבד').allowed, false);
  assert.equal(moderateUserText('נאצי').allowed, false);
  assert.equal(moderateUserText('פורנו').allowed, false);
  assert.equal(moderateUserText('אונס').allowed, false);
});

test('allows empty and whitespace-only text', () => {
  assert.equal(moderateUserText('').allowed, true);
  assert.equal(moderateUserText('   ').allowed, true);
  assert.equal(moderateUserText(null).allowed, true);
});

test('moderateFields stops at the first violating field', () => {
  const result = moderateFields(['Normal text', 'kill yourself', 'More normal text']);
  assert.equal(result.allowed, false);
  assert.match(result.reason, /community rules/i);
});

test('moderateFields allows all fields when none violate rules', () => {
  assert.equal(moderateFields(['Coffee deal', '50% off', 'Tel Aviv store']).allowed, true);
});
