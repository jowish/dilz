const test = require('node:test');
const assert = require('node:assert/strict');
const { buildFollowerNotifications, normalizeFollowSuggestions } = require('../lib/userFollows');

test('follow suggestions deduplicate authors and exclude the current user', () => {
  const users = normalizeFollowSuggestions([
    { auteur_id: 'me', auteur_nom: 'Me' },
    { auteur_id: 'a', auteur_nom: 'Alice' },
    { auteur_id: 'a', auteur_nom: 'Alice' },
    { auteur_id: 'b', auteur_nom: 'Bob' },
  ], [{ followed_user_id: 'b', followed_name: 'Bob' }], 'me');
  assert.deepEqual(users, [
    { id: 'a', name: 'Alice', is_following: false },
    { id: 'b', name: 'Bob', is_following: true },
  ]);
});

test('one author publication creates one notification per follower', () => {
  const rows = buildFollowerNotifications(
    { id: 42, auteur_id: 'author', auteur_nom: 'Alice', titre: 'Great deal' },
    [{ follower_id: 'u1' }, { follower_id: 'u2' }, { follower_id: 'author' }],
  );
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map((row) => row.user_id), ['u1', 'u2']);
  assert.ok(rows.every((row) => row.notification_type === 'follow' && row.alert_id === null));
});

test('buildFollowerNotifications returns empty array when deal has no id', () => {
  const rows = buildFollowerNotifications(
    { auteur_id: 'author', titre: 'Deal without id' },
    [{ follower_id: 'u1' }],
  );
  assert.deepEqual(rows, []);
});

test('buildFollowerNotifications returns empty array when deal has no auteur_id', () => {
  const rows = buildFollowerNotifications(
    { id: 99, titre: 'Anonymous deal' },
    [{ follower_id: 'u1' }],
  );
  assert.deepEqual(rows, []);
});

test('buildFollowerNotifications falls back when deal has no title', () => {
  const rows = buildFollowerNotifications(
    { id: 1, auteur_id: 'author' },
    [{ follower_id: 'u1' }],
  );
  assert.equal(rows[0].message, 'Open the new deal');
});

test('normalizeFollowSuggestions includes followed users not present in any deal', () => {
  const users = normalizeFollowSuggestions(
    [],
    [{ followed_user_id: 'a', followed_name: 'Alice' }],
    'me',
  );
  assert.deepEqual(users, [{ id: 'a', name: 'Alice', is_following: true }]);
});

test('normalizeFollowSuggestions falls back to "Dilz member" for unnamed deal authors', () => {
  const users = normalizeFollowSuggestions(
    [{ auteur_id: 'x', auteur_nom: null }],
    [],
    'other',
  );
  assert.equal(users[0].name, 'Dilz member');
});
