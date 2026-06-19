export function BottomNav({ activeTab, menuOpen = false, onMenu, onTab, onPost, onAlerts, onProfile }) {
  const items = [
    { id: 'menu', label: 'Menu', action: onMenu, icon: MenuIcon },
    { id: 'deals', label: 'Dilz', action: () => onTab('deals'), icon: HomeIcon },
    { id: 'post', label: 'Post', action: onPost, icon: PlusIcon, post: true },
    { id: 'alerts', label: 'Alerts', action: onAlerts, icon: BellIcon },
    { id: 'profile', label: 'Profile', action: onProfile, icon: UserIcon },
  ];

  return (
    <nav className="dilz-bottom-nav" aria-label="Mobile navigation">
      <div className="dilz-bottom-nav__inner">
        {items.map((item) => {
          const active = item.id === 'menu' ? menuOpen : activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={['dilz-bottom-nav__item', active && 'is-active', item.post && 'is-post'].filter(Boolean).join(' ')}
              onClick={item.action}
              aria-label={item.label}
              aria-expanded={item.id === 'menu' ? menuOpen : undefined}
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

function MenuIcon() {
  return <svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
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