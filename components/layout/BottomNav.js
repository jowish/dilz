import { useRef, useState } from 'react';
import { bottomNavActiveItem } from '../../lib/navigationState';

const TAB_COUNT = 5;

// Loupe width = 52px → half = 26px offset to center on tab
function loupeLeft(center) {
  return `calc(${((center + 0.5) / TAB_COUNT) * 100}% - 26px)`;
}

// Dock magnification: icons near the loupe scale up during swipe
function dockScale(itemIdx, center) {
  const dist = Math.abs(itemIdx - center);
  if (dist >= 1.6) return 1;
  return 1 + ((1.6 - dist) / 1.6) * 0.25;
}

export function BottomNav({ lang = 'en', activeTab, menuOpen = false, alertsOpen = false, postOpen = false, onMenu, onTab, onPost, onAlerts, onProfile }) {
  const labels = lang === 'he'
    ? { search: 'חיפוש', deals: 'דילים', post: 'פרסום', alerts: 'התראות', profile: 'פרופיל', nav: 'ניווט מובייל' }
    : { search: 'Search', deals: 'Deals', post: 'Post', alerts: 'Alerts', profile: 'Profile', nav: 'Mobile navigation' };

  const items = [
    { id: 'deals',   label: labels.deals,   action: () => onTab('deals'), Icon: HomeIcon },
    { id: 'explore', label: labels.search,  action: onMenu,               Icon: SearchIcon },
    { id: 'post',    label: labels.post,    action: onPost,               Icon: PlusIcon, post: true },
    { id: 'alerts',  label: labels.alerts,  action: onAlerts,             Icon: BellIcon },
    { id: 'profile', label: labels.profile, action: onProfile,            Icon: UserIcon },
  ];

  const activeItem = bottomNavActiveItem({ activeTab, menuOpen, alertsOpen, postOpen });
  const activeIdx  = Math.max(0, items.findIndex((it) => it.id === activeItem));

  const innerRef = useRef(null);
  const swipeRef = useRef(null);
  const [swipeCenter, setSwipeCenter] = useState(null);

  const isSwiping   = swipeCenter !== null;
  const loupeCenter = isSwiping ? swipeCenter : activeIdx;

  function handleTouchStart(e) {
    const inner = innerRef.current;
    if (!inner) return;
    const rect = inner.getBoundingClientRect();
    swipeRef.current = {
      startX: e.touches[0].clientX,
      innerLeft: rect.left,
      innerWidth: rect.width,
      started: false,
      pos: null,
    };
  }

  function handleTouchMove(e) {
    const state = swipeRef.current;
    if (!state) return;
    const touchX = e.touches[0].clientX;
    if (!state.started && Math.abs(touchX - state.startX) < 10) return;
    state.started = true;
    const relX    = touchX - state.innerLeft;
    const raw     = (relX / state.innerWidth) * TAB_COUNT - 0.5;
    const clamped = Math.max(0, Math.min(TAB_COUNT - 1, raw));
    state.pos = clamped;
    setSwipeCenter(clamped);
  }

  function handleTouchEnd() {
    const state = swipeRef.current;
    swipeRef.current = null;
    if (state?.started && state.pos !== null) {
      const idx    = Math.round(Math.max(0, Math.min(TAB_COUNT - 1, state.pos)));
      const target = items[idx];
      if (target && target.id !== activeItem) target.action();
    }
    setSwipeCenter(null);
  }

  return (
    <nav className="dilz-bottom-nav" aria-label={labels.nav}>
      <div
        className="dilz-bottom-nav__inner"
        ref={innerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {/* Single capsule that glides across the bar */}
        <div
          className={`dilz-bottom-nav__loupe${isSwiping ? ' is-swiping' : ''}`}
          style={{ left: loupeLeft(loupeCenter) }}
          aria-hidden="true"
        />

        {items.map((item, idx) => {
          const active   = activeItem === item.id;
          const { Icon } = item;
          const scale    = isSwiping ? dockScale(idx, loupeCenter) : (active ? 1.15 : 1);
          const iconStyle = (isSwiping || active)
            ? { transform: `scale(${scale.toFixed(3)})`, transition: isSwiping ? 'none' : undefined }
            : undefined;

          return (
            <button
              key={item.id}
              type="button"
              className={['dilz-bottom-nav__item', active && 'is-active', item.post && 'is-post'].filter(Boolean).join(' ')}
              onClick={item.action}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              <span className="dilz-bottom-nav__icon nav-pill" style={iconStyle}>
                {/* filled version when active, outline when inactive */}
                <Icon active={active} />
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ── Icons: outline when inactive, filled (orange) when active ────────────

function HomeIcon({ active }) {
  return active ? (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8.5Z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1">
      <path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8.5Z" />
    </svg>
  );
}

function SearchIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" strokeWidth="2.1">
      <circle
        cx="11" cy="11" r="7"
        fill={active ? 'currentColor' : 'none'}
        stroke={active ? 'none' : 'currentColor'}
      />
      <path d="m20 20-3.4-3.4" fill="none" stroke="currentColor" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon({ active }) {
  // Plus is stroke-based — it becomes orange when active via CSS color
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function BellIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" strokeWidth="2.1">
      <path
        d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"
        fill={active ? 'currentColor' : 'none'}
        stroke={active ? 'none' : 'currentColor'}
      />
      <path d="M14 21h-4" fill="none" stroke="currentColor" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon({ active }) {
  return active ? (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
