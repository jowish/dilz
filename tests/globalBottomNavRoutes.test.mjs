import test from 'node:test';
import assert from 'node:assert/strict';
import { activeFromPath, shouldShowNav } from '../lib/globalBottomNavRoutes.mjs';

test('global bottom nav maps every public app surface to the expected active tab', () => {
  const cases = [
    ['/', 'deals'],
    ['/?tab=profile', 'profile'],
    ['/?tab=search', 'deals'],
    ['/map', 'deals'],
    ['/deal/123', 'deals'],
    ['/alerts', 'alerts'],
    ['/post', 'post'],
    ['/profil', 'profile'],
    ['/profil?view=settings', 'profile'],
    ['/user/abc-123', 'profile'],
    ['/explore', 'explore'],
    ['/bons-plans', 'explore'],
    ['/bons-plans-shopping', 'explore'],
    ['/codes-promo', 'explore'],
    ['/gratuit', 'explore'],
    ['/shopping-deal/super-sale', 'explore'],
  ];

  for (const [path, active] of cases) {
    assert.equal(activeFromPath(path), active, `${path} should activate ${active}`);
  }
});

test('global bottom nav stays visible on nested app routes but hidden on non-app surfaces', () => {
  const visibleRoutes = [
    '/',
    '/?tab=profile',
    '/alerts',
    '/post',
    '/profil?view=deals',
    '/user/abc-123',
    '/explore',
    '/bons-plans-shopping',
    '/codes-promo',
    '/gratuit',
    '/map',
    '/deal/123',
    '/shopping-deal/super-sale',
  ];

  for (const route of visibleRoutes) {
    assert.equal(shouldShowNav(route), true, `${route} should keep the bottom nav visible`);
  }

  const hiddenRoutes = [
    '/admin',
    '/auth',
    '/privacy',
    '/terms',
    '/support',
    '/api/bons-plans',
    '/shopping',
  ];

  for (const route of hiddenRoutes) {
    assert.equal(shouldShowNav(route), false, `${route} should not show the app bottom nav`);
    assert.equal(activeFromPath(route), null, `${route} should not resolve an active app tab`);
  }
});

test('route helper falls back from asPath to pathname for router transition states', () => {
  assert.equal(activeFromPath('', '/alerts'), 'alerts');
  assert.equal(activeFromPath('', '/post'), 'post');
  assert.equal(activeFromPath('', '/user/[id]'), 'profile');
  assert.equal(shouldShowNav('', '/profil'), true);
  assert.equal(shouldShowNav('', '/user/[id]'), true);
  assert.equal(shouldShowNav('', '/auth'), false);
});
