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
  promoApi,
  shoppingPage,
  shoppingDetail,
  css,
  documentPage,
  migration,
] = await Promise.all([
  read('components', 'deals', 'DealCard.js'),
  read('components', 'deals', 'PostDealModal.js'),
  read('pages', 'post.js'),
  read('pages', 'index.js'),
  read('components', 'ui', 'AlertModal.js'),
  read('pages', 'map.js'),
  read('pages', 'user', '[id].js'),
  read('pages', 'api', 'promo-codes.js'),
  read('pages', 'bons-plans-shopping.js'),
  read('pages', 'shopping-deal', '[slug].js'),
  read('styles', 'globals.css'),
  read('pages', '_document.js'),
  read('supabase-community-content-setup.sql'),
]);

test('deal cards expose branded sharing, direct SMS, author profile and owner deletion', () => {
  assert.match(dealCard, /dilz-card-sms-action/);
  assert.match(dealCard, /buildSmsUrl/);
  assert.match(dealCard, /router\.push\(`\/user\/\$\{deal\.auteur_id\}`\)/);
  assert.match(dealCard, /dilz-owner-delete/);
  assert.match(css, /\.is-whatsapp svg[^}]*#25D366/);
  assert.match(css, /\.is-telegram svg[^}]*#229ED9/);
  assert.match(css, /\.is-sms svg[^}]*#34C759/);
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
  assert.match(map, /hasExactCoordinates/);
  assert.match(map, /dilz-map-marker--exact/);
  assert.match(map, /buildMapUrl\(nextCity\)/);
});

test('public profiles expose membership stats, deals and follow controls', () => {
  assert.match(profilePage, /Member since/);
  assert.match(profilePage, /profile\.followers_count/);
  assert.match(profilePage, /toggleFollow/);
  assert.match(profilePage, /profile\.deals_count/);
});

test('shopping deals have internal detail pages, votes, comments and third-party links', () => {
  assert.match(shoppingPage, /href=\{`\/shopping-deal\/\$\{service\.name\.toLowerCase\(\)/);
  assert.match(shoppingPage, /VoteEmoji/);
  assert.match(shoppingDetail, /act\(\{ action: 'vote'/);
  assert.match(shoppingDetail, /act\(\{ action: 'comment'/);
  assert.match(shoppingDetail, /service\.url/);
  assert.doesNotMatch(shoppingPage, /Official links/);
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
  assert.match(css, /overflow-x:\s*hidden/);
  assert.match(documentPage, /maximum-scale=1, user-scalable=no/);
});
