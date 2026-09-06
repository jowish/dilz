import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const read = (...parts) => readFile(path.join(process.cwd(), ...parts), 'utf8');

const [globals, premiumCss, dealCard] = await Promise.all([
  read('styles', 'globals.css'),
  read('styles', 'premium-refresh.css'),
  read('components', 'deals', 'DealCard.js'),
]);

test('the row card action bar is in normal flow, not pinned over the title/price', () => {
  // The bug (confirmed via screenshot, not just reasoning about the CSS):
  // .dilz-deal-card__actions was `position: absolute; top: 0; right: 0;
  // width: 96px; min-height: 32px` in row (.is-spotlight) mode, a box sized
  // for one small icon. The row's real content there is a vote pill plus a
  // "View deal" button, which never fit — they overflowed the box and sat on
  // top of the title and price rendered underneath in normal flow.
  const spotlightSection = premiumCss.slice(
    premiumCss.indexOf('.dilz-feed-grid.is-spotlight .dilz-deal-card.is-spotlight {'),
    premiumCss.indexOf('/* Small cards */'),
  );
  assert.doesNotMatch(spotlightSection, /position:\s*absolute/);
  assert.match(spotlightSection, /\.dilz-deal-card__actions\s*\{\s*position:\s*static;/);
});

test('row cards restore the poster tier badge and freshness label the previous version hid', () => {
  const spotlightSection = premiumCss.slice(
    premiumCss.indexOf('.dilz-feed-grid.is-spotlight .dilz-deal-card.is-spotlight {'),
    premiumCss.indexOf('/* Small cards */'),
  );
  // Both .dilz-deal-card__author (which nests the tier badge) and
  // .dilz-deal-card__meta (freshness) used to be `display: none` here.
  assert.doesNotMatch(spotlightSection, /__author\s*\{[^}]*display:\s*none/s);
  assert.doesNotMatch(spotlightSection, /__meta\s*\{[^}]*display:\s*none/s);
  assert.match(dealCard, /deal\.auteur_tier && \(/);
});

test('.is-list, a layout value no preference can actually produce, is gone from the row/small-card CSS', () => {
  assert.doesNotMatch(premiumCss, /\.dilz-deal-card\.is-list/);
  assert.doesNotMatch(globals, /\.dilz-feed-grid\.is-spotlight \.dilz-deal-card\.is-spotlight \.dilz-deal-card__actions/);
});

test('DealCard media uses the standard React prop name for fetch priority', () => {
  assert.match(dealCard, /fetchPriority=\{priority \? 'high' : 'low'\}/);
  assert.doesNotMatch(dealCard, /fetchpriority=/);
});

test('deal detail is a real two-column layout at desktop widths, not a mobile column stretched wide', () => {
  // The bug: globals.css set `max-width: 600px` on .dilz-deal-content, which
  // silently capped it on every screen size no matter what width value
  // premium-refresh.css's own (later-loaded, !important) rules specified --
  // max-width always wins over width when both apply, regardless of source
  // order or !important on the `width` property alone.
  assert.doesNotMatch(globals, /\.dilz-deal-content\s*\{[^}]*max-width/s);
  const desktopSection = premiumCss.slice(premiumCss.indexOf('Deal detail: a real two-column desktop layout'));
  assert.ok(desktopSection.length > 100, 'expected to find the deal-detail desktop grid section');
  assert.match(desktopSection, /display:\s*grid/);
  assert.match(desktopSection, /grid-template-columns:\s*minmax\(0, 440px\) minmax\(0, 1fr\)/);
  assert.match(desktopSection, /\.dilz-deal-hero\s*\{[^}]*grid-column:\s*1;[^}]*position:\s*sticky/s);
  assert.match(desktopSection, /\.dilz-deal-body\s*\{[^}]*grid-column:\s*2/s);
});
