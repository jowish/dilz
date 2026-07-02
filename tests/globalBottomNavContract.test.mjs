import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const read = (...parts) => readFile(path.join(process.cwd(), ...parts), 'utf8');

const [
  globalNav,
  bottomNav,
  app,
  home,
  explore,
  alerts,
  post,
  routeHelpers,
] = await Promise.all([
  read('components', 'layout', 'GlobalBottomNav.js'),
  read('components', 'layout', 'BottomNav.js'),
  read('pages', '_app.js'),
  read('pages', 'index.js'),
  read('pages', 'explore.js'),
  read('pages', 'alerts.js'),
  read('pages', 'post.js'),
  read('lib', 'globalBottomNavRoutes.mjs'),
]);

test('bottom navigation is mounted globally exactly once, outside route pages', () => {
  assert.match(app, /import \{ GlobalBottomNav \} from '\.\.\/components\/layout\/GlobalBottomNav'/);
  assert.match(app, /<Component \{\.\.\.pageProps\} \/>\s*<GlobalBottomNav \/>/);
  assert.equal((app.match(/<GlobalBottomNav \/>/g) || []).length, 1);
  for (const page of [home, explore, alerts, post]) {
    assert.doesNotMatch(page, /<BottomNav/);
    assert.doesNotMatch(page, /components\/layout\/BottomNav/);
  }
});

test('global bottom navigation stays visible across app routes and submenus', () => {
  for (const route of ["'/'", "'/explore'", "'/alerts'", "'/post'", "'/profil'", "'/map'", "'/bons-plans-shopping'", "'/codes-promo'", "'/gratuit'", "'/scan'"]) {
    assert.ok(routeHelpers.includes(route), `missing nav route ${route}`);
  }
  assert.match(globalNav, /import \{ activeFromPath, shouldShowNav \} from '\.\.\/\.\.\/lib\/globalBottomNavRoutes\.mjs'/);
  assert.match(routeHelpers, /const NAV_PREFIXES = \['\/deal\/', '\/shopping-deal\/', '\/user\/'\]/);
  assert.match(routeHelpers, /return NAV_ROUTES\.has\(path\) \|\| NAV_PREFIXES\.some\(\(prefix\) => path\.startsWith\(prefix\)\)/);
  assert.match(globalNav, /if \(!visible\) return null/);
  assert.doesNotMatch(globalNav, /loadingDeals/);
  assert.doesNotMatch(globalNav, /loadingPromos/);
});

test('global bottom navigation derives the committed active tab from the URL', () => {
  assert.match(routeHelpers, /path === '\/explore' \|\| path === '\/bons-plans'[\s\S]*return 'explore'/);
  assert.match(routeHelpers, /if \(path === '\/alerts'\) return 'alerts'/);
  assert.match(routeHelpers, /if \(path === '\/post'\) return 'post'/);
  assert.match(routeHelpers, /path === '\/profil' \|\| path\.startsWith\('\/user\/'\).*return 'profile'/);
  assert.match(routeHelpers, /path === '\/map' \|\| path\.startsWith\('\/deal\/'\).*return 'deals'/);
  assert.match(routeHelpers, /new URLSearchParams\(query\)\.get\('tab'\)/);
  assert.match(routeHelpers, /return tab === 'profile' \? 'profile' : 'deals'/);
});

test('global bottom navigation responds optimistically before route loading finishes', () => {
  assert.match(globalNav, /const \[optimisticActive, setOptimisticActive\] = useState\(null\)/);
  assert.match(globalNav, /const activeTab = optimisticActive \|\| routeActive \|\| 'deals'/);
  assert.match(globalNav, /const push = \(href, active, options = \{\}\) => \{\s*setOptimisticActive\(active\);\s*router\.push\(href, undefined, options\)\.catch\(\(\) => setOptimisticActive\(null\)\);\s*\}/);
  assert.match(globalNav, /router\.events\.on\('routeChangeComplete', clearOptimistic\)/);
  assert.match(globalNav, /router\.events\.on\('routeChangeError', clearOptimistic\)/);
  assert.doesNotMatch(globalNav, /await router\.push/);
});

test('global bottom navigation keeps auth redirects and home shallow routing explicit', () => {
  assert.match(globalNav, /const homeOptions = router\.pathname === '\/' \? \{ shallow: true, scroll: false \} : undefined/);
  assert.match(globalNav, /onTab=\{\(\) => push\('\/', 'deals', homeOptions\)\}/);
  assert.match(globalNav, /onPost=\{\(\) => push\(user \? '\/post' : '\/auth\?redirect=\/post', 'post'\)\}/);
  assert.match(globalNav, /onAlerts=\{\(\) => push\(user \? '\/alerts' : '\/auth\?redirect=\/alerts', 'alerts'\)\}/);
  assert.match(globalNav, /onProfile=\{\(\) => push\('\/\?tab=profile', 'profile', homeOptions\)\}/);
});

test('global active state is still delegated to the liquid bottom nav component', () => {
  assert.match(globalNav, /<BottomNav[\s\S]*activeTab=\{activeTab\}[\s\S]*alertsOpen=\{activeTab === 'alerts'\}[\s\S]*postOpen=\{activeTab === 'post'\}/);
  assert.match(bottomNav, /aria-current=\{committed \? 'page' : undefined\}/);
});
