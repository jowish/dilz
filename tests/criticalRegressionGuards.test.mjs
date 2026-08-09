import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const read = (...parts) => readFile(path.join(process.cwd(), ...parts), 'utf8');

const [
  ci,
  packageJson,
  vercel,
  mapPage,
  mapState,
  dealCard,
  userPage,
  css,
] = await Promise.all([
  read('.github', 'workflows', 'ci.yml'),
  read('package.json'),
  read('vercel.json'),
  read('pages', 'map.js'),
  read('lib', 'mapState.js'),
  read('components', 'deals', 'DealCard.js'),
  read('pages', 'user', '[id].js'),
  read('styles', 'globals.css'),
]);

test('CI automatically runs tests and production build on repository changes', () => {
  assert.match(ci, /on:\s*[\s\S]*push:/);
  assert.match(ci, /pull_request:/);
  assert.match(ci, /run:\s*npm test/);
  assert.match(ci, /run:\s*npm run build/);

  const pkg = JSON.parse(packageJson);
  assert.equal(pkg.scripts.check, 'npm test && npm run build');
});

test('Vercel cron remains compatible with Hobby production deploys', () => {
  const config = JSON.parse(vercel);
  assert.equal(config.crons.length, 1);
  assert.equal(config.crons[0].path, '/api/admin/deal-bot');
  assert.equal(config.crons[0].schedule, '0 6 * * *');
  assert.doesNotMatch(config.crons[0].schedule, /,/);
});

test('map regressions are guarded by shared coordinate helpers and visible red markers', () => {
  assert.match(mapPage, /groupMapDealsByCity\(deals, CITY_COORDS\)/);
  assert.match(mapPage, /resolveMapCityKey\(city, Object\.keys\(dealsByCity\), CITY_COORDS\)/);
  assert.match(mapPage, /getMapFocusPoints\(deals, selectedCity, dealsByCity, CITY_COORDS\)/);
  assert.match(mapState, /export function getVisibleMapDeals/);
  assert.match(mapState, /export function resolveMapCityKey/);
  assert.match(css, /\.dilz-map-marker\s*\{[\s\S]*background:\s*#DC2626\s*!important/s);
  assert.match(css, /\.dilz-map-marker--exact\s*\{?[\s\S]*background:\s*#B91C1C\s*!important/s);
});

test('deal cards avoid duplicate comment buttons and keep compact list controls bounded', () => {
  assert.match(dealCard, /dilz-deal-card__comment-meta/);
  assert.doesNotMatch(dealCard, /aria-label=\{`\$\{commentCount\} \$\{text\.comments\}`\}/);
  assert.match(css, /\.dilz-feed-grid\.is-list \.dilz-deal-card\.is-list\s*\{[^}]*grid-template-columns:\s*118px minmax\(0, 1fr\)/s);
  assert.match(css, /\.dilz-feed-grid\.is-list \.dilz-deal-card\.is-list \.dilz-deal-card__actions\s*\{[^}]*position:\s*absolute/s);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*\.dilz-feed-grid\.is-list \.dilz-deal-card\.is-list\s*\{[^}]*grid-template-columns:\s*74px minmax\(0, 1fr\)/s);
});

test('public user profiles preserve follow state and shekel price formatting', () => {
  assert.match(userPage, /aria-pressed=\{following\}/);
  assert.match(userPage, /data-follow-state=\{following \? 'following' : 'not-following'\}/);
  assert.match(userPage, /✓ Following/);
  assert.match(userPage, /Follow user/);
  assert.match(userPage, /formatPrice\(deal\.prix\)[\s\S]*₪/);
});

test('public user profile Hebrew strings render as real Hebrew, not mojibake', () => {
  assert.match(userPage, /'he' \? 'חבר מאז' : 'Member since'/);
  assert.match(userPage, /'he' \? 'דילים שפורסמו' : 'Published deals'/);
  assert.doesNotMatch(userPage, /×/);
});
