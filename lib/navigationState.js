import { normalizeDealSortPreference } from './userPreferences.js';

const DEAL_VIEW_SORTS = ['latest', 'nearby', 'ending', 'comments'];
const ALL_DEAL_SORTS = ['hot', ...DEAL_VIEW_SORTS];

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

export function resolveDealSort({ requestedSort, sessionSort, preferredSort } = {}) {
  if (ALL_DEAL_SORTS.includes(requestedSort)) return requestedSort;
  if (ALL_DEAL_SORTS.includes(sessionSort)) return sessionSort;
  return normalizeDealSortPreference(preferredSort);
}

export function resolveDealLayout({ requestedLayout, savedLayout } = {}) {
  if (requestedLayout === 'list') return 'spotlight';
  if (requestedLayout === 'card' || requestedLayout === 'compact' || requestedLayout === 'spotlight') return requestedLayout;
  if (savedLayout === 'list') return 'spotlight';
  return ['compact', 'spotlight'].includes(savedLayout) ? savedLayout : 'card';
}

export function bottomNavActiveItem({ activeTab, menuOpen = false, alertsOpen = false, postOpen = false } = {}) {
  if (alertsOpen) return 'alerts';
  if (postOpen) return 'post';
  if (menuOpen) return 'explore';
  return activeTab || null;
}

export function bottomNavPanelState(destination, { authenticated = false } = {}) {
  return {
    menuOpen: false,
    postOpen: destination === 'post',
    alertsOpen: destination === 'alerts' && authenticated,
    cityOpen: false,
    notificationsOpen: false,
    promoOpen: false,
    requiresAuth: destination === 'alerts' && !authenticated,
  };
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
