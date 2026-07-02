// Pure, framework-free logic for the mobile bottom navigation bar.
// Extracted from components/layout/BottomNav.js so the maths can be unit tested
// independently of React — this is what guards the bar against regressions.

export const TAB_COUNT = 5;
export const LOUPE_WIDTH = 72;
export const POST_IDX = 2;
export const EASE_FACTOR = 0.16;      // rAF exponential ease toward the target tab
export const EASE_DONE = 0.004;       // snap threshold
export const DOCK_RANGE = 1.3;        // how many tabs away the magnification reaches
export const DOCK_PEAK = 0.26;        // extra scale at the loupe centre (1 + 0.26)
export const POST_TINT_SPAN = 0.65;   // distance over which the bubble fades to orange
export const POST_LIT_THRESHOLD = 0.4; // tint above which plus + label go white
export const SWIPE_START_PX = 10;     // horizontal movement before a swipe engages

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Percentage-based fallback used for the very first paint (before the real
// button centres are measured).
export function loupeLeftFallback(center) {
  return `calc(${((center + 0.5) / TAB_COUNT) * 100}% - ${LOUPE_WIDTH / 2}px)`;
}

// Dock magnification: an icon grows as the loupe approaches, peaking when the
// loupe is centred on it.
export function dockScale(itemIdx, center) {
  const dist = Math.abs(itemIdx - center);
  if (dist >= DOCK_RANGE) return 1;
  return 1 + ((DOCK_RANGE - dist) / DOCK_RANGE) * DOCK_PEAK;
}

// Interpolate the loupe's left (px) for a fractional tab index using the
// measured button centres. Returns null when centres aren't measured yet.
export function loupeLeftPx(centers, fraction) {
  if (!centers || centers.length !== TAB_COUNT) return null;
  const clamped = clamp(fraction, 0, TAB_COUNT - 1);
  const lo = Math.floor(clamped);
  const hi = Math.min(TAB_COUNT - 1, lo + 1);
  const t = clamped - lo;
  const cx = centers[lo] + (centers[hi] - centers[lo]) * t;
  return cx - LOUPE_WIDTH / 2;
}

// How orange the bubble is (0..1) given the loupe centre.
export function postTint(center, postIdx = POST_IDX) {
  return clamp((POST_TINT_SPAN - Math.abs(center - postIdx)) / POST_TINT_SPAN, 0, 1);
}

// Whether the Post plus + label should be white (legible on the orange bubble).
export function postLit(center, postIdx = POST_IDX) {
  return postTint(center, postIdx) > POST_LIT_THRESHOLD;
}

// One exponential-ease step of the animated centre toward the target.
export function easeCenter(cur, target) {
  const next = cur + (target - cur) * EASE_FACTOR;
  const done = Math.abs(target - next) < EASE_DONE;
  return { value: done ? target : next, done };
}

// Map a touch x offset within the bar to a fractional tab index.
export function touchToFraction(relX, innerWidth) {
  if (!innerWidth) return 0;
  return clamp((relX / innerWidth) * TAB_COUNT - 0.5, 0, TAB_COUNT - 1);
}

// Snap a fractional position to the nearest tab index.
export function snapIndex(pos) {
  return Math.round(clamp(pos, 0, TAB_COUNT - 1));
}

// The tab that should look selected right now.
export function visualActiveIndex(center, activeIdx, moving) {
  return moving ? clamp(Math.round(center), 0, TAB_COUNT - 1) : activeIdx;
}
