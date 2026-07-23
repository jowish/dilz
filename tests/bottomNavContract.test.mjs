import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const nav = await readFile(path.join(process.cwd(), 'components', 'layout', 'BottomNav.js'), 'utf8');
const css = await readFile(path.join(process.cwd(), 'styles', 'globals.css'), 'utf8');

// The bottom navigation is a standard iOS-style tab bar: a fixed, full-width,
// translucent blurred bar with a hairline top separator and five evenly
// spaced icon+label tabs. These tests lock that contract in and guard against
// a regression back to the old floating "liquid glass" pill.

// ── Component structure ──────────────────────────────────────────────────

test('the five tabs are declared in the fixed order Deals, Explore, Post, Alerts, Profile', () => {
  assert.match(nav, /id: 'deals'[\s\S]*id: 'explore'[\s\S]*id: 'post'[\s\S]*id: 'alerts'[\s\S]*id: 'profile'/);
});

test('each tab renders an icon over a label inside the tab-bar item', () => {
  assert.match(nav, /className="dilz-tabbar__icon"/);
  assert.match(nav, /className="dilz-tabbar__label"/);
  assert.match(nav, /dilz-tabbar__item/);
});

test('the selected tab is marked with aria-current and an is-active class', () => {
  assert.match(nav, /const committed = activeItem === item\.id/);
  assert.match(nav, /committed && 'is-active'/);
  assert.match(nav, /aria-current=\{committed \? 'page' : undefined\}/);
});

test('icons are outline when unselected and filled when selected (SF Symbols convention)', () => {
  assert.match(nav, /const solid = \(active\) => \(\{ fill: active \? 'currentColor' : 'none', stroke: active \? 'none' : 'currentColor' \}\)/);
});

test('the Alerts tab still surfaces the unread badge', () => {
  assert.match(nav, /dilz-tabbar__badge/);
  assert.match(nav, /unreadCount > 9 \? '9\+' : unreadCount/);
});

test('the profile tab shows the avatar when present', () => {
  assert.match(nav, /item\.id === 'profile' && avatarUrl/);
  assert.match(nav, /dilz-tabbar__avatar/);
});

// ── No floating-pill / liquid-glass remnants ──────────────────────────────

test('the old sliding loupe, swipe gestures and pill wrapper are gone', () => {
  assert.doesNotMatch(nav, /loupe/i);
  assert.doesNotMatch(nav, /handleTouchStart|handleTouchMove|onTouchStart/);
  assert.doesNotMatch(nav, /dilz-bottom-nav__inner/);
  assert.doesNotMatch(nav, /translateX\(/);
});

// ── CSS: a real bottom bar, not a floating pill ───────────────────────────

test('the tab bar is fixed and spans the full width flush to the bottom edge', () => {
  assert.match(css, /\.dilz-tabbar\s*\{[^}]*position:\s*fixed/s);
  assert.match(css, /\.dilz-tabbar\s*\{[^}]*left:\s*0[^}]*right:\s*0[^}]*bottom:\s*0/s);
});

test('the bar carries a hairline top separator like a native UITabBar', () => {
  assert.match(css, /\.dilz-tabbar\s*\{[^}]*border-top:\s*0?\.5px solid var\(--tabbar-hairline\)/s);
});

test('the bar background is translucent and blurred (system material)', () => {
  assert.match(css, /--tabbar-surface:\s*rgba\(/);
  assert.match(css, /\.dilz-tabbar\s*\{[^}]*background:\s*var\(--tabbar-surface\)/s);
  assert.match(css, /\.dilz-tabbar\s*\{[^}]*backdrop-filter:\s*blur\(/s);
});

test('the bar clears the home-indicator safe area', () => {
  assert.match(css, /\.dilz-tabbar\s*\{[^}]*env\(safe-area-inset-bottom\)/s);
});

test('the selected tab uses the active tint, the rest a muted grey', () => {
  assert.match(css, /\.dilz-tabbar__item\s*\{[^}]*color:\s*var\(--tabbar-inactive\)/s);
  assert.match(css, /\.dilz-tabbar__item\.is-active\s*\{[^}]*color:\s*var\(--tabbar-active\)/s);
});

test('the tab bar is mobile-only; desktop keeps the header nav', () => {
  assert.match(css, /\.dilz-tabbar\s*\{[^}]*display:\s*none/s);
  assert.match(css, /@media \(max-width: 767px\) \{\s*\.dilz-tabbar \{ display: grid; \}/);
});

test('dark mode redefines the tab-bar tokens for contrast', () => {
  assert.match(css, /\.dark\s*\{[^}]*--tabbar-surface:\s*rgba\(22, 22, 24/s);
  assert.match(css, /\.dark\s*\{[^}]*--tabbar-active:\s*#FFFFFF/s);
});
