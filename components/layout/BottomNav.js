import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import { bottomNavActiveItem } from '../../lib/navigationState';

// A standard iOS-style tab bar: a fixed, full-width, translucent blurred bar
// pinned to the bottom edge with a hairline separator on top. Five evenly
// spaced tabs, each an icon over a small label; the selected tab uses a filled
// icon and the active tint, the rest an outline icon in muted grey — exactly
// the selected/unselected SF Symbols convention. No floating pill, no sliding
// bubble, no swipe gestures.
export function BottomNav({ lang = 'en', activeTab, menuOpen = false, alertsOpen = false, postOpen = false, avatarUrl: avatarProp, unreadCount = 0, onMenu, onTab, onPost, onAlerts, onProfile }) {
  const isRtl = lang === 'he';
  const labels = lang === 'he'
    ? { search: 'חיפוש', deals: 'דילים', post: 'פרסום', alerts: 'התראות', profile: 'פרופיל', nav: 'ניווט מובייל' }
    : { search: 'Explore', deals: 'Deals', post: 'Post', alerts: 'Alerts', profile: 'Profile', nav: 'Mobile navigation' };

  const items = [
    { id: 'deals',   label: labels.deals,   action: () => onTab('deals'), Icon: HomeIcon },
    { id: 'explore', label: labels.search,  action: onMenu,               Icon: SearchIcon },
    { id: 'post',    label: labels.post,    action: onPost,               Icon: PlusIcon },
    { id: 'alerts',  label: labels.alerts,  action: onAlerts,             Icon: BellIcon },
    { id: 'profile', label: labels.profile, action: onProfile,            Icon: UserIcon },
  ];

  const activeItem = bottomNavActiveItem({ activeTab, menuOpen, alertsOpen, postOpen });

  // Avatar: use prop if provided, otherwise read from the auth session.
  const [avatarUrl, setAvatarUrl] = useState(avatarProp || '');
  useEffect(() => {
    if (avatarProp !== undefined) { setAvatarUrl(avatarProp || ''); return; }
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setAvatarUrl(data.session?.user?.user_metadata?.avatar_url || '');
    });
    return () => { alive = false; };
  }, [avatarProp]);

  // Prefetch every destination so switching tabs is instant.
  const router = useRouter();
  useEffect(() => {
    ['/', '/explore', '/post', '/alerts'].forEach((r) => {
      try { router.prefetch(r); } catch {}
    });
  }, [router]);

  return (
    <nav className="dilz-tabbar" aria-label={labels.nav} dir={isRtl ? 'rtl' : 'ltr'}>
      {items.map((item) => {
        const committed = activeItem === item.id;
        const { Icon } = item;
        return (
          <button
            key={item.id}
            type="button"
            className={['dilz-tabbar__item', committed && 'is-active'].filter(Boolean).join(' ')}
            onClick={item.action}
            aria-label={item.label}
            aria-current={committed ? 'page' : undefined}
          >
            <span className="dilz-tabbar__icon">
              {item.id === 'profile' && avatarUrl
                ? <img src={avatarUrl} alt="" className="dilz-tabbar__avatar" draggable={false} />
                : <Icon active={committed} />}
              {item.id === 'alerts' && unreadCount > 0 && (
                <span className="dilz-tabbar__badge" aria-label={`${unreadCount} unread notifications`}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </span>
            <span className="dilz-tabbar__label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

// ── Icons: outline when unselected, filled when selected (iOS convention) ──
const solid = (active) => ({ fill: active ? 'currentColor' : 'none', stroke: active ? 'none' : 'currentColor' });

function HomeIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8.5Z" style={solid(active)} />
    </svg>
  );
}

function SearchIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" style={solid(active)} />
      <path d="m20 20-3.4-3.4" style={{ fill: 'none', stroke: 'currentColor' }} strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" strokeWidth={active ? 2.7 : 2.3} strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" style={{ fill: 'none', stroke: 'currentColor' }} />
    </svg>
  );
}

function BellIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" style={solid(active)} />
      <path d="M14 21h-4" style={{ fill: 'none', stroke: 'currentColor' }} strokeLinecap="round" />
    </svg>
  );
}

function UserIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="10" style={{ fill: 'none', stroke: 'currentColor' }} />
      <circle cx="12" cy="10" r="3.1" style={solid(active)} />
      <path d="M6.5 18.4a5.6 5.6 0 0 1 11 0" style={solid(active)} strokeLinecap="round" />
    </svg>
  );
}
