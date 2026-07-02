import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { bottomNavActiveItem } from '../../lib/navigationState';
import {
  TAB_COUNT,
  SWIPE_START_PX,
  loupeLeftFallback,
  loupeLeftPx as computeLoupeLeftPx,
  postTint as computePostTint,
  postLit as computePostLit,
  touchToFraction,
  snapIndex,
  visualActiveIndex,
} from '../../lib/bottomNav';

export function BottomNav({ lang = 'en', activeTab, menuOpen = false, alertsOpen = false, postOpen = false, avatarUrl: avatarProp, onMenu, onTab, onPost, onAlerts, onProfile }) {
  const isRtl = lang === 'he';
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
      // Absolute `left` is relative to the padding box, but getBoundingClientRect
      // is the border box — subtract the left border so centering is exact.
      const borderL = inner.clientLeft || 0;
      const next = itemRefs.current.map((btn) => {
        if (!btn) return 0;
        const r = btn.getBoundingClientRect();
        return r.left - innerRect.left - borderL + r.width / 2;
      });
      if (next.length === TAB_COUNT) setCenters(next);
    };
    // Measure now and again after fonts/layout settle, so centering is exact.
    measure();
    const raf = requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', measure); };
  }, [lang]);

  const loupeLeftPx = (fraction) => computeLoupeLeftPx(centers, fraction);

  // ── Animated loupe center ────────────────────────────────────────────
  // `center` is a *fractional* tab index that eases toward the target on
  // click and follows the finger on swipe. As it passes over a tab, that
  // tab's icon zooms (dock magnification), so the whole bar reacts like
  // WhatsApp when the focus moves.
  const [center, setCenter]   = useState(activeIdx);
  const [pressed, setPressed] = useState(false); // finger down on the bar
  const swipeRef  = useRef(null);

  const isSwiping = swipeRef.current?.started === true;

  // Glide the bubble to the newly selected tab. The motion is a pure CSS
  // transition (calm easing set in globals.css) — no per-frame animation, so
  // it's smooth and light rather than fast and nervous.
  useEffect(() => {
    if (swipeRef.current?.started) return;   // a drag owns the position
    setCenter(activeIdx);
  }, [activeIdx]);

  function handleTouchStart(e) {
    const inner = innerRef.current;
    if (!inner) return;
    setPressed(true);   // swell immediately on touch
    const rect = inner.getBoundingClientRect();
    const touchX = e.touches[0].clientX;
    // Snap to the ACTUAL button under the finger (exact hit-test) so the jump
    // always matches the click target — avoids a jump-then-return flicker. Works
    // in RTL too since it uses real element positions.
    let idx = itemRefs.current.findIndex((b) => {
      if (!b) return false;
      const r = b.getBoundingClientRect();
      return touchX >= r.left && touchX <= r.right;
    });
    if (idx < 0) idx = snapIndex(touchToFraction(touchX - rect.left, rect.width, isRtl));
    setCenter(idx);
    swipeRef.current = { startX: touchX, innerLeft: rect.left, innerWidth: rect.width, started: false, pos: idx };
  }

  function handleTouchMove(e) {
    const state = swipeRef.current;
    if (!state) return;
    const touchX = e.touches[0].clientX;
    if (!state.started && Math.abs(touchX - state.startX) < SWIPE_START_PX) return;
    state.started = true;
    // The bubble follows the finger continuously (transition disabled while swiping).
    const frac = touchToFraction(touchX - state.innerLeft, state.innerWidth, isRtl);
    state.pos = frac;
    setCenter(frac);
  }

  function handleTouchEnd() {
    const state = swipeRef.current;
    swipeRef.current = null;
    setPressed(false);
    if (state?.started && state.pos !== null) {
      const idx    = snapIndex(state.pos);
      setCenter(idx);   // CSS transition settles smoothly onto the nearest tab
      const target = items[idx];
      if (target && target.id !== activeItem) target.action();
    }
  }

  const loupeCenter = center;

  // The selected look (fill + zoom) follows the bubble only while the finger is
  // dragging it; on a tap it jumps straight to the destination so intermediate
  // icons on the way (e.g. Post when heading to Alerts) never react.
  const visualActiveIdx = visualActiveIndex(center, activeIdx, isSwiping);

  // The bubble tints orange as the focus enters the Post zone, fully orange
  // once centred; the plus + label then invert to white so they stay legible.
  const postTint = computePostTint(center);
  const postLit = computePostLit(center);

  // When pressed / dragging the bubble grows UNIFORMLY (same shape and
  // proportions, just larger) so it overshoots the bar symmetrically on every
  // side and bites onto the neighbour tabs.
  const dragSwell = (pressed || isSwiping) ? 1.34 : 1;
  const px = loupeLeftPx(loupeCenter);
  const pos = px !== null ? `${px}px` : loupeLeftFallback(loupeCenter, isRtl);
  // Position + swell via the individual `translate`/`scale` properties — both
  // are GPU-composited (no per-frame layout like `left`), and each can carry
  // its own transition duration, so the glide is silky-smooth.
  const loupeStyle = {
    translate: pos,
    scale: `${dragSwell.toFixed(3)}`,
    transition: isSwiping ? 'none' : undefined,   // follow the finger 1:1 while dragging
  };
  if (postTint > 0) {
    // keep the top specular sheen, tint the fill orange (opaque when centred)
    const alpha = (0.30 + 0.70 * postTint).toFixed(2);
    loupeStyle.background =
      `linear-gradient(180deg, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.08) 45%, rgba(255,255,255,0) 100%), rgba(249, 115, 22, ${alpha})`;
  }

  // The whole bar swells slightly ONLY while the finger is down — zoom in on
  // touch, back to normal the instant it's released. Not tied to `moving` so a
  // slow page load after a tap can never keep the bar zoomed.
  const barZoom = pressed;

  return (
    <nav className="dilz-bottom-nav" aria-label={labels.nav}>
      <div
        className={`dilz-bottom-nav__inner${barZoom ? ' is-zoomed' : ''}`}
        ref={innerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {/* Single liquid drop that glides across the bar */}
        <div
          className={`dilz-bottom-nav__loupe${isSwiping ? ' is-swiping' : ''}${pressed ? ' is-pressed' : ''}`}
          style={loupeStyle}
          aria-hidden="true"
        />

        {items.map((item, idx) => {
          const active    = idx === visualActiveIdx;          // live selected look
          const committed = activeItem === item.id;           // committed route
          const { Icon }  = item;

          // Post colour is driven inline (bulletproof against the cascade):
          // orange by default, white once the bubble under it turns orange.
          const postWhite = item.post && (active || postLit);
          const postColor = item.post ? (postWhite ? '#ffffff' : 'var(--brand)') : undefined;

          // Individual icons no longer zoom — the whole bar scales up instead
          // (see barZoom below), so every element grows together.
          const iconStyle = postColor ? { color: postColor } : undefined;

          return (
            <button
              key={item.id}
              type="button"
              ref={(el) => { itemRefs.current[idx] = el; }}
              className={['dilz-bottom-nav__item', active && 'is-active', item.post && 'is-post'].filter(Boolean).join(' ')}
              onClick={item.action}
              aria-label={item.label}
              aria-current={committed ? 'page' : undefined}
            >
              <span className="dilz-bottom-nav__icon nav-pill" style={iconStyle}>
                {item.id === 'profile' && avatarUrl
                  ? <img src={avatarUrl} alt="" className="dilz-bottom-nav__avatar" draggable={false} />
                  : <Icon active={active} color={postColor} />}
              </span>
              <span style={postColor ? { color: postColor } : undefined}>{item.label}</span>
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

function PlusIcon({ active, color }) {
  // Explicit stroke colour (not currentColor) so it's bulletproof against the
  // cascade: orange by default, white when the bubble under it turns orange.
  return (
    <svg viewBox="0 0 24 24" strokeWidth={active ? 2.7 : 2.3} strokeLinecap="round">
      <path d="M12 5v14M5 12h14" style={{ fill: 'none', stroke: color || 'currentColor' }} />
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
