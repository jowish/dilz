import { bottomNavActiveItem } from '../../lib/navigationState';

export function BottomNav({ lang = 'en', activeTab, menuOpen = false, alertsOpen = false, postOpen = false, onMenu, onTab, onPost, onAlerts, onProfile }) {
  const labels = lang === 'he'
    ? { explore: '\u05d2\u05d9\u05dc\u05d5\u05d9', deals: '\u05d3\u05d9\u05dc\u05d9\u05dd', post: '\u05e4\u05e8\u05e1\u05d5\u05dd', alerts: '\u05d4\u05ea\u05e8\u05d0\u05d5\u05ea', profile: '\u05e4\u05e8\u05d5\u05e4\u05d9\u05dc', nav: '\u05e0\u05d9\u05d5\u05d5\u05d8 \u05de\u05d5\u05d1\u05d9\u05d9\u05dc' }
    : { explore: 'Explore', deals: 'Deals', post: 'Post', alerts: 'Alerts', profile: 'Profile', nav: 'Mobile navigation' };
  const items = [
    { id: 'deals', label: labels.deals, action: () => onTab('deals'), icon: HomeIcon },
    { id: 'explore', label: labels.explore, action: onMenu, icon: ExploreIcon },
    { id: 'post', label: labels.post, action: onPost, icon: PlusIcon, post: true },
    { id: 'alerts', label: labels.alerts, action: onAlerts, icon: BellIcon },
    { id: 'profile', label: labels.profile, action: onProfile, icon: UserIcon },
  ];
  const activeItem = bottomNavActiveItem({ activeTab, menuOpen, alertsOpen, postOpen });

  return (
    <nav className="dilz-bottom-nav" aria-label={labels.nav}>
      <div className="dilz-bottom-nav__inner">
        {items.map((item) => {
          const active = activeItem === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={['dilz-bottom-nav__item', active && 'is-active', item.post && 'is-post'].filter(Boolean).join(' ')}
              onClick={item.action}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              <span className="dilz-bottom-nav__icon nav-pill">
                <Icon />
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function ExploreIcon() {
  return <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="m15 9-2.1 5.1L8 16l2.1-5.1L15 9Z" /></svg>;
}

function HomeIcon() {
  return <svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8.5Z" /></svg>;
}

function PlusIcon() {
  return <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>;
}

function BellIcon() {
  return <svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M14 21h-4" /></svg>;
}

function UserIcon() {
  return <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
}
