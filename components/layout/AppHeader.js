import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button, IconButton } from '../ui/Button';
import { SearchBar } from '../ui/SearchBar';
import { Wordmark } from '../ui/Brand';
import { supabase } from '../../lib/supabase';

function Logo({ onClick }) {
  const content = (
    <span className="dilz-logo-lockup" aria-label="dILz">
      <Wordmark />
    </span>
  );

  if (onClick) {
    return (
      <button type="button" className="dilz-logo-button" onClick={onClick} aria-label="Go home">
        {content}
      </button>
    );
  }

  return <Link href="/" className="dilz-logo-button">{content}</Link>;
}

function ProfileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="10" r="3.1" />
      <path d="M6.5 18.4a5.6 5.6 0 0 1 11 0" strokeLinecap="round" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M14 21h-4" strokeLinecap="round" />
    </svg>
  );
}

export function AppHeader({
  lang,
  languageOptions = [],
  onLanguageChange,
  cityLabel,
  onCityClick,
  user,
  onLogoClick,
  onPostDeal,
  onSearch,
  searchValue,
  onSearchChange,
  onCommunity,
  activeTab,
  showSearch = true,
}) {
  const labels = lang === 'he'
    ? { primary: 'ניווט ראשי', promos: 'מבצעים', search: 'חיפוש מוצרים, חנויות ודילז', notifications: 'התראות', alert: 'יצירת התראת מחיר', alerts: 'התראות', post: 'פרסום דיל', profile: 'פרופיל', signIn: 'התחברות', allIsrael: 'כל הארץ' }
    : { primary: 'Primary navigation', promos: 'Promotions', search: 'Search products, stores, Dilz', notifications: 'Notifications', alert: 'Create a price alert', alerts: 'Alerts', post: 'Post deal', profile: 'Profile', signIn: 'Sign in', allIsrael: 'All Israel' };

  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let alive = true;
    const loadUnreadCount = (session) => {
      if (!session?.access_token) {
        if (alive) setUnreadCount(0);
        return;
      }
      fetch('/api/notifications', { headers: { Authorization: `Bearer ${session.access_token}` } })
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => {
          if (!alive || !data) return;
          setUnreadCount((data.notifications || []).filter((notification) => !notification.is_read).length);
        })
        .catch(() => {});
    };
    supabase.auth.getSession().then(({ data }) => loadUnreadCount(data.session));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => loadUnreadCount(session));
    const refreshUnread = () => supabase.auth.getSession().then(({ data }) => loadUnreadCount(data.session));
    window.addEventListener('dilz:notifications-read', refreshUnread);
    return () => {
      alive = false;
      subscription?.subscription?.unsubscribe?.();
      window.removeEventListener('dilz:notifications-read', refreshUnread);
    };
  }, []);

  const goProfile = () => router.push('/?tab=profile', undefined, { shallow: true, scroll: false });
  const goAlerts = () => {
    if (!user) { router.push('/auth?redirect=/alerts'); return; }
    window.dispatchEvent(new Event('dilz:open-notifications'));
  };

  return (
    <header className="dilz-app-header">
      <div className="dilz-app-header__inner">
        <div className="dilz-app-header__left">
          <Logo onClick={onLogoClick} />
          <nav className="dilz-desktop-tabs" aria-label={labels.primary}>
            <button type="button" className={activeTab === 'deals' ? 'is-active' : ''} onClick={onCommunity}>
              Dilz
            </button>
          </nav>
        </div>

        {showSearch && (
          <div className="dilz-app-header__search">
            <SearchBar value={searchValue} onChange={onSearchChange} onFocus={onSearch} placeholder={labels.search} />
          </div>
        )}

        <div className="dilz-app-header__right">
          <select className="dilz-language-select" value={lang} onChange={(event) => onLanguageChange(event.target.value)} aria-label="Language">
            {languageOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
          <Button variant="secondary" size="sm" onClick={onCityClick}>
            {cityLabel || labels.allIsrael}
          </Button>
          <IconButton onClick={goAlerts} aria-label={labels.alerts}>
            <BellIcon />
            {unreadCount > 0 && (
              <span className="dilz-header-badge" aria-label={`${unreadCount} unread notifications`}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </IconButton>
          <IconButton onClick={goProfile} selected={activeTab === 'profile'} aria-label={labels.profile}>
            <ProfileIcon />
          </IconButton>
          <Button className="dilz-header-post" onClick={onPostDeal}>{labels.post}</Button>
        </div>
      </div>
      {showSearch && (
        <div className="dilz-mobile-search">
          <SearchBar value={searchValue} onChange={onSearchChange} onFocus={onSearch} placeholder={labels.search} />
        </div>
      )}
    </header>
  );
}
