const PROFILE_VIEWS = new Set(['all', 'deals', 'settings']);

export function normalizeProfileView(value) {
  const requested = Array.isArray(value) ? value[0] : value;
  return PROFILE_VIEWS.has(requested) ? requested : 'all';
}

export function profileViewVisibility(value) {
  const view = normalizeProfileView(value);
  return {
    view,
    showDeals: view !== 'settings',
    showSettings: view !== 'deals',
  };
}

export function profileBackFallback(historyLength) {
  return Number(historyLength) > 1 ? null : '/?tab=profile';
}
