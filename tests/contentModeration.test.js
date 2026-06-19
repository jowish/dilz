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
