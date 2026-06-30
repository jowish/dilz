import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const css = await readFile(path.join(process.cwd(), 'styles', 'globals.css'), 'utf8');
const bottomNav = await readFile(path.join(process.cwd(), 'components', 'layout', 'BottomNav.js'), 'utf8');

test('mobile navigation uses the larger premium bar contract', () => {
  assert.match(css, /height:\s*calc\(90px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(css, /padding-bottom:\s*calc\(6px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(css, /\.dilz-bottom-nav\s*\{[^}]*bottom:\s*0/s);
  assert.match(css, /\.dilz-bottom-nav__item\.is-active::before\s*\{[^}]*background:\s*var\(--brand-soft\)/s);
  assert.match(bottomNav, /aria-current=\{active \? 'page' : undefined\}/);
});

test('the Post action remains the orange primary action in dark mode', () => {
  assert.match(css, /\.dark \.dilz-bottom-nav__item\.is-post \.dilz-bottom-nav__icon\s*\{[^}]*background:\s*var\(--brand\) !important/s);
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

test('SmoothUI-inspired polish stays CSS-only and motion-safe', () => {
  assert.match(css, /SmoothUI-inspired visual polish layer/);
  assert.match(css, /--smooth-ease:\s*cubic-bezier\(0\.22,\s*1,\s*0\.36,\s*1\)/);
  assert.match(css, /\.dilz-deal-card:hover,[\s\S]*?transform:\s*translateY\(-2px\)/);
  assert.match(css, /\.dilz-deal-card:hover \.dilz-deal-card__media img,[\s\S]*?transform:\s*scale\(1\.035\)/);
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.dilz-deal-card:hover,[\s\S]*?transform:\s*none !important/);
});

test('SmoothUI-inspired navigation and inputs keep premium accessible states', () => {
  assert.match(css, /\.dilz-bottom-nav\s*\{[^}]*pointer-events:\s*none/s);
  assert.match(css, /\.dilz-bottom-nav__inner\s*\{[^}]*pointer-events:\s*auto/s);
  assert.match(css, /\.dilz-bottom-nav__item\.is-post \.dilz-bottom-nav__icon,[\s\S]*?background:\s*var\(--brand\) !important/s);
  assert.match(css, /\.dilz-search-bar:focus-within,[\s\S]*?box-shadow:\s*var\(--smooth-focus-ring\) !important/s);
  assert.match(css, /\.dilz-layout-toggle button\.is-active\s*\{[^}]*color:\s*var\(--brand\) !important/s);
});

test('the menu sheet ends above the visible mobile navigation', () => {
  assert.match(css, /\.dilz-main-menu__backdrop\{[^}]*inset:0 0 calc\(96px \+ env\(safe-area-inset-bottom\)\)/s);
  assert.match(css, /\.dilz-main-menu__backdrop\{[^}]*z-index:900/s);
});

test('deal count remains legible in dark mode', () => {
  assert.match(css, /\.dark \.dilz-view-switcher__count\s*\{[^}]*background:\s*#1A2A40[^}]*color:\s*#F8FAFC/s);
});

test('desktop pages keep the document as the only vertical scroller', () => {
  assert.match(css, /html\s*\{[^}]*overflow-y:\s*scroll/s);
  assert.match(css, /body\s*\{[^}]*overflow:\s*visible/s);
  assert.match(css, /#__(?:next|NEXT)\s*\{[^}]*overflow:\s*visible/s);
  assert.match(css, /body,\s*#__next\s*\{\s*overflow:\s*visible;\s*\}/s);
  assert.doesNotMatch(css, /html,\s*body,\s*#__next\s*\{[^}]*overflow-y:\s*auto/s);
});
