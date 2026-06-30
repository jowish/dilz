export const THEME_STORAGE_KEY = 'dilzTheme';
export const THEME_VALUES = Object.freeze(['light', 'dark']);

export function normalizeTheme(value) {
  return THEME_VALUES.includes(value) ? value : 'light';
}

export function getNextTheme(value) {
  return normalizeTheme(value) === 'dark' ? 'light' : 'dark';
}
