export const THEME_STORAGE_KEY = 'dilzTheme';
export const THEME_VALUES = Object.freeze(['light', 'dark', 'warm', 'system']);

/* The themes next-themes may put on <html> as a class. 'system' is not one
   of them — it resolves to light or dark — so it is excluded here while
   staying a selectable preference in THEME_VALUES. */
export const THEME_CLASSES = Object.freeze(['light', 'dark', 'warm']);

export function normalizeTheme(value) {
  return THEME_VALUES.includes(value) ? value : 'system';
}

/* The header toggle is a two-state light/dark switch, so it stays on that
   axis: from anywhere that is not dark (warm included) it goes to dark.
   Warm is chosen deliberately in account settings, not cycled into. */
export function getNextTheme(value) {
  return normalizeTheme(value) === 'dark' ? 'light' : 'dark';
}
