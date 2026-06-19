export const DEAL_SORT_PREFERENCES = ['hot', 'latest', 'comments'];

export function normalizeDealSortPreference(value) {
  return DEAL_SORT_PREFERENCES.includes(value) ? value : 'hot';
}

export function readDealSortPreference() {
  if (typeof window === 'undefined') return 'hot';
  try {
    return normalizeDealSortPreference(window.localStorage.getItem('dilzDealSortPreference'));
  } catch {
    return 'hot';
  }
}

export function writeDealSortPreference(value) {
  const normalized = normalizeDealSortPreference(value);
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem('dilzDealSortPreference', normalized); } catch {}
  }
  return normalized;
}
