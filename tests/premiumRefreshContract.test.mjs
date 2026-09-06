import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const read = (...parts) => readFile(path.join(process.cwd(), ...parts), 'utf8');

const [
  app,
  documentPage,
  globals,
  premiumCss,
  home,
  appHeader,
  dealCard,
  safetyActions,
  detail,
  postForm,
  explore,
  messages,
  promoCard,
  bottomNav,
  globalBottomNav,
] = await Promise.all([
  read('pages', '_app.js'),
  read('pages', '_document.js'),
  read('styles', 'globals.css'),
  read('styles', 'premium-refresh.css'),
  read('pages', 'index.js'),
  read('components', 'layout', 'AppHeader.js'),
  read('components', 'deals', 'DealCard.js'),
  read('components', 'ui', 'SafetyActions.js'),
  read('pages', 'deal', '[id].js'),
  read('components', 'deals', 'PostDealModal.js'),
  read('pages', 'explore.js'),
  read('components', 'ui', 'AppMessages.js'),
  read('components', 'deals', 'PromoCard.js'),
  read('components', 'layout', 'BottomNav.js'),
  read('components', 'layout', 'GlobalBottomNav.js'),
]);

test('premium refresh loads after the base design system', () => {
  const globalsIndex = app.indexOf("import '../styles/globals.css'");
  const premiumIndex = app.indexOf("import '../styles/premium-refresh.css'");
  assert.ok(globalsIndex >= 0);
  assert.ok(premiumIndex > globalsIndex);
  assert.match(premiumCss, /Dilz 2026 consumer UI refresh/);
});

test('premium refresh deliberately leaves the iOS bottom navigation untouched', () => {
  assert.doesNotMatch(premiumCss, /\.dilz-bottom-nav/);
  assert.match(bottomNav, /className="dilz-bottom-nav"/);
  assert.match(globalBottomNav, /<BottomNav/);
  assert.match(globalBottomNav, /shouldShowNav/);
});

test('light and dark palettes retain disciplined orange brand tokens', () => {
  assert.match(globals, /--brand:\s*#F97316/);
  assert.match(globals, /--bg-app:\s*#F8FAFC/);
  assert.match(globals, /--surface-main:\s*#FFFFFF/);
  assert.match(globals, /--border-default:\s*rgba\(15,\s*23,\s*42,\s*0\.12\)/);
  assert.match(globals, /\.dark\s*\{[\s\S]*--bg-app:\s*#070B12/);
  assert.match(globals, /\.dark\s*\{[\s\S]*--surface-main:\s*#0D1420/);
  assert.match(globals, /\.dark\s*\{[\s\S]*--border-default:\s*rgba\(148,\s*163,\s*184,\s*0\.20\)/);
  assert.match(premiumCss, /\.dilz-button--primary\s*\{[^}]*background:\s*var\(--brand\) !important/s);
});

test('header uses one responsive search experience without duplicate theme controls', () => {
  assert.doesNotMatch(appHeader, /ThemeToggle|dilz-theme-toggle/);
  assert.match(appHeader, /showSearch && \([\s\S]*dilz-app-header__search/);
  assert.match(appHeader, /showSearch && \([\s\S]*dilz-mobile-search/);
  assert.match(premiumCss, /@media \(max-width: 767px\)[\s\S]*\.dilz-app-header__search\s*\{[^}]*display:\s*none !important/s);
  assert.match(premiumCss, /@media \(max-width: 767px\)[\s\S]*\.dilz-mobile-search\s*\{[^}]*display:\s*block !important/s);
  assert.match(premiumCss, /\.dilz-search-bar:focus-within\s*\{[^}]*border-color:\s*var\(--border-strong\)/s);
});

test('feed toolbar keeps filters, deal count, map and three layouts available', () => {
  assert.match(home, /className="dilz-view-switcher__count" aria-live="polite"/);
  assert.match(home, /className="dilz-map-quick-btn"/);
  assert.match(home, /className="dilz-layout-toggle"/);
  for (const layout of ['card', 'spotlight', 'compact']) {
    assert.match(home, new RegExp(`id: '${layout}'`));
  }
  assert.match(home, /aria-pressed=\{dealLayout === option\.id\}/);
  assert.match(premiumCss, /\.dilz-deal-toolbar\s*\{[^}]*display:\s*flex !important/s);
  assert.match(premiumCss, /@media \(max-width: 767px\)[\s\S]*\.dilz-deal-toolbar\s*\{[^}]*display:\s*grid !important/s);
});

test('card, row and small-card layouts remain responsive and bounded', () => {
  assert.match(premiumCss, /\.dilz-feed-grid\.is-compact\s*\{[^}]*repeat\(4, minmax\(0, 1fr\)\)/s);
  assert.match(premiumCss, /@media \(max-width: 767px\)[\s\S]*\.dilz-feed-grid\.is-compact\s*\{[^}]*repeat\(2, minmax\(0, 1fr\)\)/s);
  // `.is-list` is a legacy layout value migrated straight to 'spotlight'
  // (lib/userPreferences.js, lib/navigationState.js) — it's unreachable, so
  // the row layout only needs to be tested via `.is-spotlight`, the feed's
  // real default.
  assert.doesNotMatch(premiumCss, /\.dilz-deal-card\.is-list/);
  assert.match(premiumCss, /\.dilz-feed-grid\.is-spotlight \.dilz-deal-card\.is-spotlight \{[^}]*grid-template-columns:\s*104px minmax\(0, 1fr\)/s);
  assert.match(premiumCss, /@media \(min-width:\s*640px\)[\s\S]*\.dilz-feed-grid\.is-spotlight \.dilz-deal-card\.is-spotlight \{[^}]*grid-template-columns:\s*132px minmax\(0, 1fr\)/s);
  assert.match(premiumCss, /\.dilz-feed-grid\.is-spotlight \.dilz-deal-card\.is-spotlight \.dilz-deal-card__right-actions\s*\{[^}]*display:\s*none/s);
  assert.match(documentPage, /maximum-scale=1, user-scalable=no, viewport-fit=cover/);
});

test('deal cards prioritize media, title, price and voting with unbroken shekel prices', () => {
  const media = dealCard.indexOf('dilz-deal-card__media');
  const title = dealCard.indexOf('<h3>');
  const price = dealCard.indexOf('dilz-deal-card__price-row');
  const actions = dealCard.indexOf('dilz-deal-card__actions');
  assert.ok(media >= 0 && title > media && price > title && actions > price);
  assert.match(dealCard, /const priceLabel = formatDealPrice\(deal, lang\)/);
  assert.match(dealCard, /const originalPriceLabel = formatOriginalPrice\(deal\)/);
  assert.match(dealCard, /<strong className=\{isFree \? 'is-free' : undefined\}>\{priceLabel\}<\/strong>/);
  assert.match(dealCard, /\{originalPriceLabel && <span>\{originalPriceLabel\}<\/span>\}/);
  assert.match(promoCard, /\{promo\.prixMin\.toFixed\(2\)\} &#8362;/);
  assert.match(premiumCss, /\.dilz-deal-card__price-row strong\s*\{[^}]*white-space:\s*nowrap !important/s);
  assert.match(dealCard, /<VoteEmoji type="chaud" \/>/);
  assert.match(dealCard, /<VoteEmoji type="froid" \/>/);
});

test('owner edit and delete actions live inside the contextual menu', () => {
  assert.doesNotMatch(dealCard, /dilz-owner-edit|dilz-owner-delete/);
  assert.match(dealCard, /onEdit=\{isOwner \? editOwnerDeal : undefined\}/);
  assert.match(dealCard, /onDelete=\{isOwner && onOwnerDelete/);
  assert.match(safetyActions, /\{onEdit && <button/);
  assert.match(safetyActions, /\{onDelete && <button/);
  assert.match(safetyActions, /className="is-destructive"/);
  assert.match(safetyActions, /expired: 'סימון כפג תוקף'/);
  assert.match(safetyActions, /rules: 'הפרת כללי Dilz'/);
  assert.match(premiumCss, /\.dilz-safety-actions__menu button\.is-destructive\s*\{[^}]*color:\s*var\(--danger\)/s);
});

test('deal details follow a conversion-focused information order', () => {
  const hero = detail.indexOf('dilz-deal-hero');
  const price = detail.indexOf('dilz-deal-price-row');
  const title = detail.indexOf('dilz-deal-title');
  const meta = detail.indexOf('dilz-deal-meta-row');
  const cta = detail.indexOf('dilz-deal-source-link');
  const dates = detail.indexOf('dilz-deal-dates');
  const votes = detail.indexOf('dilz-deal-votes');
  assert.ok(hero >= 0 && price > hero && title > price && meta > title);
  assert.ok(cta > meta && dates > cta && votes > dates);
  assert.match(premiumCss, /\.dilz-deal-hero\s*\{[^}]*width:\s*100%[^}]*height:\s*auto !important[^}]*aspect-ratio:\s*16 \/ 10 !important/s);
  assert.match(premiumCss, /\.dilz-deal-hero--empty\s*\{[^}]*height:\s*150px !important[^}]*aspect-ratio:\s*auto !important/s);
  assert.match(detail, /deal\.url_source \? \(/);
  assert.match(detail, /'Open location'/);
  assert.match(detail, /ArrowUpRightIcon/);
});

test('post flow has exclusive steps, completed checks and a premium photo dropzone', () => {
  assert.match(postForm, /step === index && 'is-active'/);
  assert.match(postForm, /step > index && 'is-complete'/);
  assert.match(postForm, /step > index \? <StepCheckIcon \/> : index \+ 1/);
  assert.match(postForm, /addPhoto:\s*'Choose photos'/);
  assert.match(postForm, /Upload 1-3 clear photos or screenshots/);
  assert.match(postForm, /accept="image\/jpeg,image\/png,image\/webp"/);
  assert.match(postForm, /const MAX_IMAGES = 3/);
  assert.match(premiumCss, /\.dilz-upload-zone\s*\{[^}]*border:\s*1px dashed var\(--border-strong\) !important[^}]*background:\s*var\(--surface-soft\) !important/s);
});

test('search and Explore use visual discovery states instead of admin-like rows', () => {
  assert.match(home, /function SearchGlyphIcon\(\)/);
  assert.match(home, /function NoResultsIcon\(\)/);
  assert.match(home, /dilz-search-empty__icon/);
  assert.match(explore, /Find every type of deal in one place\./);
  assert.match(explore, /className=\{\['dilz-explore-card', featured && 'is-featured'\]/);
  assert.match(premiumCss, /\.dilz-explore-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/s);
  assert.match(premiumCss, /\.dilz-explore-card\.is-featured\s*\{[^}]*grid-column:\s*1 \/ -1/s);
});

test('announcements avoid duplicate headings and PWA chrome follows each theme', () => {
  assert.match(messages, /function shouldShowTitle\(message\)/);
  assert.match(messages, /!body\.toLocaleLowerCase\(\)\.startsWith\(title\.toLocaleLowerCase\(\)\)/);
  assert.match(documentPage, /media="\(prefers-color-scheme: light\)" content="#F8FAFC"/);
  assert.match(documentPage, /media="\(prefers-color-scheme: dark\)" content="#070B12"/);
  assert.match(documentPage, /Inter:wght@400;500;600;700;800;900/);
  assert.match(premiumCss, /@media \(prefers-reduced-motion: reduce\)/);
});
