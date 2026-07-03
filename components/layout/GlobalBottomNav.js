import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import { useAppLanguage } from '../../lib/useAppLanguage';
import { BottomNav } from './BottomNav';
import { activeFromPath, shouldShowNav } from '../../lib/globalBottomNavRoutes.mjs';

export function GlobalBottomNav() {
  const router = useRouter();
  const { lang } = useAppLanguage();
  const [user, setUser] = useState(null);
  const [optimisticActive, setOptimisticActive] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnreadCount = useCallback((session) => {
    if (!session?.access_token) {
      setUnreadCount(0);
      return;
    }
    fetch('/api/notifications', { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!data) return;
        setUnreadCount((data.notifications || []).filter((notification) => !notification.is_read).length);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setUser(data.session?.user || null);
      loadUnreadCount(data.session);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      loadUnreadCount(session);
    });
    return () => {
      alive = false;
      subscription?.subscription?.unsubscribe?.();
    };
  }, [loadUnreadCount]);

  useEffect(() => {
    const refreshUnread = () => supabase.auth.getSession().then(({ data }) => loadUnreadCount(data.session));
    const clearOptimistic = () => {
      setOptimisticActive(null);
      refreshUnread();
    };
    router.events.on('routeChangeComplete', clearOptimistic);
    router.events.on('routeChangeError', clearOptimistic);
    window.addEventListener('dilz:notifications-read', refreshUnread);
    return () => {
      router.events.off('routeChangeComplete', clearOptimistic);
      router.events.off('routeChangeError', clearOptimistic);
      window.removeEventListener('dilz:notifications-read', refreshUnread);
    };
  }, [loadUnreadCount, router.events]);

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
      unreadCount={unreadCount}
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
