import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import { useAppLanguage } from '../../lib/useAppLanguage';
import { BottomNav } from './BottomNav';
import { NotificationSheet } from '../ui/NotificationSheet';
import { activeFromPath, shouldShowNav } from '../../lib/globalBottomNavRoutes.mjs';

export function GlobalBottomNav() {
  const router = useRouter();
  const { lang } = useAppLanguage();
  const [user, setUser] = useState(null);
  const [optimisticActive, setOptimisticActive] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const unreadCount = notifications.filter((notification) => !notification.is_read).length;

  const loadNotifications = useCallback((session) => {
    if (!session?.access_token) {
      setNotifications([]);
      return;
    }
    fetch('/api/notifications', { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!data) return;
        setNotifications(data.notifications || []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setUser(data.session?.user || null);
      loadNotifications(data.session);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      loadNotifications(session);
    });
    return () => {
      alive = false;
      subscription?.subscription?.unsubscribe?.();
    };
  }, [loadNotifications]);

  useEffect(() => {
    const refresh = () => supabase.auth.getSession().then(({ data }) => loadNotifications(data.session));
    const clearOptimistic = () => {
      setOptimisticActive(null);
      refresh();
    };
    const openSheet = () => setSheetOpen(true);
    router.events.on('routeChangeComplete', clearOptimistic);
    router.events.on('routeChangeError', clearOptimistic);
    window.addEventListener('dilz:notifications-read', refresh);
    window.addEventListener('dilz:open-notifications', openSheet);
    return () => {
      router.events.off('routeChangeComplete', clearOptimistic);
      router.events.off('routeChangeError', clearOptimistic);
      window.removeEventListener('dilz:notifications-read', refresh);
      window.removeEventListener('dilz:open-notifications', openSheet);
    };
  }, [loadNotifications, router.events]);

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

  const openNotifications = () => {
    if (!user) { push('/auth?redirect=/alerts', 'alerts'); return; }
    if (activeTab === 'alerts') return; // already viewing the full alerts page
    setSheetOpen(true);
  };

  const markAllRead = () => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
        body: JSON.stringify({ markAllRead: true }),
      }).catch(() => {});
    });
    setNotifications((prev) => prev.map((notification) => ({ ...notification, is_read: true })));
    window.dispatchEvent(new Event('dilz:notifications-read'));
  };

  return (
    <>
      <BottomNav
        lang={lang}
        activeTab={activeTab}
        unreadCount={unreadCount}
        alertsOpen={activeTab === 'alerts' || sheetOpen}
        postOpen={activeTab === 'post'}
        onMenu={() => push('/explore', 'explore')}
        onTab={() => push('/', 'deals', homeOptions)}
        onPost={() => push(user ? '/post' : '/auth?redirect=/post', 'post')}
        onAlerts={openNotifications}
        onProfile={() => push('/?tab=profile', 'profile', homeOptions)}
      />
      {sheetOpen && (
        <NotificationSheet
          user={user}
          lang={lang}
          notifications={notifications}
          onClose={() => setSheetOpen(false)}
          onMarkAllRead={markAllRead}
          onOpenAlerts={() => { setSheetOpen(false); push('/alerts', 'alerts'); }}
        />
      )}
    </>
  );
}
