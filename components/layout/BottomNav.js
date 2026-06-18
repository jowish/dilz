export function BottomNav({ activeTab, onTab, onPost, onAlerts, onProfile }) {
  const items = [
    { id: 'deals', label: 'Dilz', action: () => onTab('deals'), icon: HomeIcon },
    { id: 'sales', label: 'Promos', action: () => onTab('sales'), icon: SearchIcon },
    { id: 'post', label: 'Post', action: onPost, icon: PlusIcon, post: true },
    { id: 'alerts', label: 'Alerts', action: onAlerts, icon: BellIcon },
    { id: 'profile', label: 'Profile', action: onProfile, icon: UserIcon },
  ];

  return (
    <nav className="dilz-bottom-nav" aria-label="Mobile navigation">
      <div className="dilz-bottom-nav__inner">
        {items.map((item) => {
          const active = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={['dilz-bottom-nav__item', active && 'is-active', item.post && 'is-post'].filter(Boolean).join(' ')}
              onClick={item.action}
              aria-label={item.label}
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

function HomeIcon() {
  return <svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8.5Z" /></svg>;
}

function SearchIcon() {
  return <svg viewBox="0 0 24 24"><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" /><path d="M7.5 7.5h.01" /></svg>;
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
