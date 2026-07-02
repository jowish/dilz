import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { bottomNavActiveItem } from '../../lib/navigationState';

const TAB_COUNT = 5;

// Loupe width = 64px → half = 32px offset to center on tab
function loupeLeft(center) {
  return `calc(${((center + 0.5) / TAB_COUNT) * 100}% - 32px)`;
}

// Subtle magnification near the loupe during swipe
function dockScale(itemIdx, center) {
  const dist = Math.abs(itemIdx - center);
  if (dist >= 1.4) return 1;
  return 1 + ((1.4 - dist) / 1.4) * 0.10;
}

export function BottomNav({ lang = 'en', activeTab, menuOpen = false, alertsOpen = false, postOpen = false, avatarUrl: avatarProp, onMenu, onTab, onPost, onAlerts, onProfile }) {
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

  // Avatar: use prop if provided, otherwise read from the auth session
  const [avatarUrl, setAvatarUrl] = useState(avatarProp || '');
  useEffect(() => {
    if (avatarProp !== undefined) { setAvatarUrl(avatarProp || ''); return; }
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setAvatarUrl(data.session?.user?.user_metadata?.avatar_url || '');
    });
    return () => { alive = false; };
  }, [avatarProp]);

  const innerRef = useRef(null);
  const swipeRef = useRef(null);
  const [swipeCenter, setSwipeCenter] = useState(null);

  // Liquid travel: stretch the bubble horizontally while it moves between tabs
  const [stretch, setStretch] = useState(0); // signed: + right, - left
  const prevIdx = useRef(activeIdx);
  const stretchTimer = useRef(null);

  useEffect(() => {
    if (prevIdx.current !== activeIdx && swipeCenter === null) {
      const delta = activeIdx - prevIdx.current;
      setStretch(Math.max(-1, Math.min(1, delta)));
      clearTimeout(stretchTimer.current);
      stretchTimer.current = setTimeout(() => setStretch(0), 260);
    }
    prevIdx.current = activeIdx;
    return () => clearTimeout(stretchTimer.current);
  }, [activeIdx, swipeCenter]);

  const isSwiping   = swipeCenter !== null;
  const loupeCenter = isSwiping ? swipeCenter : activeIdx;

  function handleTouchStart(e) {
    const inner = innerRef.current;
    if (!inner) return;
    const rect = inner.getBoundingClientRect();
    swipeRef.current = { startX: e.touches[0].clientX, innerLeft: rect.left, innerWidth: rect.width, started: false, pos: null, lastX: e.touches[0].clientX };
  }

  function handleTouchMove(e) {
    const state = swipeRef.current;
    if (!state) return;
    const touchX = e.touches[0].clientX;
    if (!state.started && Math.abs(touchX - state.startX) < 10) return;
    state.started = true;
    // liquid: stretch toward movement direction based on velocity
    const velocity = touchX - state.lastX;
    state.lastX = touchX;
    setStretch(Math.max(-1, Math.min(1, velocity / 14)));
    const relX    = touchX - state.innerLeft;
    const raw     = (relX / state.innerWidth) * TAB_COUNT - 0.5;
    const clamped = Math.max(0, Math.min(TAB_COUNT - 1, raw));
    state.pos = clamped;
    setSwipeCenter(clamped);
  }

  function handleTouchEnd() {
    const state = swipeRef.current;
    swipeRef.current = null;
    setStretch(0);
    if (state?.started && state.pos !== null) {
      const idx    = Math.round(Math.max(0, Math.min(TAB_COUNT - 1, state.pos)));
      const target = items[idx];
      if (target && target.id !== activeItem) target.action();
    }
    setSwipeCenter(null);
  }

  // Stretch → scaleX + origin so the drop elongates in its travel direction
  const absStretch = Math.abs(stretch);
  const loupeStyle = {
    left: loupeLeft(loupeCenter),
    transform: `scaleX(${(1 + absStretch * 0.35).toFixed(3)}) scaleY(${(1 - absStretch * 0.12).toFixed(3)})`,
    transformOrigin: stretch >= 0 ? 'left center' : 'right center',
  };

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
        {/* Single liquid drop that glides across the bar */}
        <div
          className={`dilz-bottom-nav__loupe${isSwiping ? ' is-swiping' : ''}`}
          style={loupeStyle}
          aria-hidden="true"
        />

        {items.map((item, idx) => {
          const active   = activeItem === item.id;
          const { Icon } = item;
          const scale    = isSwiping ? dockScale(idx, loupeCenter) : (active ? 1.06 : 1);
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
                {item.id === 'profile' && avatarUrl
                  ? <img src={avatarUrl} alt="" className="dilz-bottom-nav__avatar" />
                  : <Icon active={active} />}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ── Icons: outline when inactive, filled when active ─────────────────────

function HomeIcon({ active }) {
  return active ? (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8.5Z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8.5Z" />
    </svg>
  );
}

function SearchIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" strokeWidth="2">
      <circle cx="11" cy="11" r="7" fill={active ? 'currentColor' : 'none'} stroke={active ? 'none' : 'currentColor'} />
      <path d="m20 20-3.4-3.4" fill="none" stroke="currentColor" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.6 : 2} strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function BellIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" strokeWidth="2">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" fill={active ? 'currentColor' : 'none'} stroke={active ? 'none' : 'currentColor'} />
      <path d="M14 21h-4" fill="none" stroke="currentColor" strokeLinecap="round" />
    </svg>
  );
}

// Profile: person inside a circle (like WhatsApp "Vous")
function UserIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="10" r="3.1" fill={active ? 'currentColor' : 'none'} stroke={active ? 'none' : 'currentColor'} />
      <path d="M6.5 18.4a5.6 5.6 0 0 1 11 0" fill={active ? 'currentColor' : 'none'} stroke={active ? 'none' : 'currentColor'} strokeLinecap="round" />
    </svg>
  );
}
