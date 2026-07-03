import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const nav = await readFile(path.join(process.cwd(), 'components', 'layout', 'BottomNav.js'), 'utf8');
const css = await readFile(path.join(process.cwd(), 'styles', 'globals.css'), 'utf8');

// ── Component structure ──────────────────────────────────────────────────

test('the five tabs are declared in the fixed order Deals, Explore, Post, Alerts, Profile', () => {
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

test('the loupe carries swiping and pressed state classes', () => {
  assert.match(nav, /isSwiping \? ' is-swiping' : ''/);
  assert.match(nav, /pressed \? ' is-pressed' : ''/);
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
  // uniform swell via transform scale() (not scaleX, which distorts)
  assert.match(nav, /transform: `translateX\(\$\{pos\}\) scale\(\$\{dragSwell\.toFixed\(3\)\}\)`/);
  assert.doesNotMatch(nav, /scaleX/);
  assert.match(nav, /const dragSwell = \(pressed \|\| isSwiping\) \? 1\.34 : 1/);
});

test('the loupe is positioned via GPU transform, not Firefox-risky individual transform properties or layout-thrashing left', () => {
  assert.match(nav, /transform: `translateX\(\$\{pos\}\) scale\(\$\{dragSwell\.toFixed\(3\)\}\)`/);
  assert.match(nav, /transformOrigin: 'center center'/);
  assert.match(nav, /transform \$\{glideMs\}ms \$\{ease\}/);
  assert.doesNotMatch(nav, /translate: pos/);
  assert.doesNotMatch(nav, /scale: `\$\{dragSwell\.toFixed\(3\)\}`/);
  assert.doesNotMatch(css, /\.dilz-bottom-nav__loupe\s*\{[^}]*translate 320ms linear/s);
});

test('touch focuses the bubble under the finger before release navigation', () => {
  assert.match(nav, /const \[touchFocusCenter, setTouchFocusCenter\] = useState\(null\)/);
  assert.match(nav, /setPressed\(true\);\s*\/\/ swell immediately on touch/);
  assert.match(nav, /persistedIdx = pos;\s*tapFocusRef\.current = \{ from: activeIdx, target: snapIndex\(pos\) \};\s*setTouchFocusCenter\(pos\)/);
  assert.match(nav, /setTouchFocusCenter\(pos\)/);
  assert.match(nav, /const loupeCenter = isSwiping \? swipeCenter : \(touchFocusing \? touchFocusCenter : restIdx\)/);
  assert.match(nav, /transform \$\{glideMs\}ms \$\{ease\}/);
  assert.match(nav, /const ease = 'cubic-bezier\(0\.33, 0, 0\.2, 1\)'/);
  assert.match(nav, /const glideMs = 320/);
  assert.doesNotMatch(nav, /const translateEase = 'linear'/);
  assert.doesNotMatch(nav, /translate \$\{glideMs\}ms \$\{translateEase\}/);
  assert.doesNotMatch(nav, /touchFocusing \? 180 : glideMs/);
});

test('stale tap focus clears when navigation commits to a different tab', () => {
  assert.match(nav, /const tapFocusRef = useRef\(null\)/);
  assert.match(nav, /tapFocusRef\.current = \{ from: activeIdx, target: snapIndex\(pos\) \}/);
  assert.match(nav, /const focusedIdx = snapIndex\(touchFocusCenter\)/);
  assert.match(nav, /if \(focusedIdx !== activeIdx\) \{[\s\S]*const pending = tapFocusRef\.current[\s\S]*activeIdx !== pending\.from[\s\S]*tapFocusRef\.current = null;[\s\S]*setTouchFocusCenter\(null\)/);
  assert.match(nav, /\}, \[activeIdx, isSwiping, pressed, touchFocusCenter\]\)/);
});

test('bubble position is derived from a controlled resting centre, not a drifting state', () => {
  // while resting, position comes from a committed centre that only changes on rAF
  assert.match(nav, /const loupeCenter = isSwiping \? swipeCenter : \(touchFocusing \? touchFocusCenter : restIdx\)/);
  assert.match(nav, /const \[restCenter, setRestCenter\] = useState\(startIdx\)/);
  // and unresolved active items hold the last real tab (never snap to deals=0)
  assert.match(nav, /const rawActiveIdx = items\.findIndex/);
  assert.match(nav, /activeIdx = rawActiveIdx >= 0 \? rawActiveIdx : lastValidIdx\.current/);
});

test('close tab changes still get a previous frame before the new translate', () => {
  assert.match(nav, /requestAnimationFrame\(\(\) => \{\s*setGlide\(true\);\s*setRestCenter\(activeIdx\);/);
  assert.doesNotMatch(nav, /const restIdx = glide \? activeIdx : startIdx/);
  assert.match(nav, /transition: \(isSwiping \|\| !glide \|\| !centers\)/);
});

test('the bubble glides across page navigations from its previous position', () => {
  // position persisted at module scope so the next page mount can glide from it
  assert.match(nav, /let persistedIdx = null/);
  assert.match(nav, /persistedIdx = activeIdx/);
  assert.match(nav, /persistedIdx = pos;\s*tapFocusRef\.current = \{ from: activeIdx, target: snapIndex\(pos\) \};\s*setTouchFocusCenter\(pos\)/);
  assert.match(nav, /persistedIdx = idx;[\s\S]*?target\.action\(\)/);
  assert.match(nav, /const startIdx = persistedIdx == null \? activeIdx : persistedIdx/);
  assert.match(nav, /const restIdx = restCenter/);
});

test('the whole bar swells while interacted with (not individual icons)', () => {
  // zoom is tied to the finger being down only — never to `moving`, so a slow
  // page load after a tap can't keep the bar zoomed
  assert.match(nav, /const barZoom = pressed;/);
  assert.match(nav, /dilz-bottom-nav__inner\$\{barZoom \? ' is-zoomed' : ''\}/);
  assert.match(css, /\.dilz-bottom-nav__inner\.is-zoomed\s*\{[^}]*transform:\s*scale\(1\.018\)/s);
  // no per-icon dock magnification anymore
  assert.doesNotMatch(nav, /dockScale\(idx/);
});

test('no press-shrink on the nav buttons (would fight the zoom)', () => {
  assert.doesNotMatch(css, /\.dilz-bottom-nav__item:active\s*\{[^}]*transform:\s*scale\(0\.95\)/s);
  assert.doesNotMatch(css, /\.dilz-bottom-nav__item\.is-post:active[^}]*transform:\s*scale\(0\.94\)/s);
});

test('the selected tab commits on release, not continuously during the drag', () => {
  assert.match(nav, /function handleTouchEnd/);
  assert.match(nav, /if \(target && target\.id !== activeItem\) target\.action\(\)/);
  assert.doesNotMatch(nav, /function handleTouchStart(?:(?!function handleTouchMove)[\s\S])*target\.action\(\)/);
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

test('Post tint is intentional, not triggered by an automatic pass over Post', () => {
  assert.match(nav, /const manualPostFocus = isSwiping \|\| touchFocusing/);
  assert.match(nav, /const routeUsesPost = activeIdx === POST_IDX \|\| transitionFromPost/);
  assert.match(nav, /const postTint = manualPostFocus \? computePostTint\(loupeCenter\) : \(routeUsesPost \? 1 : 0\)/);
  assert.match(nav, /const postLit = manualPostFocus \? computePostLit\(loupeCenter\) : routeUsesPost/);
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

test('the loupe is a CLEAR glass lens on touch/move (no frosted blur)', () => {
  // clear lens: saturate/brightness only, NOT a frosting blur
  assert.match(css, /\.dilz-bottom-nav__loupe\.is-moving,\s*\.dilz-bottom-nav__loupe\.is-pressed\s*\{[^}]*backdrop-filter:\s*saturate/s);
  assert.doesNotMatch(css, /\.dilz-bottom-nav__loupe\.is-moving,\s*\.dilz-bottom-nav__loupe\.is-pressed\s*\{[^}]*backdrop-filter:\s*blur/s);
  // no frosted white gradient fill on the drop itself
  assert.doesNotMatch(css, /\.dilz-bottom-nav__loupe\s*\{[^}]*linear-gradient\(180deg/s);
  // iridescent rim ring still there
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
