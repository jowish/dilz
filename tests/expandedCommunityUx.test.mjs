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
  globalBottomNav,
  appPage,
  notificationSheet,
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
  read('components', 'layout', 'GlobalBottomNav.js'),
  read('pages', '_app.js'),
  read('components', 'ui', 'NotificationSheet.js'),
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
  assert.match(detailPage, /suppressNextClick/);
  assert.match(detailPage, /const handleAddressClick/);
  assert.match(detailPage, /onClick=\{handleAddressClick\}/);
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
  assert.match(dealCard, /dilz-deal-card__safety-menu/);
  assert.match(dealCard, /dilz-deal-card__price-context/);
  assert.match(dealCard, /router\.push\(`\/user\/\$\{deal\.auteur_id\}`\)/);
  assert.match(dealCard, /dilz-owner-delete/);
  assert.match(dealCard, /dilz-deal-card__comment-meta/);
  assert.doesNotMatch(dealCard, /aria-label=\{`\$\{commentCount\} \$\{text\.comments\}`\}/);
  assert.match(css, /\.is-whatsapp svg[^}]*#25D366/);
  assert.match(css, /\.is-telegram svg[^}]*#229ED9/);
  assert.match(css, /\.is-sms svg[^}]*#34C759/);
  assert.match(css, /\.dilz-card-sms-action\s*\{[^}]*display:\s*none\s*!important/s);
  assert.match(css, /\.dilz-popover-dismiss\s*\{[^}]*position:\s*fixed/s);
  assert.match(css, /\.dilz-deal-card__safety-menu \.dilz-safety-actions__trigger\s*\{[^}]*background:\s*transparent/s);
  assert.match(css, /\.dilz-deal-card__safety-menu \.dilz-safety-actions__trigger\s*\{[^}]*border:\s*0/s);
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

test('map loads a broad result set, fills the results panel and preserves exact deal markers', () => {
  assert.match(map, /limit=500/);
  assert.match(map, /mapDealHasExactCoordinates/);
  assert.match(map, /getMapFocusPoints/);
  assert.match(map, /resolveMapCityKey/);
  assert.match(map, /dilz-map-marker--exact/);
  assert.match(map, /className="dilz-map-back"/);
  assert.match(map, /aria-label=\{text\.back\}/);
  assert.match(map, /<path d="M15 6 9 12l6 6"/);
  assert.match(map, /className="dilz-map-title" dir=\{dir\}/);
  assert.match(map, /buildMapUrl\(nextCity\)/);
  assert.match(css, /\.dilz-map-header\s*\{[^}]*direction:\s*ltr/s);
  assert.match(css, /\.dilz-map-marker,[\s\S]*background:\s*#DC2626\s*!important/s);
  assert.match(css, /\.dilz-map-results\s*\{[^}]*display:\s*flex[^}]*flex-direction:\s*column[^}]*overflow:\s*hidden/s);
  assert.match(css, /\.dilz-map-deal-list\s*\{[^}]*flex:\s*1 1 auto[^}]*overflow-y:\s*auto/s);
  assert.match(map, /className="dilz-map-results__top"[\s\S]*className="dilz-map-city-strip"/);
  assert.match(css, /\.dilz-map-results__top\s*\{[^}]*z-index:\s*30[^}]*background:\s*var\(--surface-main\)/s);
  assert.match(css, /\.dilz-map-city-strip\s*\{[^}]*position:\s*relative[^}]*z-index:\s*31/s);
  assert.match(css, /\.dilz-map-city-strip button span\s*\{[^}]*text-overflow:\s*ellipsis/s);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*\.dilz-map-results__top\s*\{[^}]*z-index:\s*40/s);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*\.dilz-map-city-strip\s*\{[^}]*z-index:\s*41/s);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*\.dilz-map-page\s*\{[^}]*padding-bottom:\s*0 !important/s);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*\.dilz-map-results\s*\{[^}]*flex:\s*1 1 auto[^}]*max-height:\s*none/s);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*\.dilz-map-deal-list\s*\{[^}]*var\(--dilz-tabbar-height\)/s);
});

test('public profiles expose membership stats, deals and follow controls', () => {
  assert.match(profilePage, /Member since/);
  assert.match(profilePage, /profile\.followers_count/);
  assert.match(profilePage, /toggleFollow/);
  assert.match(profilePage, /profile\.deals_count/);
  assert.match(profilePage, /formatPrice\(deal\.prix\)[\s\S]*₪/);
  assert.match(profilePage, /aria-pressed=\{following\}/);
  assert.match(profilePage, /data-follow-state=\{following \? 'following' : 'not-following'\}/);
  assert.match(profilePage, /✓ Following/);
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

test('deal detail header keeps top controls aligned around the centered logo', () => {
  assert.match(detailPage, /className="dilz-app-header dilz-deal-header"/);
  assert.match(css, /\.dilz-deal-header \.dilz-app-header__inner\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:\s*minmax\(72px,\s*1fr\) auto minmax\(72px,\s*1fr\)/s);
  assert.match(css, /\.dilz-deal-header \.dilz-logo-button\s*\{[^}]*justify-self:\s*center/s);
  assert.match(css, /\.dilz-deal-header \.dilz-deal-back\s*\{[^}]*justify-self:\s*start/s);
  assert.match(css, /\.dilz-deal-header \.dilz-deal-header-actions\s*\{[^}]*justify-self:\s*end/s);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*\.dilz-deal-header \.dilz-app-header__inner\s*\{[^}]*grid-template-columns:\s*minmax\(70px,\s*1fr\) auto minmax\(70px,\s*1fr\)/s);
});

test('bottom nav uses Explore as the visible discover tab while keeping the search icon and Explore route', () => {
  assert.match(bottomNav, /id: 'explore'/);
  assert.match(bottomNav, /search:\s*'Explore'/);
  assert.match(bottomNav, /SearchIcon/);
  assert.match(bottomNav, /label:\s*labels\.search/);
  assert.doesNotMatch(bottomNav, /id: 'menu'/);
  assert.match(bottomNav, /id: 'deals'[\s\S]*id: 'explore'[\s\S]*id: 'post'[\s\S]*id: 'alerts'[\s\S]*id: 'profile'/);
  assert.match(appPage, /<GlobalBottomNav \/>/);
  assert.match(globalBottomNav, /setOptimisticActive\(active\)/);
  assert.match(globalBottomNav, /router\.push\(href, undefined, options\)\.catch/);
  assert.match(globalBottomNav, /onMenu=\{\(\) => push\('\/explore', 'explore'\)\}/);
  assert.doesNotMatch(home, /<BottomNav/);
  assert.doesNotMatch(explorePage, /<BottomNav/);
  assert.doesNotMatch(postPage, /<BottomNav/);
  assert.match(explorePage, /function ExplorePage/);
  assert.match(explorePage, /href="\/bons-plans-shopping"/);
  assert.match(explorePage, /href="\/codes-promo"/);
  assert.match(explorePage, /href="\/gratuit"/);
});

test('display toggles keep visible active icons and start with a single card icon', () => {
  assert.match(home, /aria-label="Card view"[\s\S]*<svg width="18" height="18"[\s\S]*<rect x="4" y="4" width="16" height="16" rx="3\.5"\/>/);
  assert.match(home, /aria-label="Spotlight view"/);
  assert.match(home, /aria-label=\{lang === 'he' \? 'Map view' : 'Map view'\}/);
  assert.doesNotMatch(home, /className="dilz-map-quick-btn"/);
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
  assert.match(home, /is-spotlight/);
  assert.match(dealCard, /hideShareInRow = layout === 'list' \|\| layout === 'spotlight'/);
  assert.match(dealCard, /is-row-without-share/);
  assert.match(dealCard, /layout === 'spotlight' && 'is-spotlight'/);
  assert.match(css, /\.dilz-feed-grid\.is-compact[^}]*repeat\(4/);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*\.dilz-feed-grid\.is-compact[^}]*repeat\(2/);
  assert.match(css, /\.dilz-deal-card\.is-list \.dilz-deal-card__description[^}]*-webkit-line-clamp:\s*1/);
  assert.match(css, /\.dilz-feed-grid\.is-list \.dilz-deal-card\.is-list\s*\{[^}]*grid-template-columns:\s*118px minmax\(0, 1fr\)/s);
  assert.match(css, /\.dilz-feed-grid\.is-list \.dilz-deal-card\.is-list \.dilz-deal-card__actions\s*\{[^}]*position:\s*absolute/s);
  assert.match(css, /\.dilz-feed-grid\.is-list \.dilz-deal-card\.is-list \.dilz-deal-card__price-context span\s*\{[^}]*text-decoration:\s*none/s);
  assert.match(css, /\.dilz-feed-grid\.is-list \.dilz-deal-card\.is-list \.dilz-deal-card__right-actions\.is-row-without-share > \.dilz-icon-button,[\s\S]*display:\s*none !important/s);
  assert.match(css, /\.dilz-deal-card__price-row strong\s*\{[^}]*white-space:\s*nowrap/s);
  assert.match(css, /\.dilz-deal-card__price-row > span:not\(\.dilz-deal-card__price-context\)\s*\{[^}]*white-space:\s*nowrap/s);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*\.dilz-feed-grid\.is-list \.dilz-deal-card\.is-list\s*\{[^}]*grid-template-columns:\s*74px minmax\(0, 1fr\)/s);
  assert.match(css, /\.dilz-feed-grid\.is-spotlight \.dilz-deal-card\.is-spotlight\s*\{[^}]*grid-template-columns:\s*138px minmax\(0, 1fr\)/s);
  assert.match(css, /\.dilz-feed-grid\.is-spotlight \.dilz-deal-card\.is-spotlight \.dilz-deal-card__media\s*\{[^}]*aspect-ratio:\s*3 \/ 4/s);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*\.dilz-feed-grid\.is-spotlight \.dilz-deal-card\.is-spotlight\s*\{[^}]*grid-template-columns:\s*108px minmax\(0, 1fr\)/s);
  assert.match(css, /overflow-x:\s*hidden/);
  assert.match(documentPage, /maximum-scale=1, user-scalable=no/);
});

test('alert notifications render inside the Alerts page without a draggable sheet handle', () => {
  assert.match(alerts, /dilz-alert-results/);
  assert.doesNotMatch(alerts, /dilz-sheet__handle/);
});
