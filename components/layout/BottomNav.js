import { useRef, useState } from 'react';
import { bottomNavActiveItem } from '../../lib/navigationState';

const TAB_COUNT = 5;

// Center of loupe as CSS left value (loupe width = 48px → half = 24px)
function loupeLeft(center) {
  return `calc(${((center + 0.5) / TAB_COUNT) * 100}% - 24px)`;
}

// Dock magnification: icons near the loupe scale up like macOS dock
function dockScale(itemIdx, center) {
  const dist = Math.abs(itemIdx - center);
  if (dist >= 1.6) return 1;
  return 1 + ((1.6 - dist) / 1.6) * 0.30; // 1.30 at center, tapers off
}

export function BottomNav({ lang = 'en', activeTab, menuOpen = false, alertsOpen = false, postOpen = false, onMenu, onTab, onPost, onAlerts, onProfile }) {
  const labels = lang === 'he'
    ? { search: 'חיפוש', deals: 'דילים', post: 'פרסום', alerts: 'התראות', profile: 'פרופיל', nav: 'ניווט מובייל' }
    : { search: 'Search', deals: 'Deals', post: 'Post', alerts: 'Alerts', profile: 'Profile', nav: 'Mobile navigation' };

  const items = [
    { id: 'deals',   label: labels.deals,   action: () => onTab('deals'), icon: HomeIcon },
    { id: 'explore', label: labels.search,  action: onMenu,               icon: SearchIcon },
    { id: 'post',    label: labels.post,    action: onPost,               icon: PlusIcon,  post: true },
    { id: 'alerts',  label: labels.alerts,  action: onAlerts,             icon: BellIcon },
    { id: 'profile', label: labels.profile, action: onProfile,            icon: UserIcon },
  ];

  const activeItem = bottomNavActiveItem({ activeTab, menuOpen, alertsOpen, postOpen });
  const activeIdx  = Math.max(0, items.findIndex((it) => it.id === activeItem));

  const innerRef = useRef(null);
  const swipeRef = useRef(null); // { startX, innerLeft, innerWidth, started, pos }
  const [swipeCenter, setSwipeCenter] = useState(null); // fractional tab idx during swipe

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

    // Start swiping after 10px horizontal movement
    if (!state.started && Math.abs(touchX - state.startX) < 10) return;
    state.started = true;

    const relX = touchX - state.innerLeft;
    const raw  = (relX / state.innerWidth) * TAB_COUNT - 0.5;
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
        {/* Single loupe that glides across the entire bar */}
        <div
          className={`dilz-bottom-nav__loupe${isSwiping ? ' is-swiping' : ''}`}
          style={{ left: loupeLeft(loupeCenter) }}
          aria-hidden="true"
        />

        {items.map((item, idx) => {
          const active = activeItem === item.id;
          const Icon   = item.icon;

          // Post button keeps its own elevated style — skip dock scale
          const scale = item.post
            ? 1
            : isSwiping
              ? dockScale(idx, loupeCenter)
              : active ? 1.26 : 1;

          const iconStyle = (isSwiping || active) && !item.post
            ? {
                transform: `translateY(${active && !isSwiping ? '-2px' : '0'}) scale(${scale.toFixed(3)})`,
                transition: isSwiping ? 'none' : undefined,
              }
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

function SearchIcon() {
  return <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.4-3.4" /></svg>;
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
