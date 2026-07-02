import Link from 'next/link';
import { Button, IconButton } from '../ui/Button';
import { SearchBar } from '../ui/SearchBar';
import { ThemeToggle } from '../ui/ThemeToggle';

function Logo({ onClick }) {
  const content = (
    <span className="dilz-logo-lockup" aria-label="dILz">
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
  onLogoClick,
  onPostDeal,
  onSearch,
  searchValue,
  onSearchChange,
  onCommunity,
  onAlerts,
  activeTab,
  showSearch = true,
}) {
  const labels = lang === 'he'
    ? { primary: 'ניווט ראשי', promos: 'מבצעים', search: 'חיפוש מוצרים, חנויות ודילז', notifications: 'התראות', alert: 'יצירת התראת מחיר', alerts: 'התראות', post: 'פרסום דיל', profile: 'פרופיל', signIn: 'התחברות', allIsrael: 'כל הארץ' }
    : { primary: 'Primary navigation', promos: 'Promotions', search: 'Search products, stores, Dilz', notifications: 'Notifications', alert: 'Create a price alert', alerts: 'Alerts', post: 'Post deal', profile: 'Profile', signIn: 'Sign in', allIsrael: 'All Israel' };
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
          <ThemeToggle lang={lang} />
          <select className="dilz-language-select" value={lang} onChange={(event) => onLanguageChange(event.target.value)} aria-label="Language">
            {languageOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
          <Button variant="secondary" size="sm" onClick={onCityClick}>
            {cityLabel || labels.allIsrael}
          </Button>
          {user && (
            <IconButton aria-label={labels.notifications} onClick={onNotificationsClick} className={unreadCount > 0 ? 'has-unread' : ''}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadCount > 0 && <span className="dilz-notification-dot">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </IconButton>
          )}
          <button type="button" className="dilz-header-alerts-btn" onClick={onAlerts} aria-label={labels.alert}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              <line x1="12" y1="3" x2="12" y2="1"/><line x1="15" y1="2" x2="12" y2="5"/><line x1="9" y1="2" x2="12" y2="5"/>
            </svg>
            {labels.alerts}
          </button>
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
