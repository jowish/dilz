import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const read = (...parts) => readFile(path.join(process.cwd(), ...parts), 'utf8');

const [
  css,
  app,
  globalNav,
  bottomNav,
  home,
  profile,
  dealDetail,
  map,
] = await Promise.all([
  read('styles', 'globals.css'),
  read('pages', '_app.js'),
  read('components', 'layout', 'GlobalBottomNav.js'),
  read('components', 'layout', 'BottomNav.js'),
  read('pages', 'index.js'),
  read('pages', 'profil.js'),
  read('pages', 'deal', '[id].js'),
  read('pages', 'map.js'),
]);

test('global bottom nav is independent from feed loading and mounted after every page', () => {
  assert.match(app, /<Component \{\.\.\.pageProps\} \/>\s*<GlobalBottomNav \/>/);
  assert.match(globalNav, /import \{ activeFromPath, shouldShowNav \} from '\.\.\/\.\.\/lib\/globalBottomNavRoutes\.mjs'/);
  assert.match(globalNav, /const activeTab = optimisticActive \|\| routeActive \|\| 'deals'/);
  assert.match(globalNav, /setOptimisticActive\(active\)/);
  assert.doesNotMatch(globalNav, /loadingDeals|loadingMoreDeals|hasMoreDeals|dealListEndRef/);
  assert.doesNotMatch(home, /<BottomNav/);
});

test('root scroll contract blocks desktop scroll regressions without rubber-banding past the top', () => {
  assert.match(css, /html,\s*body,\s*#__next\s*\{[^}]*min-height:\s*100%[^}]*height:\s*auto/s);
  assert.match(css, /html\s*\{[^}]*overflow-x:\s*hidden[^}]*overflow-y:\s*scroll[^}]*overscroll-behavior-y:\s*none/s);
  assert.match(css, /body,\s*#__next\s*\{\s*overflow:\s*visible;\s*\}/s);
  assert.match(css, /body\s*\{[^}]*touch-action:\s*pan-y/s);
  assert.doesNotMatch(css, /html,\s*body,\s*#__next\s*\{[^}]*height:\s*100vh/s);
  assert.doesNotMatch(css, /html,\s*body,\s*#__next\s*\{[^}]*overflow:\s*hidden/s);
  assert.doesNotMatch(css, /overscroll-behavior-y:\s*auto/);
});

test('recent header fixes stay aligned and free of duplicate profile/theme controls', () => {
  assert.match(dealDetail, /className="dilz-app-header dilz-deal-header"/);
  assert.match(css, /\.dilz-deal-header \.dilz-app-header__inner\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:\s*minmax\(72px,\s*1fr\) auto minmax\(72px,\s*1fr\)/s);
  assert.match(css, /\.dilz-deal-header \.dilz-logo-button\s*\{[^}]*justify-self:\s*center/s);
  assert.match(profile, /className="dilz-app-header dilz-profil-header"/);
  assert.match(profile, /className="dilz-profil-header-actions" aria-hidden="true"/);
  assert.doesNotMatch(profile, /ThemeToggle/);
  assert.doesNotMatch(profile, /dilz-theme-toggle/);
});

test('deal feed pagination keeps initial render small and loads more through the sentinel', () => {
  assert.match(home, /const DEAL_PAGE_SIZE = 25/);
  assert.match(home, /params\.set\('limit', String\(DEAL_PAGE_SIZE\)\)/);
  assert.match(home, /params\.set\('offset', String\(offset\)\)/);
  assert.match(home, /const \[loadingMoreDeals, setLoadingMoreDeals\] = useState\(false\)/);
  assert.match(home, /const \[hasMoreDeals, setHasMoreDeals\] = useState\(false\)/);
  assert.match(home, /fetchDealsPage\(\{ offset: deals\.length, append: true, signal: controller\.signal \}\)/);
  assert.match(home, /<div ref=\{dealListEndRef\} className="dilz-feed-sentinel" aria-hidden=\{!loadingMoreDeals\}>/);
  assert.match(home, /dilz-loading-state--more/);
  assert.doesNotMatch(home, /displayedDeals\.slice\(0,\s*25\)/);
});

test('map view protects visible markers, city chips and the full bottom results panel', () => {
  assert.match(map, /limit=500/);
  assert.match(map, /mapDealHasExactCoordinates/);
  assert.match(map, /getMapFocusPoints/);
  assert.match(map, /dilz-map-marker--exact/);
  assert.match(map, /className="dilz-map-results__top"[\s\S]*className="dilz-map-city-strip"/);
  assert.match(css, /\.dilz-map-results\s*\{[^}]*display:\s*flex[^}]*flex-direction:\s*column[^}]*overflow:\s*hidden/s);
  assert.match(css, /\.dilz-map-deal-list\s*\{[^}]*flex:\s*1 1 auto[^}]*overflow-y:\s*auto/s);
  assert.match(css, /\.dilz-map-city-strip\s*\{[^}]*position:\s*relative[^}]*z-index:\s*31/s);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*\.dilz-map-city-strip\s*\{[^}]*z-index:\s*41/s);
});

test('liquid bottom nav keeps the calm transition and subtle press zoom contract', () => {
  assert.match(bottomNav, /const glideMs = 620/);
  assert.match(bottomNav, /transform: `translateX\(\$\{pos\}\) scale\(\$\{dragSwell\.toFixed\(3\)\}\)`/);
  assert.match(bottomNav, /transform \$\{glideMs\}ms \$\{ease\}/);
  assert.doesNotMatch(bottomNav, /translate: pos/);
  assert.doesNotMatch(bottomNav, /scale: `\$\{dragSwell\.toFixed\(3\)\}`/);
  assert.match(bottomNav, /const dragSwell = \(pressed \|\| isSwiping\) \? 1\.34 : 1/);
  assert.match(css, /\.dilz-bottom-nav__inner\.is-zoomed\s*\{[^}]*transform:\s*scale\(1\.018\)/s);
  assert.match(css, /\.dilz-bottom-nav__loupe\s*\{[^}]*top:\s*3px[^}]*bottom:\s*3px[^}]*width:\s*72px/s);
  assert.match(css, /\.dilz-bottom-nav__loupe\.is-swiping\s*\{[^}]*transition:\s*none !important/s);
});
