import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const css = await readFile(path.join(process.cwd(), 'styles', 'globals.css'), 'utf8');
const bottomNav = await readFile(path.join(process.cwd(), 'components', 'layout', 'BottomNav.js'), 'utf8');

test('mobile navigation uses a native fixed tab bar', () => {
  assert.match(css, /--dilz-tabbar-height:\s*64px/);
  assert.match(css, /\.dilz-tabbar\s*\{[^}]*position:\s*fixed/s);
  assert.match(css, /\.dilz-tabbar\s*\{[^}]*height:\s*calc\(var\(--dilz-tabbar-height\) \+ env\(safe-area-inset-bottom\)\)/s);
  // Translucent, blurred system material with a hairline top separator.
  assert.match(css, /\.dilz-tabbar\s*\{[^}]*background:\s*var\(--tabbar-surface\)/s);
  assert.match(css, /\.dilz-tabbar\s*\{[^}]*backdrop-filter:\s*blur\(/s);
  assert.match(css, /\.dilz-tabbar\s*\{[^}]*border-top:\s*0?\.5px solid var\(--tabbar-hairline\)/s);
  assert.match(bottomNav, /aria-current=\{committed \? 'page' : undefined\}/);
});

test('the Post action shares the neutral styling of the other tabs', () => {
  // Post is a plain tab like the rest — no orange FAB, no special class.
  assert.doesNotMatch(bottomNav, /is-post/);
  assert.doesNotMatch(bottomNav, /var\(--brand\)/);
});

test('the profile tab can show an uploaded avatar in the bar', () => {
  assert.match(bottomNav, /dilz-tabbar__avatar/);
  assert.match(bottomNav, /avatar_url/);
});

test('dark cards use subtle tokenized border contrast', () => {
  assert.match(css, /--bg:\s*#070B12/);
  assert.match(css, /--bg-card:\s*#0D1420/);
  assert.match(css, /--border-default:\s*rgba\(148,\s*163,\s*184,\s*0\.20\)/);
  assert.match(css, /--border-strong:\s*rgba\(148,\s*163,\s*184,\s*0\.34\)/);
  assert.match(css, /\.dilz-card,[\s\S]*?border:\s*1px solid var\(--border-default\)\s*!important/s);
});

test('light mode borders stay visible enough on white surfaces', () => {
  assert.match(css, /--bg:\s*#F8FAFC/);
  assert.match(css, /--border-default:\s*rgba\(15,\s*23,\s*42,\s*0\.12\)/);
  assert.match(css, /--border-soft:\s*rgba\(15,\s*23,\s*42,\s*0\.08\)/);
  assert.match(css, /--border-strong:\s*rgba\(15,\s*23,\s*42,\s*0\.22\)/);
});

test('only the retained view switch polish remains after SmoothUI rollback', () => {
  assert.doesNotMatch(css, /SmoothUI-inspired visual polish layer/);
  assert.match(css, /Retained view switch polish: cards, rows and small cards only/);
  assert.match(css, /\.dilz-feed-grid\.is-spotlight/);
});

test('bottom navigation exposes Deals Explore Post Alerts Profile with route compatibility', () => {
  assert.match(bottomNav, /search:\s*'Explore'/);
  assert.match(bottomNav, /id: 'deals'[\s\S]*id: 'explore'[\s\S]*id: 'post'[\s\S]*id: 'alerts'[\s\S]*id: 'profile'/);
  assert.match(bottomNav, /label:\s*labels\.search/);
  assert.match(bottomNav, /function SearchIcon\(\{ active \}\)/);
  assert.doesNotMatch(bottomNav, /function ExploreIcon\(\)/);
});

test('the menu sheet ends above the visible mobile navigation', () => {
  assert.match(css, /\.dilz-main-menu__backdrop\{[^}]*inset:0 0 calc\(96px \+ env\(safe-area-inset-bottom\)\)/s);
  assert.match(css, /\.dilz-main-menu__backdrop\{[^}]*z-index:900/s);
});

test('deal toolbar filters stay on one row without side scroll', () => {
  assert.match(css, /\.dilz-deal-toolbar \.dilz-view-switcher\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:\s*0\.96fr 0\.82fr 1\.32fr 1\.08fr 0\.62fr[^}]*overflow-x:\s*visible/s);
  assert.match(css, /\.dilz-deal-toolbar \.dilz-view-switcher button\s*\{[^}]*min-width:\s*0/s);
  assert.match(css, /\.dilz-deal-toolbar \.dilz-view-switcher__select-wrap,[\s\S]*?width:\s*100%/s);
  assert.match(css, /\.dilz-view-switcher__select-wrap--display \.dilz-view-switcher__select\s*\{[^}]*opacity:\s*0/s);
  assert.match(css, /@media \(max-width: 360px\)[\s\S]*\.dilz-deal-toolbar \.dilz-view-switcher\s*\{[^}]*gap:\s*4px/s);
  assert.match(css, /@media \(max-width: 360px\)[\s\S]*\.dilz-deal-toolbar \.dilz-view-switcher button,[\s\S]*?font-size:\s*11\.5px/s);
});

test('desktop pages keep the document as the only vertical scroller', () => {
  assert.match(css, /html\s*\{[^}]*overflow-y:\s*scroll/s);
  assert.match(css, /html\s*\{[^}]*overscroll-behavior-y:\s*none/s);
  assert.match(css, /body\s*\{[^}]*overscroll-behavior-y:\s*none/s);
  assert.match(css, /body\s*\{[^}]*overflow:\s*visible/s);
  assert.match(css, /#__(?:next|NEXT)\s*\{[^}]*overflow:\s*visible/s);
  assert.match(css, /body,\s*#__next\s*\{\s*overflow:\s*visible;\s*\}/s);
  assert.doesNotMatch(css, /html,\s*body,\s*#__next\s*\{[^}]*overflow-y:\s*auto/s);
  assert.doesNotMatch(css, /overscroll-behavior-y:\s*auto/s);
});
