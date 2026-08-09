const NAV_ROUTES = new Set([
  '/',
  '/alerts',
  '/bons-plans',
  '/bons-plans-shopping',
  '/codes-promo',
  '/explore',
  '/gratuit',
  '/map',
  '/post',
  '/profil',
]);

const NAV_PREFIXES = ['/deal/', '/shopping-deal/', '/user/'];

export function activeFromPath(asPath = '', pathname = '') {
  const path = String(asPath || pathname || '').split('?')[0] || '/';
  if (path === '/alerts') return 'alerts';
  if (path === '/post') return 'post';
  if (path === '/profil' || path.startsWith('/user/')) return 'profile';
  if (path === '/explore' || path === '/bons-plans' || path === '/bons-plans-shopping' || path === '/codes-promo' || path === '/gratuit' || path.startsWith('/shopping-deal/')) return 'explore';
  if (path === '/map' || path.startsWith('/deal/')) return 'deals';
  if (path === '/') {
    const query = String(asPath || '').split('?')[1] || '';
    const tab = new URLSearchParams(query).get('tab');
    return tab === 'profile' ? 'profile' : 'deals';
  }
  return null;
}

export function shouldShowNav(asPath = '', pathname = '') {
  const path = String(asPath || pathname || '').split('?')[0] || '/';
  return NAV_ROUTES.has(path) || NAV_PREFIXES.some((prefix) => path.startsWith(prefix));
}
