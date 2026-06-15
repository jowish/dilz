const test = require('node:test');
const assert = require('node:assert/strict');

const { getAdminToken, secretsMatch } = require('../lib/adminAuth');

test('reads an admin token from the authorization header', () => {
  assert.equal(getAdminToken({ headers: { authorization: 'Bearer secret' } }), 'secret');
});

test('supports the dedicated admin header', () => {
  assert.equal(getAdminToken({ headers: { 'x-admin-token': 'secret' } }), 'secret');
});

test('compares secrets without accepting missing or partial values', () => {
  assert.equal(secretsMatch('secret', 'secret'), true);
  assert.equal(secretsMatch('secre', 'secret'), false);
  assert.equal(secretsMatch('', 'secret'), false);
});
