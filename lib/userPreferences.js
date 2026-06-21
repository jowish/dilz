export const DEAL_SORT_PREFERENCES = ['hot', 'latest', 'comments'];
export const DEAL_LAYOUT_PREFERENCES = ['card', 'compact', 'list'];
export const SESSION_DEAL_SORTS = ['hot', 'latest', 'nearby', 'ending', 'comments'];

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

export function normalizeDealLayoutPreference(value) {
  return DEAL_LAYOUT_PREFERENCES.includes(value) ? value : 'card';
}

export function readDealLayoutPreference() {
  if (typeof window === 'undefined') return 'card';
  try {
    return normalizeDealLayoutPreference(window.localStorage.getItem('dilzDealLayout'));
  } catch {
    return 'card';
  }
}

export function writeDealLayoutPreference(value) {
  const normalized = normalizeDealLayoutPreference(value);
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem('dilzDealLayout', normalized); } catch {}
  }
  return normalized;
}

export function readSessionDealSort() {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.sessionStorage.getItem('dilzSessionDealSort');
    return SESSION_DEAL_SORTS.includes(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeSessionDealSort(value) {
  const normalized = SESSION_DEAL_SORTS.includes(value) ? value : null;
  if (typeof window !== 'undefined' && normalized) {
    try { window.sessionStorage.setItem('dilzSessionDealSort', normalized); } catch {}
  }
  return normalized;
}
