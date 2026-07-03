export const THEME_STORAGE_KEY = 'dilzTheme';
export const THEME_VALUES = Object.freeze(['light', 'dark', 'system']);

export function normalizeTheme(value) {
  return THEME_VALUES.includes(value) ? value : 'system';
}

export function getNextTheme(value) {
  return normalizeTheme(value) === 'dark' ? 'light' : 'dark';
}
