import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const css = await readFile(path.join(process.cwd(), 'styles', 'globals.css'), 'utf8');
const bottomNav = await readFile(path.join(process.cwd(), 'components', 'layout', 'BottomNav.js'), 'utf8');

test('mobile navigation uses the larger premium bar contract', () => {
  assert.match(css, /height:\s*calc\(90px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(css, /padding-bottom:\s*calc\(6px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(css, /\.dilz-bottom-nav__item\.is-active::before\s*\{[^}]*background:\s*var\(--brand-soft\)/s);
  assert.match(bottomNav, /aria-current=\{active \? 'page' : undefined\}/);
});

test('the Post action remains the orange primary action in dark mode', () => {
  assert.match(css, /\.dark \.dilz-bottom-nav__item\.is-post \.dilz-bottom-nav__icon\s*\{[^}]*background:\s*var\(--brand\) !important/s);
});

test('dark cards use the elevated border contrast token', () => {
  assert.match(css, /\.dark \.dilz-card,[\s\S]*?border-color:\s*#3A4D67 !important/);
  assert.match(css, /--border-strong:\s*#4A607C/);
});

test('the menu sheet ends above the visible mobile navigation', () => {
  assert.match(css, /\.dilz-main-menu__backdrop\{[^}]*inset:0 0 calc\(90px \+ env\(safe-area-inset-bottom\)\)/s);
  assert.match(css, /\.dilz-main-menu__backdrop\{[^}]*z-index:900/s);
});

test('deal count remains legible in dark mode', () => {
  assert.match(css, /\.dark \.dilz-view-switcher__count\s*\{[^}]*background:\s*#1A2A40[^}]*color:\s*#F8FAFC/s);
});
