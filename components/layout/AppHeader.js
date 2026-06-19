import Link from 'next/link';
import { Button, IconButton } from '../ui/Button';
import { SearchBar } from '../ui/SearchBar';

function Logo({ onClick }) {
  const content = (
    <span className="dilz-logo-lockup" aria-label="dILz">
      <span className="dilz-logo-mark" aria-hidden="true">
        <svg viewBox="0 0 48 48" focusable="false">
          <circle cx="21" cy="21" r="12" />
          <path d="M30.5 30.5 40 40" />
        </svg>
      </span>
      <span className="dilz-logo">
        dILz
      </span>
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

export function AppHeader({
  lang,
  languageOptions = [],
  onLanguageChange,
  cityLabel,
  onCityClick,
  user,
  unreadCount = 0,
  onNotificationsClick,
  onProfileClick,
  onLogoClick,
  onPostDeal,
  onSearch,
  searchValue,
  onSearchChange,
  onCommunity,
  onSupermarkets,
  onAlerts,
  activeTab,
}) {
  const initials = user
    ? (user.user_metadata?.display_name || user.email || 'U').slice(0, 2).toUpperCase()
    : null;

  return (
    <header className="dilz-app-header">
      <div className="dilz-app-header__inner">
        <div className="dilz-app-header__left">
          <Logo onClick={onLogoClick} />
          <nav className="dilz-desktop-tabs" aria-label="Primary">
            <button type="button" className={activeTab === 'deals' ? 'is-active' : ''} onClick={onCommunity}>
              Dilz
            </button>
            <button type="button" className={`dilz-promotions-nav-test ${activeTab === 'sales' ? 'is-active' : ''}`} onClick={onSupermarkets}>
              Promotions
            </button>
          </nav>
        </div>

        <div className="dilz-app-header__search">
          <SearchBar value={searchValue} onChange={onSearchChange} onFocus={onSearch} placeholder="Search products, stores, Dilz" />
        </div>

        <div className="dilz-app-header__right">
          <select className="dilz-language-select" value={lang} onChange={(event) => onLanguageChange(event.target.value)} aria-label="Language">
            {languageOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
          <Button variant="secondary" size="sm" onClick={onCityClick}>
            {cityLabel || 'All Israel'}
          </Button>
          {user && (
            <IconButton aria-label="Notifications" onClick={onNotificationsClick} className={unreadCount > 0 ? 'has-unread' : ''}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadCount > 0 && <span className="dilz-notification-dot">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </IconButton>
          )}
          <button type="button" className="dilz-header-alerts-btn" onClick={onAlerts} aria-label="Create a price alert">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              <line x1="12" y1="3" x2="12" y2="1"/><line x1="15" y1="2" x2="12" y2="5"/><line x1="9" y1="2" x2="12" y2="5"/>
            </svg>
            Alerts
          </button>
          <Button className="dilz-header-post" onClick={onPostDeal}>Post deal</Button>
          <IconButton aria-label={user ? 'Profile' : 'Sign in'} onClick={onProfileClick} selected={Boolean(user)}>
            {user ? (
              <span className="dilz-avatar-mini">{initials}</span>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            )}
          </IconButton>
        </div>
      </div>
      <div className="dilz-mobile-search">
        <SearchBar value={searchValue} onChange={onSearchChange} onFocus={onSearch} placeholder="Search products, stores, Dilz" />
      </div>
    </header>
  );
}
