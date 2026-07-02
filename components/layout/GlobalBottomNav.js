import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import { useAppLanguage } from '../../lib/useAppLanguage';
import { BottomNav } from './BottomNav';

const NAV_ROUTES = new Set(['/', '/explore', '/alerts', '/post']);

function activeFromPath(asPath = '', pathname = '') {
  const path = String(asPath || pathname || '').split('?')[0] || '/';
  if (path === '/explore') return 'explore';
  if (path === '/alerts') return 'alerts';
  if (path === '/post') return 'post';
  if (path === '/') {
    const query = String(asPath || '').split('?')[1] || '';
    const tab = new URLSearchParams(query).get('tab');
    return tab === 'profile' ? 'profile' : 'deals';
  }
  return null;
}

function shouldShowNav(asPath = '', pathname = '') {
  const path = String(asPath || pathname || '').split('?')[0] || '/';
  return NAV_ROUTES.has(path);
}

export function GlobalBottomNav() {
  const router = useRouter();
  const { lang } = useAppLanguage();
  const [user, setUser] = useState(null);
  const [optimisticActive, setOptimisticActive] = useState(null);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setUser(data.session?.user || null);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => {
      alive = false;
      subscription?.subscription?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    const clearOptimistic = () => setOptimisticActive(null);
    router.events.on('routeChangeComplete', clearOptimistic);
    router.events.on('routeChangeError', clearOptimistic);
    return () => {
      router.events.off('routeChangeComplete', clearOptimistic);
      router.events.off('routeChangeError', clearOptimistic);
    };
  }, [router.events]);

  const routeActive = useMemo(
    () => activeFromPath(router.asPath, router.pathname),
    [router.asPath, router.pathname],
  );
  const visible = shouldShowNav(router.asPath, router.pathname);
  if (!visible) return null;

  const activeTab = optimisticActive || routeActive || 'deals';
  const push = (href, active, options = {}) => {
    setOptimisticActive(active);
    router.push(href, undefined, options).catch(() => setOptimisticActive(null));
  };
  const homeOptions = router.pathname === '/' ? { shallow: true, scroll: false } : undefined;

  return (
    <BottomNav
      lang={lang}
      activeTab={activeTab}
      alertsOpen={activeTab === 'alerts'}
      postOpen={activeTab === 'post'}
      onMenu={() => push('/explore', 'explore')}
      onTab={() => push('/', 'deals', homeOptions)}
      onPost={() => push(user ? '/post' : '/auth?redirect=/post', 'post')}
      onAlerts={() => push(user ? '/alerts' : '/auth?redirect=/alerts', 'alerts')}
      onProfile={() => push('/?tab=profile', 'profile', homeOptions)}
    />
  );
}

