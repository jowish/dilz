import test from 'node:test';
import assert from 'node:assert/strict';
import { bottomNavActiveItem, bottomNavPanelState, dealViewState, mainDealViewState, sortDealsForView } from '../lib/navigationState.js';

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

test('Alerts selection takes precedence over the menu overlay', () => {
  assert.equal(bottomNavActiveItem({ activeTab: 'deals', menuOpen: true, alertsOpen: true }), 'alerts');
  assert.equal(bottomNavActiveItem({ activeTab: 'deals', menuOpen: true }), 'menu');
});

test('bottom navigation selects Post while the post screen is open', () => {
  assert.equal(bottomNavActiveItem({ activeTab: 'deals', postOpen: true }), 'post');
});

for (const destination of ['menu', 'deals', 'post', 'alerts', 'profile']) {
  test(`navigating to ${destination} closes unrelated transient screens`, () => {
    const state = bottomNavPanelState(destination, { authenticated: true });
    assert.equal(state.cityOpen, false);
    assert.equal(state.notificationsOpen, false);
    assert.equal(state.promoOpen, false);
    assert.equal(state.menuOpen, destination === 'menu');
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
