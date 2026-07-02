import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { bottomNavActiveItem } from '../../lib/navigationState';

const TAB_COUNT = 5;
const LOUPE_WIDTH = 72;

// Fallback (pre-measure): percentage-based center. Slightly off due to bar
// padding, but only used for the very first paint before refs are measured.
function loupeLeftFallback(center) {
  return `calc(${((center + 0.5) / TAB_COUNT) * 100}% - ${LOUPE_WIDTH / 2}px)`;
}

// Dock magnification: an icon grows as the loupe approaches, peaking when the
// loupe is centred on it — the WhatsApp-style "pop" that follows the focus.
function dockScale(itemIdx, center) {
  const dist = Math.abs(itemIdx - center);
  if (dist >= 1.3) return 1;
  return 1 + ((1.3 - dist) / 1.3) * 0.18;
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
  const itemRefs = useRef([]);

  // Measured horizontal centers of each button (px, relative to inner padding box).
  // This makes the loupe land dead-center on the icon regardless of bar padding.
  const [centers, setCenters] = useState(null);
  useEffect(() => {
    const measure = () => {
      const inner = innerRef.current;
      if (!inner) return;
      const innerRect = inner.getBoundingClientRect();
      const next = itemRefs.current.map((btn) => {
        if (!btn) return 0;
        const r = btn.getBoundingClientRect();
        return r.left - innerRect.left + r.width / 2;
      });
      if (next.length === TAB_COUNT) setCenters(next);
    };
    // Measure now and again after fonts/layout settle, so centering is exact.
    measure();
    const raf = requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', measure); };
  }, [lang]);

  // Interpolate the loupe's left (px) for a fractional tab index.
  function loupeLeftPx(fraction) {
    if (!centers) return null;
    const lo = Math.floor(fraction);
    const hi = Math.min(TAB_COUNT - 1, lo + 1);
    const t = fraction - lo;
    const cx = centers[lo] + (centers[hi] - centers[lo]) * t;
    return cx - LOUPE_WIDTH / 2;
  }

  // ── Animated loupe center ────────────────────────────────────────────
  // `center` is a *fractional* tab index that eases toward the target on
  // click and follows the finger on swipe. As it passes over a tab, that
  // tab's icon zooms (dock magnification), so the whole bar reacts like
  // WhatsApp when the focus moves.
  const [center, setCenter]   = useState(activeIdx);
  const [stretch, setStretch] = useState(0);   // signed horizontal stretch
  const [moving, setMoving]   = useState(false);
  const curRef    = useRef(activeIdx);
  const targetRef = useRef(activeIdx);
  const rafRef    = useRef(null);
  const swipeRef  = useRef(null);

  const stopRaf = () => { if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };

  const runRaf = () => {
    stopRaf();
    setMoving(true);
    const step = () => {
      const cur = curRef.current;
      const target = targetRef.current;
      const next = cur + (target - cur) * 0.28;      // exponential ease
      const done = Math.abs(target - next) < 0.004;
      const settled = done ? target : next;
      const velocity = settled - cur;
      curRef.current = settled;
      setCenter(settled);
      setStretch(Math.max(-1, Math.min(1, velocity * 1.6)));
      if (done) {
        setStretch(0);
        setMoving(false);
        rafRef.current = null;
        return;
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  };

  // Ease toward the newly active tab whenever it changes (click navigation)
  useEffect(() => {
    if (swipeRef.current) return;   // swipe drives the center directly
    targetRef.current = activeIdx;
    if (Math.abs(curRef.current - activeIdx) > 0.001) runRaf();
    return stopRaf;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx]);

  const isSwiping = swipeRef.current?.started === true;

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
    stopRaf();
    const velocity = touchX - state.lastX;
    state.lastX = touchX;
    const relX    = touchX - state.innerLeft;
    const raw     = (relX / state.innerWidth) * TAB_COUNT - 0.5;
    const clamped = Math.max(0, Math.min(TAB_COUNT - 1, raw));
    state.pos = clamped;
    curRef.current = clamped;
    setCenter(clamped);
    setMoving(true);
    setStretch(Math.max(-1, Math.min(1, velocity / 12)));
  }

  function handleTouchEnd() {
    const state = swipeRef.current;
    swipeRef.current = null;
    if (state?.started && state.pos !== null) {
      const idx    = Math.round(Math.max(0, Math.min(TAB_COUNT - 1, state.pos)));
      const target = items[idx];
      targetRef.current = idx;
      runRaf();  // spring toward the snapped tab
      if (target && target.id !== activeItem) target.action();
    } else {
      setMoving(false);
      setStretch(0);
    }
  }

  const loupeCenter = center;

  // Stretch → scaleX + origin so the drop elongates in its travel direction
  const absStretch = Math.abs(stretch);
  const px = loupeLeftPx(loupeCenter);
  const loupeStyle = {
    left: px !== null ? `${px}px` : loupeLeftFallback(loupeCenter),
    transform: `scaleX(${(1 + absStretch * 0.35).toFixed(3)}) scaleY(${(1 - absStretch * 0.12).toFixed(3)})`,
    transformOrigin: stretch >= 0 ? 'left center' : 'right center',
    transition: moving ? 'none' : undefined,
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
          // Every icon reacts to how close the travelling loupe is to it.
          const scale    = dockScale(idx, loupeCenter);
          const iconStyle = {
            transform: `scale(${scale.toFixed(3)})`,
            transition: moving ? 'none' : undefined,
          };

          return (
            <button
              key={item.id}
              type="button"
              ref={(el) => { itemRefs.current[idx] = el; }}
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
// NOTE: the global rule `.dilz-bottom-nav__icon svg { fill: none }` beats the
// SVG `fill=` attribute, so filled states MUST use inline style (which wins
// over a non-!important stylesheet rule).

// fill when active, else stroke outline
const solid = (active) => ({ fill: active ? 'currentColor' : 'none', stroke: active ? 'none' : 'currentColor' });

function HomeIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinejoin="round">
      <path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8.5Z" style={solid(active)} />
    </svg>
  );
}

function SearchIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" strokeWidth="2">
      <circle cx="11" cy="11" r="7" style={solid(active)} />
      <path d="m20 20-3.4-3.4" style={{ fill: 'none', stroke: 'currentColor' }} strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" strokeWidth={active ? 2.7 : 2.3} strokeLinecap="round">
      <path d="M12 5v14M5 12h14" style={{ fill: 'none', stroke: 'currentColor' }} />
    </svg>
  );
}

function BellIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" style={solid(active)} />
      <path d="M14 21h-4" style={{ fill: 'none', stroke: 'currentColor' }} strokeLinecap="round" />
    </svg>
  );
}

// Profile: person inside a circle (like WhatsApp "Vous")
function UserIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" strokeWidth="2">
      <circle cx="12" cy="12" r="10" style={{ fill: 'none', stroke: 'currentColor' }} />
      <circle cx="12" cy="10" r="3.1" style={solid(active)} />
      <path d="M6.5 18.4a5.6 5.6 0 0 1 11 0" style={solid(active)} strokeLinecap="round" />
    </svg>
  );
}
