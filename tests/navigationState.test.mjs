import test from 'node:test';
import assert from 'node:assert/strict';
import { bottomNavActiveItem, bottomNavPanelState, dealViewState, mainDealViewState, resolveDealLayout, resolveDealSort, sortDealsForView } from '../lib/navigationState.js';

test('returning to the main Dilz view restores the saved latest preference', () => {
  const temporaryView = dealViewState('comments', 'latest');
  assert.equal(temporaryView.sort, 'comments');

  const mainView = mainDealViewState('latest');
  assert.deepEqual(mainView, {
    category: 'all',
    collection: 'all',
    myDealsOnly: false,
    sort: 'latest',
  });
});

test('main Dilz view normalizes an invalid saved preference', () => {
  assert.equal(mainDealViewState('nearby').sort, 'hot');
});

test('current session sort wins when returning from Account to Dilz', () => {
  assert.equal(resolveDealSort({ sessionSort: 'ending', preferredSort: 'latest' }), 'ending');
});

test('account setting is restored when a new session has no selected sort', () => {
  assert.equal(resolveDealSort({ sessionSort: null, preferredSort: 'latest' }), 'latest');
});

test('an explicit URL sort wins over session and account defaults', () => {
  assert.equal(resolveDealSort({ requestedSort: 'comments', sessionSort: 'ending', preferredSort: 'latest' }), 'comments');
});

test('saved list layout is used unless the URL explicitly selects cards', () => {
  assert.equal(resolveDealLayout({ savedLayout: 'list' }), 'list');
  assert.equal(resolveDealLayout({ requestedLayout: 'card', savedLayout: 'list' }), 'card');
});

test('latest view orders the newest Dilz first regardless of API response order', () => {
  const deals = [
    { id: 1, created_at: '2026-06-18T08:00:00.000Z' },
    { id: 2, created_at: '2026-06-21T08:00:00.000Z' },
    { id: 3, created_at: '2026-06-20T08:00:00.000Z' },
  ];
  assert.deepEqual(sortDealsForView(deals, 'latest').map((deal) => deal.id), [2, 3, 1]);
  assert.deepEqual(deals.map((deal) => deal.id), [1, 2, 3]);
});

test('bottom navigation selects Alerts while the alerts panel is open', () => {
  assert.equal(bottomNavActiveItem({ activeTab: 'deals', alertsOpen: true }), 'alerts');
});

test('bottom navigation returns to the active page after Alerts closes', () => {
  assert.equal(bottomNavActiveItem({ activeTab: 'deals', alertsOpen: false }), 'deals');
  assert.equal(bottomNavActiveItem({ activeTab: 'profile' }), 'profile');
});

test('Alerts selection takes precedence over the legacy menu overlay', () => {
  assert.equal(bottomNavActiveItem({ activeTab: 'deals', menuOpen: true, alertsOpen: true }), 'alerts');
  assert.equal(bottomNavActiveItem({ activeTab: 'deals', menuOpen: true }), 'explore');
});

test('bottom navigation selects Post while the post screen is open', () => {
  assert.equal(bottomNavActiveItem({ activeTab: 'deals', postOpen: true }), 'post');
});

for (const destination of ['explore', 'deals', 'post', 'alerts', 'profile']) {
  test(`navigating to ${destination} closes unrelated transient screens`, () => {
    const state = bottomNavPanelState(destination, { authenticated: true });
    assert.equal(state.cityOpen, false);
    assert.equal(state.notificationsOpen, false);
    assert.equal(state.promoOpen, false);
    assert.equal(state.menuOpen, false);
    assert.equal(state.postOpen, destination === 'post');
    assert.equal(state.alertsOpen, destination === 'alerts');
  });
}

test('moving from Alerts to Dilz closes Alerts immediately', () => {
  const state = bottomNavPanelState('deals', { authenticated: true });
  assert.equal(state.alertsOpen, false);
  assert.equal(state.postOpen, false);
});

test('moving from Post to Profile closes the post screen immediately', () => {
  const state = bottomNavPanelState('profile', { authenticated: true });
  assert.equal(state.postOpen, false);
  assert.equal(state.alertsOpen, false);
});

test('unauthenticated Alerts navigation closes panels and requests authentication', () => {
  const state = bottomNavPanelState('alerts', { authenticated: false });
  assert.equal(state.alertsOpen, false);
  assert.equal(state.postOpen, false);
  assert.equal(state.requiresAuth, true);
});

test('comments sort orders by vote count descending then by date as tiebreaker', () => {
  const deals = [
    { id: 1, commentaires: [{ count: 5 }], created_at: '2026-06-20T00:00:00Z' },
    { id: 2, commentaires: [{ count: 10 }], created_at: '2026-06-18T00:00:00Z' },
    { id: 3, commentaires: [{ count: 5 }], created_at: '2026-06-21T00:00:00Z' },
  ];
  assert.deepEqual(sortDealsForView(deals, 'comments').map((d) => d.id), [2, 3, 1]);
  assert.deepEqual(deals.map((d) => d.id), [1, 2, 3]);
});

test('comments sort handles missing commentaires without throwing', () => {
  const deals = [{ id: 1 }, { id: 2, commentaires: [{ count: 3 }] }];
  assert.deepEqual(sortDealsForView(deals, 'comments').map((d) => d.id), [2, 1]);
});

test('hot and unknown sorts return deals in their original order', () => {
  const deals = [{ id: 1 }, { id: 2 }, { id: 3 }];
  assert.deepEqual(sortDealsForView(deals, 'hot').map((d) => d.id), [1, 2, 3]);
  assert.deepEqual(sortDealsForView(deals, 'nearby').map((d) => d.id), [1, 2, 3]);
});

test('dealViewState sets myDealsOnly for the mine view', () => {
  const state = dealViewState('mine');
  assert.equal(state.myDealsOnly, true);
  assert.equal(state.sort, 'hot');
});

test('dealViewState maps a deal category viewId to a category filter', () => {
  const state = dealViewState('Food');
  assert.equal(state.category, 'Food');
  assert.equal(state.myDealsOnly, false);
  assert.equal(state.sort, 'hot');
});

test('dealViewState returns all-deals state for the "all" viewId', () => {
  const state = dealViewState('all');
  assert.equal(state.category, 'all');
  assert.equal(state.myDealsOnly, false);
});

test('resolveDealLayout accepts compact, list and spotlight as saved preferences', () => {
  assert.equal(resolveDealLayout({ savedLayout: 'compact' }), 'compact');
  assert.equal(resolveDealLayout({ savedLayout: 'list' }), 'list');
  assert.equal(resolveDealLayout({ savedLayout: 'spotlight' }), 'spotlight');
  assert.equal(resolveDealLayout({ requestedLayout: 'spotlight', savedLayout: 'list' }), 'spotlight');
  assert.equal(resolveDealLayout({ savedLayout: 'unknown' }), 'card');
});
