import { normalizeDealSortPreference } from './userPreferences.js';

const DEAL_VIEW_SORTS = ['latest', 'nearby', 'ending', 'comments'];

export function mainDealViewState(preferredSort) {
  return {
    category: 'all',
    collection: 'all',
    myDealsOnly: false,
    sort: normalizeDealSortPreference(preferredSort),
  };
}

export function dealViewState(viewId, preferredSort) {
  if (viewId === 'main') return mainDealViewState(preferredSort);

  const state = { category: 'all', collection: 'all', myDealsOnly: false, sort: 'hot' };
  if (viewId === 'mine') return { ...state, myDealsOnly: true };
  if (DEAL_VIEW_SORTS.includes(viewId)) return { ...state, sort: viewId };
  if (viewId !== 'all') return { ...state, category: viewId };
  return state;
}

export function bottomNavActiveItem({ activeTab, menuOpen = false, alertsOpen = false } = {}) {
  if (alertsOpen) return 'alerts';
  if (menuOpen) return 'menu';
  return activeTab || null;
}

export function sortDealsForView(deals = [], sort = 'hot') {
  if (sort === 'latest') {
    return [...deals].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
  if (sort === 'comments') {
    return [...deals].sort((a, b) => {
      const aCount = Number(a.commentaires?.[0]?.count || 0);
      const bCount = Number(b.commentaires?.[0]?.count || 0);
      return bCount - aCount || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }
  return deals;
}
