import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const nav = await readFile(path.join(process.cwd(), 'components', 'layout', 'BottomNav.js'), 'utf8');
const css = await readFile(path.join(process.cwd(), 'styles', 'globals.css'), 'utf8');

// ── Component structure ──────────────────────────────────────────────────

test('the five tabs are declared in the fixed order Deals, Search, Post, Alerts, Profile', () => {
  assert.match(nav, /id: 'deals'[\s\S]*id: 'explore'[\s\S]*id: 'post'[\s\S]*id: 'alerts'[\s\S]*id: 'profile'/);
});

test('Post is the only tab flagged as the primary action', () => {
  assert.match(nav, /id: 'post',[^\n]*post: true/);
  assert.equal((nav.match(/post: true/g) || []).length, 1);
});

test('the bar uses a single sliding loupe element', () => {
  assert.match(nav, /className=\{`dilz-bottom-nav__loupe/);
  // exactly one loupe node
  assert.equal((nav.match(/dilz-bottom-nav__loupe\$\{/g) || []).length, 1);
});

test('the loupe carries swiping, pressed and moving state classes', () => {
  assert.match(nav, /isSwiping \? ' is-swiping' : ''/);
  assert.match(nav, /pressed \? ' is-pressed' : ''/);
  assert.match(nav, /moving \? ' is-moving' : ''/);
});

test('loupe position and size come from the pure helpers, not inline maths', () => {
  assert.match(nav, /from '\.\.\/\.\.\/lib\/bottomNav'/);
  assert.match(nav, /computeLoupeLeftPx\(centers, fraction\)/);
  assert.match(nav, /loupeLeftFallback\(loupeCenter, isRtl\)/);
});

test('button centres are measured with the border correction for exact centering', () => {
  assert.match(nav, /clientLeft/);
  assert.match(nav, /getBoundingClientRect\(\)/);
  assert.match(nav, /requestAnimationFrame\(measure\)/);
  assert.match(nav, /addEventListener\('resize', measure\)/);
});

test('pressing swells the bubble uniformly (same shape) and starts on touch', () => {
  assert.match(nav, /setPressed\(true\)/);
  // uniform scale, not scaleX (which would distort the pill)
  assert.match(nav, /transform: `scale\(\$\{dragSwell/);
  assert.doesNotMatch(nav, /transform: `scaleX\(\$\{dragSwell/);
  assert.match(nav, /const dragSwell = \(pressed \|\| isSwiping\) \? 1\.34 : 1/);
});

test('the selected tab commits on release, not continuously during the drag', () => {
  assert.match(nav, /function handleTouchEnd/);
  assert.match(nav, /if \(target && target\.id !== activeItem\) target\.action\(\)/);
});

test('dragging cannot scroll the page and cannot select text', () => {
  assert.match(css, /\.dilz-bottom-nav__inner[\s\S]*?touch-action:\s*none/);
  assert.match(css, /\.dilz-bottom-nav__inner[\s\S]*?user-select:\s*none/);
});

// ── Icons ───────────────────────────────────────────────────────────────

test('active icons are filled via inline style (beating the global fill:none)', () => {
  assert.match(nav, /const solid = \(active\) => \(\{ fill: active \? 'currentColor' : 'none'/);
  assert.match(nav, /function HomeIcon/);
  assert.match(nav, /function SearchIcon\(\{ active \}\)/);
  assert.match(nav, /function BellIcon/);
  assert.match(nav, /function UserIcon/);
});

test('the Post plus takes an explicit colour prop so it is legible on orange', () => {
  assert.match(nav, /function PlusIcon\(\{ active, color \}\)/);
  assert.match(nav, /stroke: color \|\| 'currentColor'/);
});

test('Post colour is orange by default and white once its bubble is orange', () => {
  assert.match(nav, /const postWhite = item\.post && \(active \|\| postLit\)/);
  assert.match(nav, /postWhite \? '#ffffff' : 'var\(--brand\)'/);
});

test('the profile tab can show the uploaded avatar photo', () => {
  assert.match(nav, /dilz-bottom-nav__avatar/);
  assert.match(nav, /avatar_url/);
});

test('accessibility marks the committed route, not the transient visual state', () => {
  assert.match(nav, /aria-current=\{committed \? 'page' : undefined\}/);
});

test('Hebrew RTL flips the touch axis and the fallback position', () => {
  assert.match(nav, /const isRtl = lang === 'he'/);
  // touch mapping and fallback both receive the RTL flag
  assert.match(nav, /touchToFraction\([^)]*, isRtl\)/);
  assert.match(nav, /loupeLeftFallback\(loupeCenter, isRtl\)/);
});

// ── CSS invariants ────────────────────────────────────────────────────────

test('tab buttons stack above the loupe so the bubble never masks icon or label', () => {
  // loupe sits at z-index 1
  assert.match(css, /\.dilz-bottom-nav__loupe\s*\{[^}]*z-index:\s*1/s);
  // buttons are positioned above it
  assert.match(css, /\.dilz-bottom-nav__item\s*\{[^}]*position:\s*relative;[\s\S]*?z-index:\s*2/s);
});

test('the loupe overshoots the bar (inner is not clipped)', () => {
  assert.match(css, /\.dilz-bottom-nav__inner[\s\S]*?overflow:\s*visible\s*!important/);
});

test('the bar background is translucent so content shows through', () => {
  assert.match(css, /--dilz-tabbar-bg:\s*rgba\(18,\s*18,\s*22,\s*0\.34\)/);   // dark
  assert.match(css, /--dilz-tabbar-bg:\s*rgba\(248,\s*248,\s*250,\s*0\.34\)/); // light
  assert.match(css, /\.dilz-bottom-nav__inner[\s\S]*?backdrop-filter:\s*blur\(5px\) saturate\(170%\)/);
});

test('the water-lens refraction fires on touch and while moving', () => {
  assert.match(css, /\.dilz-bottom-nav__loupe\.is-moving,\s*\.dilz-bottom-nav__loupe\.is-pressed\s*\{[^}]*backdrop-filter:\s*blur/s);
  // iridescent rim ring
  assert.match(css, /\.dilz-bottom-nav__loupe::after\s*\{[^}]*conic-gradient/s);
  assert.match(css, /\.dilz-bottom-nav__loupe\.is-moving::after,\s*\.dilz-bottom-nav__loupe\.is-pressed::after\s*\{[^}]*opacity:\s*0\.6/s);
});

test('selected Post keeps a white plus and label as a CSS safety net', () => {
  assert.match(css, /\.dilz-bottom-nav__item\.is-post\.is-active[\s\S]*?color:\s*#ffffff\s*!important/);
});

test('the bar is pinned to the bottom and stays a fixed, compact height', () => {
  assert.match(css, /--dilz-tabbar-height:\s*80px/);
  assert.match(css, /\.dilz-bottom-nav\s*\{[^}]*position:\s*fixed[^}]*\}/s);
  assert.match(css, /\.dilz-bottom-nav\s*\{[^}]*bottom:\s*0/s);
});
