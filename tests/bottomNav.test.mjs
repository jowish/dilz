import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TAB_COUNT,
  LOUPE_WIDTH,
  POST_IDX,
  DOCK_PEAK,
  DOCK_RANGE,
  clamp,
  loupeLeftFallback,
  dockScale,
  loupeLeftPx,
  postTint,
  postLit,
  easeCenter,
  touchToFraction,
  snapIndex,
  visualActiveIndex,
} from '../lib/bottomNav.js';

test('bar has exactly five tabs, loupe is 72px, Post is the middle tab', () => {
  assert.equal(TAB_COUNT, 5);
  assert.equal(LOUPE_WIDTH, 72);
  assert.equal(POST_IDX, 2);
});

test('clamp keeps values inside the range', () => {
  assert.equal(clamp(-3, 0, 4), 0);
  assert.equal(clamp(9, 0, 4), 4);
  assert.equal(clamp(2, 0, 4), 2);
});

test('dockScale peaks at the loupe center and decays to 1 outside its range', () => {
  assert.equal(dockScale(2, 2), 1 + DOCK_PEAK);            // dead centre
  assert.equal(dockScale(0, 2), 1);                        // far away → no zoom
  assert.equal(dockScale(2, 2 + DOCK_RANGE), 1);           // exactly at edge → 1
  assert.equal(dockScale(2, 5), 1);                        // beyond edge → 1
  // symmetric around the centre
  assert.equal(dockScale(1, 2), dockScale(3, 2));
  // closer means bigger
  assert.ok(dockScale(2, 2.3) > dockScale(2, 2.8));
  // never shrinks
  for (let c = 0; c <= 4; c += 0.25) {
    for (let i = 0; i < 5; i++) assert.ok(dockScale(i, c) >= 1);
  }
});

test('loupeLeftFallback centres the loupe on each tab as a calc() string', () => {
  assert.equal(loupeLeftFallback(0), 'calc(10% - 36px)');
  assert.equal(loupeLeftFallback(2), 'calc(50% - 36px)');
  assert.equal(loupeLeftFallback(4), 'calc(90% - 36px)');
});

test('loupeLeftPx returns null until the five centres are measured', () => {
  assert.equal(loupeLeftPx(null, 2), null);
  assert.equal(loupeLeftPx([], 2), null);
  assert.equal(loupeLeftPx([10, 20, 30], 1), null); // wrong length
});

test('loupeLeftPx lands the loupe on the measured centre minus half its width', () => {
  const centers = [40, 120, 200, 280, 360];
  assert.equal(loupeLeftPx(centers, 0), 40 - 36);
  assert.equal(loupeLeftPx(centers, 2), 200 - 36);
  assert.equal(loupeLeftPx(centers, 4), 360 - 36);
});

test('loupeLeftPx interpolates linearly between two tabs mid-swipe', () => {
  const centers = [40, 120, 200, 280, 360];
  // halfway between tab 0 (40) and tab 1 (120) → 80, minus half width
  assert.equal(loupeLeftPx(centers, 0.5), 80 - 36);
  // a quarter of the way from tab 2 to tab 3
  assert.equal(loupeLeftPx(centers, 2.25), 220 - 36);
});

test('loupeLeftPx clamps out-of-range fractions to the end tabs', () => {
  const centers = [40, 120, 200, 280, 360];
  assert.equal(loupeLeftPx(centers, -2), 40 - 36);
  assert.equal(loupeLeftPx(centers, 99), 360 - 36);
});

test('postTint is 1 on Post, fades with distance, and never leaves 0..1', () => {
  assert.equal(postTint(2), 1);
  assert.equal(postTint(0), 0);
  assert.equal(postTint(4), 0);
  assert.ok(postTint(1.6) > 0 && postTint(1.6) < 1);
  for (let c = -1; c <= 6; c += 0.1) {
    const t = postTint(c);
    assert.ok(t >= 0 && t <= 1);
  }
});

test('postLit turns white only once the bubble is clearly orange near Post', () => {
  assert.equal(postLit(2), true);      // centred → white
  assert.equal(postLit(0), false);     // on Deals → orange
  assert.equal(postLit(4), false);     // on Profile → orange
  assert.equal(postLit(1), false);     // one tab away → still orange
});

test('easeCenter moves toward the target and reports completion near it', () => {
  const step = easeCenter(0, 4);
  assert.ok(step.value > 0 && step.value < 4);  // moved partway
  assert.equal(step.done, false);
  const near = easeCenter(3.999, 4);
  assert.equal(near.done, true);
  assert.equal(near.value, 4);                  // snaps exactly to target
});

test('easeCenter converges to the target within a bounded number of steps', () => {
  let cur = 0;
  let steps = 0;
  let done = false;
  while (!done && steps < 200) {
    ({ value: cur, done } = easeCenter(cur, 4));
    steps++;
  }
  assert.equal(done, true);
  assert.equal(cur, 4);
  assert.ok(steps < 100, `converged in ${steps} steps`);
});

test('touchToFraction maps the bar width onto tab indices and clamps the ends', () => {
  const w = 500; // 5 tabs → 100px each, centres at 50,150,250,350,450
  assert.equal(touchToFraction(50, w), 0);    // first tab centre
  assert.equal(touchToFraction(250, w), 2);   // middle (Post)
  assert.equal(touchToFraction(450, w), 4);   // last tab centre
  assert.equal(touchToFraction(-30, w), 0);   // before the bar → clamp
  assert.equal(touchToFraction(9999, w), 4);  // past the bar → clamp
  assert.equal(touchToFraction(100, 0), 0);   // zero width guard
});

test('snapIndex rounds to the nearest tab and stays in range', () => {
  assert.equal(snapIndex(1.4), 1);
  assert.equal(snapIndex(1.6), 2);
  assert.equal(snapIndex(-5), 0);
  assert.equal(snapIndex(50), 4);
});

test('visualActiveIndex follows the moving loupe but rests on the committed tab', () => {
  // idle → the committed active tab, regardless of center drift
  assert.equal(visualActiveIndex(1.7, 0, false), 0);
  // moving → the tab nearest the loupe centre
  assert.equal(visualActiveIndex(1.7, 0, true), 2);
  assert.equal(visualActiveIndex(3.2, 0, true), 3);
  // clamped in range while moving
  assert.equal(visualActiveIndex(99, 0, true), 4);
  assert.equal(visualActiveIndex(-99, 0, true), 0);
});
