import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import { bottomNavActiveItem } from '../../lib/navigationState';

// Measure before paint on the client so the loupe has real pixel positions from
// the first frame (otherwise it starts at a % fallback then jumps to px, which
// broke the cross-page glide). Falls back to useEffect during SSR.
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;
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

// Persisted across page navigations (the module stays loaded for the whole SPA
// session), so a freshly-mounted bar on the next page can glide the bubble from
// where it was, instead of snapping straight to the new tab.
let persistedIdx = null;

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
  // When the active item is momentarily unresolved (e.g. mid-navigation) we hold
  // the last real tab instead of snapping to tab 0 (deals) — that flashed.
  const rawActiveIdx = items.findIndex((it) => it.id === activeItem);
  const lastValidIdx = useRef(rawActiveIdx >= 0 ? rawActiveIdx : 0);
  if (rawActiveIdx >= 0) lastValidIdx.current = rawActiveIdx;
  const activeIdx = rawActiveIdx >= 0 ? rawActiveIdx : lastValidIdx.current;

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

  // Prefetch every bottom-nav destination so switching pages is instant instead
  // of waiting for that page's bundle to code-split on demand.
  const router = useRouter();
  useEffect(() => {
    ['/', '/explore', '/post', '/alerts'].forEach((r) => {
      try { router.prefetch(r); } catch {}
    });
  }, [router]);

  // Measured horizontal centers of each button (px, relative to inner padding box).
  // This makes the loupe land dead-center on the icon regardless of bar padding.
  const [centers, setCenters] = useState(null);
  useIsoLayoutEffect(() => {
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
    // Measure before paint, then again after fonts/layout settle.
    measure();
    const raf = requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', measure); };
  }, [lang]);

  const loupeLeftPx = (fraction) => computeLoupeLeftPx(centers, fraction);

  // ── Loupe position ───────────────────────────────────────────────────
  // Stability first: resting position is controlled, tap focus is visual only,
  // and `swipeCenter` is a fractional tab index used while dragging.
  const [swipeCenter, setSwipeCenter] = useState(activeIdx);
  const [touchFocusCenter, setTouchFocusCenter] = useState(null);
  const [pressed, setPressed] = useState(false); // finger down on the bar
  const swipeRef  = useRef(null);

  const isSwiping = swipeRef.current?.started === true;

  // Where the bubble sits before the mount-glide: the previous page's position
  // (persisted) if we have one, otherwise the current tab (first ever load).
  const startIdx = persistedIdx == null ? activeIdx : persistedIdx;
  // `glide` flips true one frame after mount/change: the bubble first keeps
  // its previous resting centre, then glides to the real active tab. This extra
  // frame matters for close tabs too; otherwise React can commit the old and new
  // `translate` in one paint and the browser has nothing to animate.
  const [glide, setGlide] = useState(false);
  const [restCenter, setRestCenter] = useState(startIdx);
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setGlide(true);
      setRestCenter(activeIdx);
    });
    return () => cancelAnimationFrame(raf);
  }, [activeIdx]);
  // Remember the active tab so the NEXT page mount can glide from here.
  useEffect(() => { persistedIdx = activeIdx; }, [activeIdx]);

  // A tap focus is purely visual. Keep it long enough for the release/click to
  // commit navigation, then hand control back to the resting centre once the new
  // active tab has caught up.
  useEffect(() => {
    if (touchFocusCenter == null) return undefined;
    if (snapIndex(touchFocusCenter) !== activeIdx) return undefined;
    const raf = requestAnimationFrame(() => setTouchFocusCenter(null));
    return () => cancelAnimationFrame(raf);
  }, [activeIdx, touchFocusCenter]);

  function handleTouchStart(e) {
    const inner = innerRef.current;
    if (!inner) return;
    setPressed(true);   // swell immediately on touch
    const rect = inner.getBoundingClientRect();
    const touchX = e.touches[0].clientX;
    // Move the visual focus under the finger immediately, but do not commit
    // navigation here. The actual tab action still happens on release/click.
    const hit = itemRefs.current.findIndex((b) => {
      if (!b) return false;
      const r = b.getBoundingClientRect();
      return touchX >= r.left && touchX <= r.right;
    });
    const pos = hit >= 0 ? hit : snapIndex(touchToFraction(touchX - rect.left, rect.width, isRtl));
    persistedIdx = pos;
    setTouchFocusCenter(pos);
    swipeRef.current = { startX: touchX, innerLeft: rect.left, innerWidth: rect.width, started: false, pos };
  }

  function handleTouchMove(e) {
    const state = swipeRef.current;
    if (!state) return;
    const touchX = e.touches[0].clientX;
    if (!state.started && Math.abs(touchX - state.startX) < SWIPE_START_PX) return;
    state.started = true;
    setTouchFocusCenter(null);
    // The bubble follows the finger continuously (transition disabled while swiping).
    const frac = touchToFraction(touchX - state.innerLeft, state.innerWidth, isRtl);
    state.pos = frac;
    setSwipeCenter(frac);
  }

  function handleTouchEnd() {
    const state = swipeRef.current;
    swipeRef.current = null;
    setPressed(false);
    if (state?.started && state.pos !== null) {
      setTouchFocusCenter(null);
      const idx    = snapIndex(state.pos);
      const target = items[idx];
      persistedIdx = idx;
      // Navigate; the bubble then rests on the active tab (loupeCenter derives
      // from activeIdx once isSwiping is false), gliding there via CSS.
      if (target && target.id !== activeItem) target.action();
    } else if (state?.pos !== null && state?.pos !== undefined) {
      persistedIdx = snapIndex(state.pos);
      if (snapIndex(state.pos) === activeIdx) {
        setTouchFocusCenter(null);
      }
    } else if (!state || snapIndex(state.pos) === activeIdx) {
      setTouchFocusCenter(null);
    }
  }

  // Position: while dragging -> the finger; while tapping -> the finger's target;
  // otherwise -> the animated resting centre.
  const restIdx = restCenter;
  const touchFocusing = touchFocusCenter != null;
  const loupeCenter = isSwiping ? swipeCenter : (touchFocusing ? touchFocusCenter : restIdx);

  // The selected look (fill + colour) follows the bubble while touching/dragging;
  // otherwise it's the active tab.
  const visualActiveIdx = visualActiveIndex(loupeCenter, activeIdx, isSwiping || touchFocusing);

  // The bubble tints orange as the focus enters the Post zone, fully orange
  // once centred; the plus + label then invert to white so they stay legible.
  const postTint = computePostTint(loupeCenter);
  const postLit = computePostLit(loupeCenter);

  // When pressed / dragging the bubble grows uniformly: same exact shape, just
  // larger, so the liquid drop can spill slightly beyond the compact bar.
  const dragSwell = (pressed || isSwiping) ? 1.34 : 1;
  const px = loupeLeftPx(loupeCenter);
  const pos = px !== null ? `${px}px` : loupeLeftFallback(loupeCenter, isRtl);

  // A fixed, generous duration for every hop. This deliberately does NOT scale
  // with distance: a long sweep across the bar covers ground quickly (feels
  // dynamic) while a hop to a neighbour takes the same time over less distance
  // (slow and smooth) — exactly the calm feel wanted for adjacent menus.
  const ease = 'cubic-bezier(0.33, 0, 0.2, 1)';
  const glideMs = 620;

  // Position + swell via the individual `translate`/`scale` properties — both
  // are GPU-composited (no per-frame layout like `left`), and each can carry
  // its own transition duration, so the glide is silky-smooth.
  const loupeStyle = {
    translate: pos,
    scale: `${dragSwell.toFixed(3)}`,
    // No transition while dragging (1:1 follow), or before the bubble has real
    // pixel positions / the mount-glide is armed (avoids animating from a %
    // fallback, which jumped). Otherwise glide with the calm fixed duration.
    transition: (isSwiping || !glide || !centers)
      ? 'none'
      : `translate ${touchFocusing ? 180 : glideMs}ms ${ease}, scale 300ms ${ease}`,
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
