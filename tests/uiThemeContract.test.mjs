import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const css = await readFile(path.join(process.cwd(), 'styles', 'globals.css'), 'utf8');
const bottomNav = await readFile(path.join(process.cwd(), 'components', 'layout', 'BottomNav.js'), 'utf8');

test('mobile navigation uses the lighter premium bar contract', () => {
  assert.match(css, /height:\s*calc\(78px \+ env\(safe-area-inset-bottom\)\)\s*!important/);
  assert.match(css, /padding:\s*7px 12px calc\(9px \+ env\(safe-area-inset-bottom\)\)\s*!important/);
  assert.match(css, /\.dilz-bottom-nav\s*\{[^}]*bottom:\s*0/s);
  assert.match(css, /\.dilz-bottom-nav__item\.is-active::before\s*\{[^}]*background:\s*var\(--brand-soft\)\s*!important/s);
  assert.match(bottomNav, /aria-current=\{active \? 'page' : undefined\}/);
});

test('the Post action remains the orange primary action in dark mode', () => {
  assert.match(css, /\.dark \.dilz-bottom-nav__item\.is-post \.dilz-bottom-nav__icon\s*\{[^}]*background:\s*var\(--brand\) !important/s);
  assert.match(css, /box-shadow:\s*0 8px 22px rgba\(249,\s*115,\s*22,\s*0\.22\)\s*!important/);
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

test('the menu sheet ends above the visible mobile navigation', () => {
  assert.match(css, /\.dilz-main-menu__backdrop\{[^}]*inset:0 0 calc\(96px \+ env\(safe-area-inset-bottom\)\)/s);
  assert.match(css, /\.dilz-main-menu__backdrop\{[^}]*z-index:900/s);
});

test('deal count remains legible in dark mode', () => {
  assert.match(css, /\.dilz-view-switcher__count,[\s\S]*?background:\s*var\(--bg-input\)\s*!important/s);
});

test('desktop pages keep the document as the only vertical scroller', () => {
  assert.match(css, /html\s*\{[^}]*overflow-y:\s*scroll/s);
  assert.match(css, /body\s*\{[^}]*overflow:\s*visible/s);
  assert.match(css, /#__(?:next|NEXT)\s*\{[^}]*overflow:\s*visible/s);
  assert.match(css, /body,\s*#__next\s*\{\s*overflow:\s*visible;\s*\}/s);
  assert.doesNotMatch(css, /html,\s*body,\s*#__next\s*\{[^}]*overflow-y:\s*auto/s);
});
