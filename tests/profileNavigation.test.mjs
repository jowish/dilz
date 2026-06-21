import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProfileView, profileBackFallback, profileViewVisibility } from '../lib/profileNavigation.js';

test('profile routes expose isolated deals and settings views', () => {
  assert.deepEqual(profileViewVisibility('deals'), { view: 'deals', showDeals: true, showSettings: false });
  assert.deepEqual(profileViewVisibility('settings'), { view: 'settings', showDeals: false, showSettings: true });
  assert.deepEqual(profileViewVisibility('all'), { view: 'all', showDeals: true, showSettings: true });
});

test('invalid and array profile query values are normalized', () => {
  assert.equal(normalizeProfileView('map'), 'all');
  assert.equal(normalizeProfileView(['settings', 'deals']), 'settings');
});

test('profile back navigation uses browser history and only falls back when empty', () => {
  assert.equal(profileBackFallback(3), null);
  assert.equal(profileBackFallback(1), '/?tab=profile');
});
