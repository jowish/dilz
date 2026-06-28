import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const read = (...parts) => readFile(path.join(process.cwd(), ...parts), 'utf8');

const [
  dealCard,
  postForm,
  postPage,
  home,
  alerts,
  map,
  profilePage,
  bottomNav,
  explorePage,
  promoApi,
  shoppingPage,
  shoppingDetail,
  css,
  documentPage,
  migration,
  dealApi,
  detailPage,
  nativeApp,
] = await Promise.all([
  read('components', 'deals', 'DealCard.js'),
  read('components', 'deals', 'PostDealModal.js'),
  read('pages', 'post.js'),
  read('pages', 'index.js'),
  read('components', 'ui', 'AlertModal.js'),
  read('pages', 'map.js'),
  read('pages', 'user', '[id].js'),
  read('components', 'layout', 'BottomNav.js'),
  read('pages', 'explore.js'),
  read('pages', 'api', 'promo-codes.js'),
  read('pages', 'bons-plans-shopping.js'),
  read('pages', 'shopping-deal', '[slug].js'),
  read('styles', 'globals.css'),
  read('pages', '_document.js'),
  read('supabase-community-content-setup.sql'),
  read('pages', 'api', 'bons-plans.js'),
  read('pages', 'deal', '[id].js'),
  read('lib', 'nativeApp.js'),
]);

test('exact deal location is preserved and shown in deal details', () => {
  assert.match(postForm, /adresse: form\.onlineMode === 'online' \? null : \(resolvedLocation\.address \|\| form\.adresse \|\| null\)/);
  assert.doesNotMatch(dealApi, /delete compatibleInsert\.(adresse|latitude|longitude)/);
  assert.doesNotMatch(dealApi, /delete compatibleUpdate\.(adresse|latitude|longitude)/);
  assert.match(detailPage, /Full address/);
  assert.match(detailPage, /\{deal\.adresse\}/);
  assert.match(detailPage, /buildDealGpsUrl\(deal\)/);
  assert.match(detailPage, /onPointerDown=\{startAddressPress\}/);
  assert.match(detailPage, /copyDealAddress/);
  assert.match(detailPage, /Tap for GPS/);
  assert.match(css, /\.dilz-deal-address\s*\{[^}]*touch-action:\s*manipulation/s);
});

test('post form prevents iOS focus zoom and confirms publishing with haptics', () => {
  assert.match(css, /\.dilz-post-page input:not\(\[type='file'\]\)[^}]*font-size:\s*16px !important/s);
  assert.match(postForm, /await triggerSuccessHaptic\(\);[\s\S]*onSuccess\(/);
  assert.match(nativeApp, /navigator\.vibrate\(\[35, 45, 55\]\)/);
});

test('deal cards expose branded sharing through the share menu, author profile and owner deletion', () => {
  assert.doesNotMatch(dealCard, /dilz-card-sms-action/);
  assert.doesNotMatch(dealCard, /buildSmsUrl/);
  assert.match(dealCard, /<ShareMenu/);
  assert.match(dealCard, /router\.push\(`\/user\/\$\{deal\.auteur_id\}`\)/);
  assert.match(dealCard, /dilz-owner-delete/);
  assert.match(dealCard, /dilz-deal-card__comment-meta/);
  assert.doesNotMatch(dealCard, /aria-label=\{`\$\{commentCount\} \$\{text\.comments\}`\}/);
  assert.match(css, /\.is-whatsapp svg[^}]*#25D366/);
  assert.match(css, /\.is-telegram svg[^}]*#229ED9/);
  assert.match(css, /\.is-sms svg[^}]*#34C759/);
  assert.match(css, /\.dilz-card-sms-action\s*\{[^}]*display:\s*none\s*!important/s);
});

test('posting is a standalone bottom-nav page and accepts city or exact coordinates', () => {
  assert.match(postPage, /pageMode/);
  assert.match(postPage, /router\.replace\(`\/\?sort=latest&refresh=/);
  assert.match(postForm, /!form\.ville && !form\.adresse\.trim\(\)/);
  assert.match(postForm, /Number\.isFinite\(Number\(form\.latitude\)\)/);
  assert.match(postForm, /triggerSuccessHaptic/);
  assert.match(home, /router\.push\('\/post'\)/);
  assert.doesNotMatch(home, /setShowPostModal\(/);
});

test('alerts are mobile-safe and include useful popular Israeli searches', () => {
  assert.match(alerts, /inputMode="numeric"/);
  assert.match(alerts, /KSP/);
  assert.match(alerts, /Rami Levy/);
  assert.match(alerts, /Shufersal/);
  assert.match(css, /\.dilz-alert-page input[^}]*font-size:\s*16px/s);
  assert.match(css, /\.dilz-bottom-nav[^}]*position:\s*fixed\s*!important/s);
});

test('map loads a broad result set and preserves exact deal markers', () => {
  assert.match(map, /limit=500/);
  assert.match(map, /mapDealHasExactCoordinates/);
  assert.match(map, /getMapFocusPoints/);
  assert.match(map, /resolveMapCityKey/);
  assert.match(map, /dilz-map-marker--exact/);
  assert.match(map, /buildMapUrl\(nextCity\)/);
  assert.match(css, /\.dilz-map-marker,[\s\S]*background:\s*#DC2626\s*!important/s);
});

test('public profiles expose membership stats, deals and follow controls', () => {
  assert.match(profilePage, /Member since/);
  assert.match(profilePage, /profile\.followers_count/);
  assert.match(profilePage, /toggleFollow/);
  assert.match(profilePage, /profile\.deals_count/);
  assert.match(profilePage, /formatPrice\(deal\.prix\)[\s\S]*₪/);
  assert.match(profilePage, /aria-pressed=\{following\}/);
  assert.match(profilePage, /Following ✓/);
});

test('shopping deals have internal detail pages, votes, comments and third-party links', () => {
  assert.match(shoppingPage, /href=\{`\/shopping-deal\/\$\{service\.name\.toLowerCase\(\)/);
  assert.match(shoppingPage, /VoteEmoji/);
  assert.match(shoppingPage, /dilz-service-card__votes/);
  assert.match(css, /\.dilz-service-vote/);
  assert.match(shoppingDetail, /act\(\{ action: 'vote'/);
  assert.match(shoppingDetail, /act\(\{ action: 'comment'/);
  assert.match(shoppingDetail, /service\.url/);
  assert.doesNotMatch(shoppingPage, /Official links/);
});

test('bottom nav uses a real Explore page and no longer opens the old menu sheet', () => {
  assert.match(bottomNav, /id: 'explore'/);
  assert.match(bottomNav, /ExploreIcon/);
  assert.doesNotMatch(bottomNav, /id: 'menu'/);
  assert.match(bottomNav, /id: 'deals'[\s\S]*id: 'explore'[\s\S]*id: 'post'[\s\S]*id: 'alerts'[\s\S]*id: 'profile'/);
  assert.match(home, /handleBottomNavigation\('explore'\)/);
  assert.match(home, /router\.push\('\/explore'\)/);
  assert.match(explorePage, /function ExplorePage/);
  assert.match(explorePage, /activeTab="explore"/);
  assert.match(explorePage, /href="\/bons-plans-shopping"/);
  assert.match(explorePage, /href="\/codes-promo"/);
  assert.match(explorePage, /href="\/gratuit"/);
});

test('display toggles keep visible active icons and start with a single card icon', () => {
  assert.match(home, /aria-label="Card view"[\s\S]*<rect x="5" y="5" width="14" height="14" rx="3"\/>/);
  assert.match(css, /\.dilz-layout-toggle button\.is-active\s*\{[^}]*background:\s*var\(--surface-main\)\s*!important/s);
  assert.match(css, /\.dilz-layout-toggle button\.is-active\s*\{[^}]*border:\s*1px solid var\(--text-primary\)\s*!important/s);
});

test('search result deal cards keep actions inside the card boundary', () => {
  assert.match(home, /dilz-search-deal-results/);
  assert.match(css, /\.dilz-search-deal-results \.dilz-deal-card\s*\{[^}]*overflow:\s*hidden/s);
  assert.match(css, /\.dilz-search-deal-results \.dilz-deal-card__right-actions\s*\{[^}]*justify-content:\s*flex-end/s);
  assert.match(css, /\.dilz-deal-card__actions,[\s\S]*flex-wrap:\s*wrap/s);
});

test('community promo codes are user-submittable and protected by database policies', () => {
  assert.match(promoApi, /req\.method !== 'POST'/);
  assert.match(promoApi, /auth\.getUser/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS promo_codes/);
  assert.match(migration, /Users create promo codes/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS shopping_deal_comments/);
});

test('compact and row views remain bounded while global zoom and horizontal drift are disabled', () => {
  assert.match(home, /is-compact/);
  assert.match(css, /\.dilz-feed-grid\.is-compact[^}]*repeat\(4/);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*\.dilz-feed-grid\.is-compact[^}]*repeat\(2/);
  assert.match(css, /\.dilz-deal-card\.is-list \.dilz-deal-card__description[^}]*-webkit-line-clamp:\s*1/);
  assert.match(css, /\.dilz-feed-grid\.is-list \.dilz-deal-card\.is-list\s*\{[^}]*grid-template-columns:\s*150px minmax\(0, 1fr\)/s);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*\.dilz-feed-grid\.is-list \.dilz-deal-card\.is-list\s*\{[^}]*grid-template-columns:\s*78px minmax\(0, 1fr\)/s);
  assert.match(css, /overflow-x:\s*hidden/);
  assert.match(documentPage, /maximum-scale=1, user-scalable=no/);
});
