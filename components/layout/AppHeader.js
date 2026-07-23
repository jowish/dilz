import Link from 'next/link';
import { Button } from '../ui/Button';
import { SearchBar } from '../ui/SearchBar';
import { Wordmark } from '../ui/Brand';

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
