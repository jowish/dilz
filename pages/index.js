import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTheme } from 'next-themes';
import { translations, traduireVille } from '../lib/translations';
import { supabase } from '../lib/supabase';
import { uploadDealImage, validateImageFile, deleteDealImage } from '../lib/uploadImage';

// ─── Design tokens ────────────────────────────────────────────────────────────
const ACCENT = '#D4622A';
const ACCENT_DARK = '#B84E20';

const STORE_COLORS = {
  'שופרסל':  { color: '#2563EB', bg: '#EFF6FF', dark: '#1A2744', nameEn: 'Shufersal' },
  'רמי לוי': { color: '#DC2626', bg: '#FEF2F2', dark: '#3D1212', nameEn: 'Rami Levy' },
  'ויקטורי': { color: '#7C3AED', bg: '#F5F3FF', dark: '#2A1845', nameEn: 'Victory' },
  'יוחננוף': { color: '#059669', bg: '#ECFDF5', dark: '#0F3025', nameEn: 'Yohananof' },
  'אושר עד': { color: '#D97706', bg: '#FFFBEB', dark: '#3B2500', nameEn: 'Osher Ad' },
  'כרפור':   { color: '#0284C7', bg: '#F0F9FF', dark: '#0C2336', nameEn: 'Carrefour' },
};

const STORE_FILTERS = [
  { id: 'all' },
  { id: 'שופרסל', nameEn: 'Shufersal' },
  { id: 'רמי לוי', nameEn: 'Rami Levy' },
  { id: 'ויקטורי', nameEn: 'Victory' },
  { id: 'יוחננוף', nameEn: 'Yohananof' },
  { id: 'אושר עד', nameEn: 'Osher Ad' },
  { id: 'כרפור',   nameEn: 'Carrefour' },
];

const CATEGORIES = ['all', 'Food', 'Tech', 'Fashion', 'Activities', 'Online'];
const CATEGORY_ICONS = { all: '✦', Food: '🍕', Tech: '💻', Fashion: '👗', Activities: '⚽', Online: '🌐' };

const POPULAR_CITIES = ['תל אביב', 'ירושלים', 'חיפה', 'ראשון לציון', 'נתניה', 'רעננה', 'הרצליה', 'כפר סבא', 'רמת גן', 'פתח תקווה'];

const CITY_COORDS = {
  'תל אביב':      { lat: 32.0853, lon: 34.7818 },
  'ירושלים':      { lat: 31.7683, lon: 35.2137 },
  'חיפה':         { lat: 32.7940, lon: 34.9896 },
  'באר שבע':      { lat: 31.2518, lon: 34.7913 },
  'אילת':         { lat: 29.5577, lon: 34.9519 },
  'נתניה':        { lat: 32.3226, lon: 34.8533 },
  'ראשון לציון':  { lat: 31.9730, lon: 34.7925 },
  'פתח תקווה':    { lat: 32.0878, lon: 34.8878 },
  'אשדוד':        { lat: 31.7918, lon: 34.6495 },
  'אשקלון':       { lat: 31.6688, lon: 34.5743 },
  'הרצליה':       { lat: 32.1652, lon: 34.8440 },
  'כפר סבא':      { lat: 32.1786, lon: 34.9078 },
  'רמת גן':       { lat: 32.0821, lon: 34.8137 },
  'בני ברק':      { lat: 32.0804, lon: 34.8338 },
  'חולון':        { lat: 32.0114, lon: 34.7794 },
  'בת ים':        { lat: 32.0204, lon: 34.7508 },
  'נהריה':        { lat: 33.0073, lon: 35.0987 },
  'עכו':          { lat: 32.9225, lon: 35.0779 },
  'טבריה':        { lat: 32.7956, lon: 35.5310 },
  'צפת':          { lat: 32.9646, lon: 35.4966 },
  'נצרת':         { lat: 32.6996, lon: 35.3034 },
  'רחובות':       { lat: 31.8928, lon: 34.8113 },
  'מודיעין':      { lat: 31.8979, lon: 35.0100 },
  'לוד':          { lat: 31.9519, lon: 34.8893 },
  'רמלה':         { lat: 31.9283, lon: 34.8635 },
  'קריית גת':     { lat: 31.6095, lon: 34.7748 },
  'דימונה':       { lat: 31.0638, lon: 35.0278 },
  'אופקים':       { lat: 31.3120, lon: 34.6221 },
  'עפולה':        { lat: 32.6078, lon: 35.2897 },
  'כרמיאל':       { lat: 32.9146, lon: 35.2962 },
  'ראש העין':     { lat: 32.0969, lon: 34.9566 },
  'רעננה':        { lat: 32.1836, lon: 34.8711 },
  'יהוד':         { lat: 32.0326, lon: 34.8881 },
  'גבעתיים':      { lat: 32.0704, lon: 34.8118 },
  'אור יהודה':    { lat: 32.0267, lon: 34.8569 },
  'קריית אונו':   { lat: 32.0639, lon: 34.8556 },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function timeAgo(date, lang) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 2)  return lang === 'he' ? 'זה עתה'       : 'Just now';
  if (m < 60) return lang === 'he' ? `${m}ד'`       : `${m}m ago`;
  if (h < 24) return lang === 'he' ? `${h}ש'`       : `${h}h ago`;
  return       lang === 'he' ? `${d} ימים`           : `${d}d ago`;
}

function matchSearch(text, q) {
  if (!q || !text) return !q;
  return text.toLowerCase().includes(q.toLowerCase());
}

function computeVoteDeltas(current, next) {
  if (current === next) {
    return { chaud_delta: next === 'chaud' ? -1 : 0, froid_delta: next === 'froid' ? -1 : 0, newVote: null };
  }
  const d = { chaud_delta: 0, froid_delta: 0 };
  if (current === 'chaud') d.chaud_delta -= 1;
  if (current === 'froid') d.froid_delta -= 1;
  if (next === 'chaud') d.chaud_delta += 1;
  if (next === 'froid') d.froid_delta += 1;
  return { ...d, newVote: next };
}

// ─── ThemeToggle ─────────────────────────────────────────────────────────────
function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div style={{ width: 34, height: 34 }} />;
  const dark = resolvedTheme === 'dark';
  return (
    <button
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      aria-label="Toggle theme"
      style={{
        width: 34, height: 34, borderRadius: 10,
        background: 'var(--bg-card2)', border: '0.5px solid var(--border)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-sub)',
      }}
    >
      {dark ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

// ─── StoreBadge ──────────────────────────────────────────────────────────────
function StoreBadge({ store, lang, isDark, size = 'sm' }) {
  const s = STORE_COLORS[store];
  const label = lang === 'en' ? (s?.nameEn || store) : store;
  const pad = size === 'md' ? '4px 10px' : '3px 8px';
  const fs = size === 'md' ? 12 : 11;
  if (!s) return (
    <span style={{ fontSize: fs, fontWeight: 600, padding: pad, borderRadius: 20, background: 'var(--bg-card2)', color: 'var(--text-sub)' }}>{label}</span>
  );
  return (
    <span style={{ fontSize: fs, fontWeight: 700, padding: pad, borderRadius: 20, background: isDark ? s.dark : s.bg, color: s.color }}>
      {label}
    </span>
  );
}

// ─── DiscountBadge ───────────────────────────────────────────────────────────
function DiscountBadge({ pct, size = 'sm' }) {
  if (!pct || pct < 3) return null;
  const fs = size === 'lg' ? 14 : 11;
  const pad = size === 'lg' ? '5px 12px' : '3px 8px';
  return (
    <span style={{ fontSize: fs, fontWeight: 800, padding: pad, borderRadius: 20, background: ACCENT, color: '#fff' }}>
      -{pct}%
    </span>
  );
}

// ─── HeroPromoCard ───────────────────────────────────────────────────────────
function HeroPromoCard({ promo, lang, isDark, onClick, votes, onVote }) {
  const s = STORE_COLORS[promo.meilleurEnseigne] || { color: ACCENT, bg: '#FEF0EB', dark: '#2A1210', nameEn: promo.meilleurEnseigne };
  const nom = (lang === 'en' && promo.nom_en) ? promo.nom_en : promo.nom;
  const myVote = votes?.myVote;

  return (
    <div style={{
      borderRadius: 24, overflow: 'hidden', marginBottom: 16,
      background: isDark
        ? `linear-gradient(145deg, ${s.dark} 0%, #0E0E12 100%)`
        : `linear-gradient(145deg, ${s.bg} 0%, #FFFFFF 100%)`,
      boxShadow: 'var(--shadow-float)',
      border: `0.5px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
    }}>
      {/* Image or gradient banner */}
      <div
        onClick={onClick}
        style={{
          height: 160, cursor: 'pointer', position: 'relative',
          background: isDark
            ? `linear-gradient(145deg, ${s.dark}, #17171D)`
            : `linear-gradient(145deg, ${s.bg}, #fff)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        }}
      >
        {promo.image ? (
          <img
            src={promo.image} alt={nom}
            style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
            onError={e => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div style={{ fontSize: 64, opacity: 0.6 }}>🛍️</div>
        )}
        {/* Overlay badges */}
        <div style={{ position: 'absolute', top: 12, left: 12 }}>
          <StoreBadge store={promo.meilleurEnseigne} lang={lang} isDark={isDark} size="md" />
        </div>
        <div style={{ position: 'absolute', top: 12, right: 12 }}>
          <DiscountBadge pct={promo.reduction} size="sm" />
        </div>
      </div>

      {/* Info row */}
      <div onClick={onClick} style={{ padding: '16px 20px 12px', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
            background: 'var(--bg-card2)', color: 'var(--text-muted)', letterSpacing: '0.3px',
            textTransform: 'uppercase',
          }}>Price comparison</span>
        </div>
        <p style={{
          fontSize: 15, fontWeight: 700, color: 'var(--text)',
          marginBottom: 8, lineHeight: 1.4, textAlign: lang === 'he' ? 'right' : 'left',
        }}>{nom}</p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontSize: 34, fontWeight: 900, color: ACCENT, letterSpacing: '-1px' }}>
            ₪{promo.prixMin.toFixed(2)}
          </span>
          <span style={{ fontSize: 17, color: 'var(--text-muted)', textDecoration: 'line-through' }}>
            ₪{promo.prixMax.toFixed(2)}
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#10B981', marginLeft: 'auto', background: 'rgba(16,185,129,0.1)', padding: '3px 8px', borderRadius: 20 }}>
            ₪{(promo.prixMax - promo.prixMin).toFixed(2)} cheaper
          </span>
        </div>
      </div>

      {/* Vote row */}
      <div style={{
        display: 'flex', gap: 8, padding: '10px 20px 18px',
        borderTop: `0.5px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
      }}>
        <button onClick={() => onVote(promo.barcode, 'chaud')} style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '10px 0', borderRadius: 14, border: 'none',
          background: myVote === 'chaud' ? ACCENT : 'var(--bg-card2)',
          color: myVote === 'chaud' ? '#fff' : 'var(--text)',
          fontSize: 14, fontWeight: 700, cursor: 'pointer',
        }}>🔥 {votes?.chaud || 0} <span style={{ fontSize: 11, opacity: 0.7, fontWeight: 500 }}>Hot</span></button>
        <button onClick={() => onVote(promo.barcode, 'froid')} style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '10px 0', borderRadius: 14, border: 'none',
          background: myVote === 'froid' ? '#6B7280' : 'var(--bg-card2)',
          color: myVote === 'froid' ? '#fff' : 'var(--text)',
          fontSize: 14, fontWeight: 700, cursor: 'pointer',
        }}>❄️ {votes?.froid || 0} <span style={{ fontSize: 11, opacity: 0.7, fontWeight: 500 }}>Cold</span></button>
        <button onClick={onClick} style={{
          padding: '10px 16px', borderRadius: 14, border: 'none',
          background: 'var(--bg-card2)', color: 'var(--text-sub)',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>↗</button>
      </div>
    </div>
  );
}

// ─── PromoCard (compact grid) ─────────────────────────────────────────────────
function PromoCard({ promo, lang, isDark, onClick, votes, onVote }) {
  const s = STORE_COLORS[promo.meilleurEnseigne] || { color: ACCENT, bg: '#FEF0EB', dark: '#2A1210', nameEn: promo.meilleurEnseigne };
  const nom = (lang === 'en' && promo.nom_en) ? promo.nom_en : promo.nom;
  const myVote = votes?.myVote;

  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: 20, overflow: 'hidden',
      boxShadow: 'var(--shadow-card)',
      border: `0.5px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'}`,
    }}>
      <div onClick={onClick} style={{ cursor: 'pointer' }}>
        {/* Colored top */}
        <div style={{
          height: 80,
          background: isDark
            ? `linear-gradient(135deg, ${s.dark}, #17171D)`
            : `linear-gradient(135deg, ${s.bg}, #fff)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}>
          {promo.image ? (
            <img src={promo.image} alt={nom} style={{ maxHeight: 72, maxWidth: '90%', objectFit: 'contain' }}
              onError={e => { e.target.style.display = 'none'; }} />
          ) : (
            <span style={{ fontSize: 36, opacity: 0.7 }}>🛍️</span>
          )}
          <div style={{ position: 'absolute', top: 6, right: 6 }}>
            <DiscountBadge pct={promo.reduction} />
          </div>
        </div>

        {/* Info */}
        <div style={{ padding: '10px 12px 8px' }}>
          <span style={{
            fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px',
            color: 'var(--text-muted)', display: 'block', marginBottom: 3,
          }}>Price comparison</span>
          <p style={{
            fontSize: 12, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4,
            marginBottom: 6, overflow: 'hidden',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            textAlign: lang === 'he' ? 'right' : 'left',
          }}>{nom}</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: ACCENT }}>₪{promo.prixMin.toFixed(2)}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'line-through' }}>₪{promo.prixMax.toFixed(2)}</span>
          </div>
          <StoreBadge store={promo.meilleurEnseigne} lang={lang} isDark={isDark} />
        </div>
      </div>

      {/* Compact vote row */}
      <div style={{ display: 'flex', gap: 4, padding: '6px 8px 10px', borderTop: '0.5px solid var(--border)' }}>
        <button onClick={() => onVote(promo.barcode, 'chaud')} style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
          padding: '5px 0', borderRadius: 10, border: 'none',
          background: myVote === 'chaud' ? ACCENT : 'var(--bg-card2)',
          color: myVote === 'chaud' ? '#fff' : 'var(--text)',
          fontSize: 11, fontWeight: 700, cursor: 'pointer',
        }}>🔥 {votes?.chaud || 0}</button>
        <button onClick={() => onVote(promo.barcode, 'froid')} style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
          padding: '5px 0', borderRadius: 10, border: 'none',
          background: myVote === 'froid' ? '#6B7280' : 'var(--bg-card2)',
          color: myVote === 'froid' ? '#fff' : 'var(--text)',
          fontSize: 11, fontWeight: 700, cursor: 'pointer',
        }}>❄️ {votes?.froid || 0}</button>
      </div>
    </div>
  );
}

// ─── PromoModal ───────────────────────────────────────────────────────────────
function PromoModal({ promo, lang, isDark, onClose }) {
  const nom = (lang === 'en' && promo.nom_en) ? promo.nom_en : promo.nom;
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
      zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-card)', borderRadius: '26px 26px 0 0',
        padding: '20px 20px 48px', width: '100%', maxWidth: 600,
        maxHeight: '80vh', overflowY: 'auto',
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 20px' }} />

        {/* Product name */}
        <p style={{
          fontSize: 18, fontWeight: 800, color: 'var(--text)',
          textAlign: lang === 'he' ? 'right' : 'left',
          marginBottom: 20, lineHeight: 1.35,
        }}>{nom}</p>

        {/* Price comparison */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {promo.tousLesPrix.map(p => {
            const isBest = p.prix === promo.prixMin;
            const ps = STORE_COLORS[p.enseigne] || { color: ACCENT, bg: '#FEF0EB', dark: '#2A1210' };
            return (
              <div key={p.enseigne} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 16px', borderRadius: 16,
                background: isBest
                  ? (isDark ? `rgba(212,98,42,0.12)` : '#FEF0EB')
                  : 'var(--bg-card2)',
                border: isBest ? `1.5px solid ${ACCENT}` : '0.5px solid var(--border)',
              }}>
                <StoreBadge store={p.enseigne} lang={lang} isDark={isDark} size="md" />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {isBest && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#10B981', background: 'rgba(16,185,129,0.12)', padding: '2px 8px', borderRadius: 20 }}>
                      ✓ Best
                    </span>
                  )}
                  <span style={{ fontSize: 22, fontWeight: 900, color: isBest ? ACCENT : 'var(--text)' }}>
                    ₪{p.prix.toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Price comparison summary */}
        <div style={{
          marginTop: 16, padding: '14px 20px', borderRadius: 16,
          background: 'var(--bg-card2)', textAlign: 'center',
        }}>
          <span style={{ fontSize: 14, color: 'var(--text-sub)' }}>
            {lang === 'en' ? 'Price difference:' : 'הפרש מחירים:'}{' '}
            <strong style={{ color: ACCENT, fontWeight: 800 }}>
              ₪{(promo.prixMax - promo.prixMin).toFixed(2)} ({promo.reduction}% cheaper at best store)
            </strong>
          </span>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
            {lang === 'en' ? 'Price comparison across supermarkets — not an official promotion' : 'השוואת מחירים בין רשתות — לא מבצע רשמי'}
          </p>
        </div>

        <button onClick={onClose} style={{
          width: '100%', marginTop: 14, padding: 15, borderRadius: 16, border: 'none',
          background: 'var(--bg-card2)', color: 'var(--text-sub)',
          fontSize: 15, fontWeight: 600, cursor: 'pointer',
        }}>
          {lang === 'en' ? 'Close' : 'סגור'}
        </button>
      </div>
    </div>
  );
}

// ─── DealCard ─────────────────────────────────────────────────────────────────
function DealCard({ deal, lang, onVote, userCoords, votedDeal, user, isDark }) {
  const router = useRouter();
  const reduction = deal.prix_original && deal.prix_original > deal.prix
    ? Math.round((deal.prix_original - deal.prix) / deal.prix_original * 100)
    : null;

  const dealCoords = deal.ville ? CITY_COORDS[deal.ville] : null;
  const dist = (userCoords && dealCoords)
    ? distanceKm(userCoords.lat, userCoords.lon, dealCoords.lat, dealCoords.lon)
    : null;

  const isOwner = user && user.id === deal.auteur_id;
  const commentCount = deal.commentaires?.[0]?.count || 0;

  const go = () => {
    try {
      sessionStorage.setItem('dilzReturnTab', 'deals');
      sessionStorage.setItem('dilzScrollY', String(window.scrollY));
    } catch {}
    router.push(`/deal/${deal.id}`);
  };

  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: 22, overflow: 'hidden',
      boxShadow: 'var(--shadow-card)',
      border: `0.5px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'}`,
      marginBottom: 14,
    }}>
      {/* Image area */}
      <div onClick={go} style={{
        position: 'relative', cursor: 'pointer',
        height: deal.image_url ? 210 : 80,
        background: deal.image_url ? '#000' : 'var(--bg-card2)',
        overflow: 'hidden',
      }}>
        {deal.image_url ? (
          <img
            src={deal.image_url} alt={deal.titre}
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.95 }}
            onError={e => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 32 }}>
              {CATEGORY_ICONS[deal.categorie] || '🛍️'}
            </span>
          </div>
        )}

        {/* Overlaid badges */}
        {deal.categorie && (
          <div style={{ position: 'absolute', top: 12, left: 12 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
              background: 'rgba(0,0,0,0.6)', color: '#fff', backdropFilter: 'blur(8px)',
            }}>
              {CATEGORY_ICONS[deal.categorie]} {deal.categorie}
            </span>
          </div>
        )}
        {reduction !== null && (
          <div style={{ position: 'absolute', top: 12, right: 12 }}>
            <span style={{
              fontSize: 12, fontWeight: 800, padding: '4px 10px', borderRadius: 20,
              background: ACCENT, color: '#fff',
            }}>
              -{reduction}%
            </span>
          </div>
        )}

        {/* Price overlay on image */}
        {deal.image_url && (
          <div style={{
            position: 'absolute', bottom: 12, left: 12,
            background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)',
            padding: '6px 12px', borderRadius: 14,
            display: 'flex', alignItems: 'baseline', gap: 8,
          }}>
            <span style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>₪{deal.prix}</span>
            {deal.prix_original && (
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'line-through' }}>
                ₪{deal.prix_original}
              </span>
            )}
          </div>
        )}

        {isOwner && (
          <div style={{ position: 'absolute', bottom: 12, right: 12 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 10,
              background: `${ACCENT}CC`, color: '#fff',
            }}>✏️ Mine</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '13px 16px 0' }}>
        {!deal.image_url && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 24, fontWeight: 900, color: ACCENT }}>₪{deal.prix}</span>
            {deal.prix_original && (
              <span style={{ fontSize: 14, color: 'var(--text-muted)', textDecoration: 'line-through' }}>₪{deal.prix_original}</span>
            )}
          </div>
        )}

        <p onClick={go} style={{
          fontSize: 15, fontWeight: 700, color: 'var(--text)', cursor: 'pointer',
          marginBottom: 6, lineHeight: 1.35, textAlign: lang === 'he' ? 'right' : 'left',
        }}>{deal.titre}</p>

        {/* Meta row */}
        <p style={{
          fontSize: 12, color: 'var(--text-sub)', marginBottom: 12,
          display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap',
          textAlign: lang === 'he' ? 'right' : 'left',
          justifyContent: lang === 'he' ? 'flex-end' : 'flex-start',
        }}>
          📍 {[deal.magasin, deal.ville ? traduireVille(deal.ville, lang) : null].filter(Boolean).join(' · ')}
          {dist !== null && (
            <span style={{
              marginLeft: 4,
              background: dist <= 10 ? 'rgba(16,185,129,0.12)' : dist <= 50 ? 'rgba(212,98,42,0.1)' : 'var(--bg-card2)',
              color: dist <= 10 ? '#10B981' : dist <= 50 ? ACCENT : 'var(--text-muted)',
              fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10,
            }}>~{dist}km</span>
          )}
          <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>
            · {timeAgo(deal.created_at, lang)}
            {deal.auteur_nom ? ` · ${deal.auteur_nom}` : ''}
          </span>
        </p>

        {/* Action row */}
        <div style={{
          display: 'flex', gap: 6, paddingTop: 10, paddingBottom: 14,
          borderTop: '0.5px solid var(--border)',
        }}>
          <button onClick={() => onVote(deal.id, 'chaud')} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '7px 14px', borderRadius: 20,
            background: votedDeal === 'chaud' ? ACCENT : 'var(--bg-card2)',
            border: votedDeal === 'chaud' ? `none` : '0.5px solid var(--border)',
            color: votedDeal === 'chaud' ? '#fff' : 'var(--text)',
            cursor: 'pointer',
            opacity: votedDeal && votedDeal !== 'chaud' ? 0.6 : 1,
            fontSize: 13, fontWeight: 700,
          }}>🔥 {deal.votes_chaud || 0}</button>

          <button onClick={() => onVote(deal.id, 'froid')} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '7px 14px', borderRadius: 20,
            background: votedDeal === 'froid' ? '#6B7280' : 'var(--bg-card2)',
            border: votedDeal === 'froid' ? 'none' : '0.5px solid var(--border)',
            color: votedDeal === 'froid' ? '#fff' : 'var(--text)',
            cursor: 'pointer',
            opacity: votedDeal && votedDeal !== 'froid' ? 0.6 : 1,
            fontSize: 13, fontWeight: 700,
          }}>❄️ {deal.votes_froid || 0}</button>

          <button onClick={go} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '7px 12px', borderRadius: 20,
            background: 'var(--bg-card2)', border: '0.5px solid var(--border)',
            color: 'var(--text-sub)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            marginLeft: 'auto',
          }}>💬 {commentCount}</button>

          {isOwner && (
            <button onClick={go} style={{
              padding: '7px 10px', borderRadius: 20,
              background: `rgba(212,98,42,0.1)`, border: `0.5px solid ${ACCENT}`,
              color: ACCENT, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>✏️</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CityModal ────────────────────────────────────────────────────────────────
function CityModal({ villes, current, lang, onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const inputRef = useRef(null);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80); }, []);

  const allCities = [...new Set([...POPULAR_CITIES, ...villes])];
  const filtered = allCities.filter(v =>
    v.toLowerCase().includes(search.toLowerCase()) ||
    (traduireVille(v, 'en') || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleGps = () => {
    setGpsLoading(true);
    if (!navigator.geolocation) { setGpsLoading(false); return; }
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=he`
          );
          const d = await r.json();
          const v = d.address?.city || d.address?.town || d.address?.village || null;
          onSelect(v, { lat: latitude, lon: longitude });
          onClose();
        } catch {}
        setGpsLoading(false);
      },
      () => setGpsLoading(false),
      { timeout: 6000 }
    );
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-card)', borderRadius: '26px 26px 0 0',
        padding: '20px 16px 40px', width: '100%', maxWidth: 600,
        maxHeight: '82vh', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 16px' }} />
        <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', textAlign: 'center', marginBottom: 14 }}>
          {lang === 'en' ? '📍 Select your city' : '📍 בחר עיר'}
        </p>

        {/* Search */}
        <input
          ref={inputRef}
          type="text"
          placeholder={lang === 'en' ? 'Search city...' : 'חפש עיר...'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '12px 16px', borderRadius: 16,
            border: '0.5px solid var(--border)', background: 'var(--bg-input)',
            color: 'var(--text)', fontSize: 15, outline: 'none', marginBottom: 12,
          }}
        />

        <div style={{ overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {/* All Israel */}
            <button onClick={() => { onSelect(null, null); onClose(); }} style={{
              padding: '12px 14px', borderRadius: 14, cursor: 'pointer',
              border: !current ? `2px solid ${ACCENT}` : '0.5px solid var(--border)',
              background: !current ? `rgba(212,98,42,0.08)` : 'var(--bg-card2)',
              color: !current ? ACCENT : 'var(--text)',
              fontSize: 14, fontWeight: !current ? 700 : 400,
            }}>
              🇮🇱 {lang === 'en' ? 'All Israel' : 'כל הארץ'}
            </button>

            {/* GPS */}
            <button onClick={handleGps} disabled={gpsLoading} style={{
              padding: '12px 14px', borderRadius: 14, cursor: 'pointer',
              border: '0.5px solid var(--border)', background: 'var(--bg-card2)',
              color: ACCENT, fontSize: 14, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
              {gpsLoading ? '...' : (lang === 'en' ? 'My location' : 'מיקומי')}
            </button>

            {/* Cities */}
            {filtered.map(v => (
              <button key={v} onClick={() => { onSelect(v, CITY_COORDS[v] || null); onClose(); }} style={{
                padding: '12px 14px', borderRadius: 14, cursor: 'pointer',
                border: current === v ? `2px solid ${ACCENT}` : '0.5px solid var(--border)',
                background: current === v ? `rgba(212,98,42,0.08)` : 'var(--bg-card2)',
                color: current === v ? ACCENT : 'var(--text)',
                fontSize: 14, fontWeight: current === v ? 700 : 400,
                textAlign: lang === 'he' ? 'right' : 'left',
              }}>
                {traduireVille(v, lang)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PostDealModal ────────────────────────────────────────────────────────────
function PostDealModal({ user, lang, onClose, onSuccess }) {
  const CATS = ['Food', 'Tech', 'Fashion', 'Activities', 'Online'];
  const router = useRouter();
  const [form, setForm] = useState({
    titre: '', description: '', prix: '', prix_original: '',
    magasin: '', ville: '', categorie: 'Food', url_source: '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadPhase, setUploadPhase] = useState(null); // null | 'photo' | 'saving'
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateImageFile(file);
    if (err) {
      setError(err);
      e.target.value = '';
      return;
    }
    setError('');
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = ev => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!user) { setError('Please sign in to post a deal.'); return; }
    if (!imageFile) {
      setError(lang === 'en' ? 'A photo is required to post a deal.' : 'נדרשת תמונה לפרסום הדיל.');
      return;
    }
    if (!form.titre.trim()) { setError('Title is required.'); return; }
    if (!form.prix) { setError('Price is required.'); return; }
    if (!form.magasin.trim()) { setError('Store / place is required.'); return; }

    setSubmitting(true);
    setError('');
    let uploadPath = null;
    try {
      setUploadPhase('photo');
      const { url, path } = await uploadDealImage(imageFile, user.id);
      uploadPath = path;

      setUploadPhase('saving');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Session expired. Please sign in again.');
        if (uploadPath) await deleteDealImage(uploadPath);
        setSubmitting(false);
        setUploadPhase(null);
        return;
      }
      const res = await fetch('/api/bons-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ...form,
          prix: parseFloat(form.prix),
          prix_original: form.prix_original ? parseFloat(form.prix_original) : null,
          image_url: url,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.erreur) {
        if (uploadPath) await deleteDealImage(uploadPath);
        setError(data.erreur || 'Failed to post deal');
        setSubmitting(false);
        setUploadPhase(null);
        return;
      }
      onSuccess(data.bon_plan?.id || null);
    } catch (e) {
      if (uploadPath) await deleteDealImage(uploadPath);
      setError(e.message || 'Network error. Please try again.');
      setSubmitting(false);
      setUploadPhase(null);
    }
  };

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  if (!user) {
    return (
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        <div onClick={e => e.stopPropagation()} style={{
          background: 'var(--bg-card)', borderRadius: '26px 26px 0 0',
          padding: '28px 20px 48px', width: '100%', maxWidth: 600, textAlign: 'center',
        }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 20px' }} />
          <div style={{ fontSize: 52, marginBottom: 14 }}>📸</div>
          <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>Share a deal</p>
          <p style={{ fontSize: 14, color: 'var(--text-sub)', lineHeight: 1.6, marginBottom: 24, padding: '0 20px' }}>
            Sign in to post deals, vote, and comment with the community.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Link href="/auth" style={{
              display: 'block', padding: '15px', borderRadius: 16,
              background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`,
              color: '#fff', textDecoration: 'none', fontSize: 15, fontWeight: 700,
              boxShadow: `0 4px 18px rgba(212,98,42,0.4)`,
            }}>Sign in to post</Link>
            <button onClick={onClose} style={{
              padding: 14, borderRadius: 16, border: 'none',
              background: 'var(--bg-card2)', color: 'var(--text-sub)',
              fontSize: 15, cursor: 'pointer',
            }}>Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 400, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-card)', borderRadius: '26px 26px 0 0',
        padding: '20px 16px 44px', width: '100%', maxWidth: 600,
        maxHeight: '92vh', overflowY: 'auto',
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <p style={{ fontSize: 19, fontWeight: 800, color: 'var(--text)' }}>🔥 Share a deal</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 22, cursor: 'pointer', padding: '0 4px' }}>×</button>
        </div>

        {/* Photo upload — required */}
        <label style={{ cursor: submitting ? 'default' : 'pointer', display: 'block', marginBottom: 14 }}>
          <div style={{
            height: imagePreview ? 200 : 100, borderRadius: 18,
            border: `2px dashed ${imagePreview ? ACCENT : error && !imageFile ? '#DC2626' : 'var(--border)'}`,
            background: imagePreview ? '#000' : 'var(--bg-card2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            position: 'relative',
          }}>
            {imagePreview ? (
              <img src={imagePreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.95 }} />
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 32, marginBottom: 6 }}>📸</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 2 }}>
                  {lang === 'en' ? 'Add a photo' : 'הוסף תמונה'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  JPEG · PNG · WebP · Max 5 MB
                </div>
              </div>
            )}
            {imagePreview && (
              <div style={{
                position: 'absolute', bottom: 8, right: 8,
                background: 'rgba(0,0,0,0.55)', borderRadius: 10, padding: '4px 9px',
                color: '#fff', fontSize: 11, fontWeight: 600,
              }}>
                {lang === 'en' ? 'Tap to change' : 'לחץ לשינוי'}
              </div>
            )}
          </div>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImage}
            disabled={submitting}
            style={{ display: 'none' }}
          />
        </label>

        {/* Title + Store */}
        {[['Title *', 'titre', lang === 'en' ? 'e.g. Pizza 3+1 at Dominos' : 'לדוגמה: פיצה 3+1 בדומינוס'],
          ['Store / Place *', 'magasin', lang === 'en' ? 'e.g. Rami Levy, KSP, Zara' : 'לדוגמה: רמי לוי, קסטרו']
        ].map(([label, key, ph]) => (
          <div key={key} style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 5 }}>{label}</label>
            <input type="text" placeholder={ph} value={form[key]}
              onChange={e => set(key, e.target.value)}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 14, border: '0.5px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text)', fontSize: 14, outline: 'none' }}
            />
          </div>
        ))}

        {/* City */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 5 }}>City</label>
          <select value={form.ville} onChange={e => set('ville', e.target.value)}
            style={{ width: '100%', padding: '12px 14px', borderRadius: 14, border: '0.5px solid var(--border)', background: 'var(--bg-input)', color: form.ville ? 'var(--text)' : 'var(--text-muted)', fontSize: 14, outline: 'none', appearance: 'none', cursor: 'pointer' }}
          >
            <option value="">{lang === 'en' ? 'Select a city…' : 'בחר עיר…'}</option>
            {Object.keys(CITY_COORDS).map(v => <option key={v} value={v}>{traduireVille(v, lang)}</option>)}
            <option value="אונליין">🌐 Online deal</option>
          </select>
        </div>

        {/* Prices */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          {[['Deal price *', 'prix', '₪39'], ['Original price', 'prix_original', '₪79']].map(([label, key, ph]) => (
            <div key={key}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 5 }}>{label}</label>
              <input type="number" placeholder={ph} value={form[key]}
                onChange={e => set(key, e.target.value)}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 14, border: '0.5px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text)', fontSize: 14, outline: 'none' }}
              />
            </div>
          ))}
        </div>

        {/* Category */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 5 }}>Category</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CATS.map(cat => (
              <button key={cat} onClick={() => set('categorie', cat)} style={{
                padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 13,
                border: form.categorie === cat ? `1.5px solid ${ACCENT}` : '0.5px solid var(--border)',
                background: form.categorie === cat ? `rgba(212,98,42,0.1)` : 'var(--bg-input)',
                color: form.categorie === cat ? ACCENT : 'var(--text-sub)',
                fontWeight: form.categorie === cat ? 700 : 400,
              }}>{CATEGORY_ICONS[cat]} {cat}</button>
            ))}
          </div>
        </div>

        {/* Link + Description */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 5 }}>Link (optional)</label>
          <input type="url" placeholder="https://..." value={form.url_source}
            onChange={e => set('url_source', e.target.value)}
            style={{ width: '100%', padding: '12px 14px', borderRadius: 14, border: '0.5px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text)', fontSize: 14, outline: 'none' }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 5 }}>Description (optional)</label>
          <textarea placeholder={lang === 'en' ? 'More details about the deal...' : 'פרטים נוספים...'} value={form.description}
            onChange={e => set('description', e.target.value)} rows={2}
            style={{ width: '100%', padding: '12px 14px', borderRadius: 14, border: '0.5px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text)', fontSize: 14, outline: 'none', resize: 'vertical' }}
          />
        </div>

        {error && (
          <p style={{
            color: '#DC2626', fontSize: 13, marginBottom: 10,
            background: 'rgba(220,38,38,0.08)', borderRadius: 10,
            padding: '8px 12px', lineHeight: 1.5,
          }}>{error}</p>
        )}

        <button onClick={handleSubmit} disabled={submitting} style={{
          width: '100%', padding: 16, borderRadius: 16, border: 'none',
          background: submitting ? 'var(--bg-card2)' : `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`,
          color: submitting ? 'var(--text-muted)' : '#fff',
          fontSize: 16, fontWeight: 700, cursor: submitting ? 'default' : 'pointer',
          boxShadow: submitting ? 'none' : `0 4px 18px rgba(212,98,42,0.4)`,
        }}>
          {uploadPhase === 'photo'
            ? (lang === 'en' ? '📤 Uploading photo...' : '📤 מעלה תמונה...')
            : uploadPhase === 'saving'
              ? (lang === 'en' ? '💾 Saving deal...' : '💾 שומר דיל...')
              : (lang === 'en' ? 'Share deal 🔥' : 'שתף דיל 🔥')}
        </button>
      </div>
    </div>
  );
}

// ─── SearchTab ────────────────────────────────────────────────────────────────
function SearchTab({ promos, deals, lang, isDark, onPromoClick, userCoords, votedDeals, onDealVote, user }) {
  const [q, setQ] = useState('');
  const inputRef = useRef(null);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80); }, []);

  const mPromos = q.length > 1
    ? promos.filter(p => matchSearch(p.nom, q) || matchSearch(p.nom_en, q))
    : [];
  const mDeals = q.length > 1
    ? deals.filter(d => matchSearch(d.titre, q) || matchSearch(d.magasin, q) || matchSearch(d.ville, q))
    : [];

  const total = mPromos.length + mDeals.length;

  return (
    <div style={{ padding: '0 14px' }}>
      {/* Search input */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--bg-card)', borderRadius: 18,
        border: '0.5px solid var(--border)', padding: '0 16px',
        boxShadow: 'var(--shadow-card)', marginBottom: 20,
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder={lang === 'en' ? 'Search deals, stores, products...' : 'חפש דילים, חנויות, מוצרים...'}
          style={{
            flex: 1, padding: '14px 0', background: 'none', border: 'none',
            color: 'var(--text)', fontSize: 16, outline: 'none',
          }}
        />
        {q && (
          <button onClick={() => setQ('')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer', padding: 0 }}>×</button>
        )}
      </div>

      {!q && (
        <div style={{ textAlign: 'center', paddingTop: 40 }}>
          <p style={{ fontSize: 42, marginBottom: 14 }}>🔍</p>
          <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
            {lang === 'en' ? 'Search Dilz' : 'חיפוש בדילז'}
          </p>
          <p style={{ fontSize: 14, color: 'var(--text-sub)', lineHeight: 1.6 }}>
            {lang === 'en'
              ? 'Try: milk, diapers, pizza\nחלב, חיתולים, פיצה'
              : 'נסה: חלב, חיתולים, פיצה'}
          </p>
        </div>
      )}

      {q.length > 0 && q.length < 2 && (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
          {lang === 'en' ? 'Keep typing...' : 'המשך להקליד...'}
        </p>
      )}

      {q.length >= 2 && total === 0 && (
        <div style={{ textAlign: 'center', paddingTop: 40 }}>
          <p style={{ fontSize: 36, marginBottom: 12 }}>🤷</p>
          <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            {lang === 'en' ? 'No results for' : 'לא נמצאו תוצאות עבור'} "{q}"
          </p>
          <p style={{ fontSize: 14, color: 'var(--text-sub)', lineHeight: 1.6 }}>
            {lang === 'en'
              ? 'Try a different spelling or search in Hebrew'
              : 'נסה איות אחר או חפש באנגלית'}
          </p>
        </div>
      )}

      {mPromos.length > 0 && (
        <>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-sub)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Store Promotions ({mPromos.length})
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
            {mPromos.slice(0, 6).map(p => (
              <PromoCard key={p.barcode} promo={p} lang={lang} isDark={isDark}
                onClick={() => onPromoClick(p)} votes={{}} onVote={() => {}} />
            ))}
          </div>
        </>
      )}

      {mDeals.length > 0 && (
        <>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-sub)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Community Deals ({mDeals.length})
          </p>
          {mDeals.slice(0, 5).map(d => (
            <DealCard key={d.id} deal={d} lang={lang} isDark={isDark}
              userCoords={userCoords} votedDeal={votedDeals[d.id] || null}
              onVote={onDealVote} user={user} />
          ))}
        </>
      )}
    </div>
  );
}

// ─── ProfileTab ───────────────────────────────────────────────────────────────
function ProfileTab({ user, lang, onOpenAlerts }) {
  if (!user) {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>👤</div>
        <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>
          {lang === 'en' ? 'Join Dilz' : 'הצטרף לדילז'}
        </p>
        <p style={{ fontSize: 15, color: 'var(--text-sub)', lineHeight: 1.7, marginBottom: 28 }}>
          {lang === 'en'
            ? 'Sign in to post deals, vote, comment, and save your favorites.'
            : 'התחבר כדי לשתף דילים, להצביע, להגיב ולשמור מועדפים.'}
        </p>

        {/* Benefits */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28, textAlign: 'left' }}>
          {[
            ['📸', lang === 'en' ? 'Post deals from any store' : 'פרסם דילים מכל חנות'],
            ['🔥', lang === 'en' ? 'Vote hot or cold on deals' : 'הצבע חם או קר על דילים'],
            ['💬', lang === 'en' ? 'Comment and discuss' : 'הגב ודון עם הקהילה'],
            ['❤️', lang === 'en' ? 'Save your favorite deals' : 'שמור דילים מועדפים'],
          ].map(([icon, text]) => (
            <div key={text} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'var(--bg-card)', padding: '14px 16px', borderRadius: 16,
              boxShadow: 'var(--shadow-card)',
            }}>
              <span style={{ fontSize: 20 }}>{icon}</span>
              <span style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>{text}</span>
            </div>
          ))}
        </div>

        <Link href="/auth" style={{
          display: 'block', padding: '16px', borderRadius: 18, textDecoration: 'none',
          background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`,
          color: '#fff', fontSize: 16, fontWeight: 700,
          boxShadow: `0 4px 20px rgba(212,98,42,0.4)`,
        }}>
          {lang === 'en' ? 'Sign in / Sign up' : 'התחבר / הרשם'}
        </Link>
      </div>
    );
  }

  const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'User';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div style={{ padding: '0 14px' }}>
      {/* Profile card */}
      <div style={{
        background: 'var(--bg-card)', borderRadius: 24, padding: '22px 20px',
        marginBottom: 16, boxShadow: 'var(--shadow-card)',
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{
          width: 58, height: 58, borderRadius: '50%', flexShrink: 0,
          background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ color: '#fff', fontSize: 20, fontWeight: 800 }}>{initials}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 2 }}>{displayName}</p>
          <p style={{ fontSize: 13, color: 'var(--text-sub)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
        </div>
      </div>

      {/* Quick links */}
      {[
        { icon: '🛍️', label: lang === 'en' ? 'My posted deals' : 'הדילים שלי', href: '/profil' },
        { icon: '⚙️', label: lang === 'en' ? 'Account settings' : 'הגדרות חשבון', href: '/profil' },
        { icon: '🗺️', label: lang === 'en' ? 'Deals map' : 'מפת דילים', href: '/map' },
      ].map(item => (
        <Link key={item.href + item.label} href={item.href} style={{
          display: 'flex', alignItems: 'center', gap: 14,
          background: 'var(--bg-card)', borderRadius: 18, padding: '16px 18px',
          marginBottom: 10, textDecoration: 'none',
          boxShadow: 'var(--shadow-card)',
        }}>
          <span style={{ fontSize: 20 }}>{item.icon}</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{item.label}</span>
          <svg style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </Link>
      ))}

      {/* Alerts link */}
      <button onClick={onOpenAlerts} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 14,
        background: 'var(--bg-card)', borderRadius: 18, padding: '16px 18px',
        marginBottom: 10, border: 'none', cursor: 'pointer', textAlign: 'left',
        boxShadow: 'var(--shadow-card)',
      }}>
        <span style={{ fontSize: 20 }}>🔔</span>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
          {lang === 'en' ? 'My deal alerts' : 'התראות שלי'}
        </span>
        <svg style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>

      <button onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }} style={{
        width: '100%', marginTop: 8, padding: '14px', borderRadius: 16, border: 'none',
        background: 'var(--bg-card2)', color: 'var(--text-sub)',
        fontSize: 14, fontWeight: 600, cursor: 'pointer',
      }}>
        {lang === 'en' ? 'Sign out' : 'התנתק'}
      </button>
    </div>
  );
}

// ─── AlertModal ───────────────────────────────────────────────────────────────
function AlertModal({ user, lang, onClose }) {
  const ACCENT = '#D4622A';
  const [tab, setTab] = useState('list');
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ city: '', online_only: false, min_discount_percent: '', keyword: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { setLoading(false); return; }
      fetch('/api/alerts', { headers: { 'Authorization': `Bearer ${data.session.access_token}` } })
        .then(r => r.json())
        .then(d => { setAlerts(d.alerts || []); setLoading(false); })
        .catch(() => setLoading(false));
    });
  }, [user]);

  const handleCreate = async () => {
    setSaving(true); setError('');
    const { data } = await supabase.auth.getSession();
    if (!data.session) { setError('Session expired.'); setSaving(false); return; }

    const body = {
      city: form.city || null,
      online_only: form.online_only,
      min_discount_percent: form.min_discount_percent !== '' ? Number(form.min_discount_percent) : null,
      keyword: form.keyword.trim() || null,
    };

    // Ask for push permission when creating first alert
    if ('Notification' in window && Notification.permission === 'default') {
      const perm = await Notification.requestPermission().catch(() => 'denied');
      if (perm === 'granted' && 'serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.ready;
          const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
          if (vapidKey) {
            const sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: vapidKey,
            });
            const k = sub.getKey('p256dh');
            const a = sub.getKey('auth');
            await fetch('/api/push-subscription', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${data.session.access_token}` },
              body: JSON.stringify({
                endpoint: sub.endpoint,
                p256dh: k ? btoa(String.fromCharCode(...new Uint8Array(k))) : '',
                auth: a ? btoa(String.fromCharCode(...new Uint8Array(a))) : '',
              }),
            }).catch(() => {});
          }
        } catch {}
      }
    }

    const res = await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${data.session.access_token}` },
      body: JSON.stringify(body),
    });
    const result = await res.json();
    if (!res.ok) { setError(result.erreur || 'Could not create alert.'); setSaving(false); return; }
    setAlerts(prev => [result.alert, ...prev]);
    setForm({ city: '', online_only: false, min_discount_percent: '', keyword: '' });
    setTab('list');
    setSaving(false);
  };

  const handleToggle = async (alert) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    await fetch('/api/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${data.session.access_token}` },
      body: JSON.stringify({ id: alert.id, is_active: !alert.is_active }),
    });
    setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, is_active: !a.is_active } : a));
  };

  const handleDelete = async (id) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    await fetch(`/api/alerts?id=${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${data.session.access_token}` },
    });
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  function alertSummary(a) {
    const parts = [];
    if (a.city) parts.push(`📍 ${a.city}`);
    if (a.online_only) parts.push('🌐 Online');
    if (a.min_discount_percent != null) parts.push(`-${a.min_discount_percent}%+`);
    if (a.keyword) parts.push(`"${a.keyword}"`);
    return parts.join('  ·  ') || 'All new deals';
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-card)', borderRadius: '26px 26px 0 0',
        padding: '20px 16px 44px', width: '100%', maxWidth: 600,
        maxHeight: '88vh', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <p style={{ fontSize: 19, fontWeight: 800, color: 'var(--text)' }}>🔔 My Alerts</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 22, cursor: 'pointer', padding: '0 4px' }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {[['list', '📋 My alerts'], ['new', '+ New alert']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              flex: 1, padding: '9px 0', borderRadius: 12, cursor: 'pointer', fontSize: 13, fontWeight: 700,
              border: tab === id ? `1.5px solid ${ACCENT}` : '0.5px solid var(--border)',
              background: tab === id ? `rgba(212,98,42,0.1)` : 'var(--bg-card2)',
              color: tab === id ? ACCENT : 'var(--text-sub)',
            }}>{label}</button>
          ))}
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {/* ── List tab ── */}
          {tab === 'list' && (
            loading ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: 40, fontSize: 14 }}>Loading...</p>
            ) : alerts.length === 0 ? (
              <div style={{ textAlign: 'center', paddingTop: 40 }}>
                <p style={{ fontSize: 40, marginBottom: 12 }}>🔔</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>No alerts yet</p>
                <p style={{ fontSize: 14, color: 'var(--text-sub)', marginBottom: 20, lineHeight: 1.6 }}>
                  Create an alert and get notified when new deals match your criteria.
                </p>
                <button onClick={() => setTab('new')} style={{
                  padding: '11px 24px', borderRadius: 14, border: 'none',
                  background: `linear-gradient(135deg, ${ACCENT}, #B84E20)`,
                  color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}>+ Create your first alert</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {alerts.map(a => (
                  <div key={a.id} style={{
                    padding: '14px 16px', borderRadius: 18,
                    background: 'var(--bg-card2)',
                    border: `0.5px solid ${a.is_active ? ACCENT + '44' : 'var(--border)'}`,
                    opacity: a.is_active ? 1 : 0.6,
                  }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 10, lineHeight: 1.4 }}>
                      {alertSummary(a)}
                    </p>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button onClick={() => handleToggle(a)} style={{
                        flex: 1, padding: '7px 0', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                        border: a.is_active ? `1px solid ${ACCENT}` : '0.5px solid var(--border)',
                        background: a.is_active ? `rgba(212,98,42,0.1)` : 'var(--bg-card)',
                        color: a.is_active ? ACCENT : 'var(--text-muted)',
                      }}>{a.is_active ? '● Active' : '○ Paused'}</button>
                      <button onClick={() => handleDelete(a.id)} style={{
                        padding: '7px 12px', borderRadius: 10, cursor: 'pointer', fontSize: 13,
                        border: '0.5px solid var(--border)', background: 'var(--bg-card)',
                        color: '#DC2626',
                      }}>🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* ── New alert tab ── */}
          {tab === 'new' && (
            <div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 6 }}>City (optional)</label>
                <select value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} style={{
                  width: '100%', padding: '12px 14px', borderRadius: 14,
                  border: '0.5px solid var(--border)', background: 'var(--bg-input)',
                  color: form.city ? 'var(--text)' : 'var(--text-muted)',
                  fontSize: 14, outline: 'none', cursor: 'pointer',
                }}>
                  <option value="">🌍 All of Israel</option>
                  {POPULAR_CITIES.map(v => <option key={v} value={v}>{v}</option>)}
                  <option value="אונליין">🌐 Online only</option>
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <div
                    onClick={() => setForm(f => ({ ...f, online_only: !f.online_only }))}
                    style={{
                      width: 42, height: 24, borderRadius: 12, position: 'relative', cursor: 'pointer',
                      background: form.online_only ? ACCENT : 'var(--bg-card2)',
                      border: '0.5px solid var(--border)', transition: 'background 0.2s',
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: 2, left: form.online_only ? 20 : 2,
                      width: 18, height: 18, borderRadius: '50%', background: '#fff',
                      transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }} />
                  </div>
                  <span style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>Online deals only 🌐</span>
                </label>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 6 }}>Minimum discount % (optional)</label>
                <input
                  type="number" min="0" max="100" placeholder="e.g. 30"
                  value={form.min_discount_percent}
                  onChange={e => setForm(f => ({ ...f, min_discount_percent: e.target.value }))}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 14, border: '0.5px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text)', fontSize: 14, outline: 'none' }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 6 }}>Keyword (optional)</label>
                <input
                  type="text" placeholder='e.g. Nike, iPhone, pizza…'
                  value={form.keyword}
                  onChange={e => setForm(f => ({ ...f, keyword: e.target.value }))}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 14, border: '0.5px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text)', fontSize: 14, outline: 'none' }}
                />
              </div>

              {error && (
                <p style={{ color: '#DC2626', fontSize: 13, marginBottom: 12, background: 'rgba(220,38,38,0.08)', borderRadius: 10, padding: '8px 12px' }}>{error}</p>
              )}

              <button onClick={handleCreate} disabled={saving} style={{
                width: '100%', padding: 15, borderRadius: 16, border: 'none',
                background: saving ? 'var(--bg-card2)' : `linear-gradient(135deg, ${ACCENT}, #B84E20)`,
                color: saving ? 'var(--text-muted)' : '#fff',
                fontSize: 15, fontWeight: 700, cursor: saving ? 'default' : 'pointer',
                boxShadow: saving ? 'none' : `0 4px 18px rgba(212,98,42,0.4)`,
              }}>
                {saving ? 'Creating…' : '🔔 Create alert'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── NotificationSheet ────────────────────────────────────────────────────────
function NotificationSheet({ user, lang, notifications, onClose, onMarkAllRead, onOpenAlerts }) {
  const ACCENT = '#D4622A';
  const router = useRouter();
  const unread = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  const handleNotifClick = async (notif) => {
    if (!notif.is_read) {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        await fetch('/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${data.session.access_token}` },
          body: JSON.stringify({ id: notif.id }),
        }).catch(() => {});
      }
    }
    onClose();
    router.push(`/deal/${notif.deal_id}`);
  };

  function timeAgoShort(date) {
    const d = Date.now() - new Date(date).getTime();
    const m = Math.floor(d / 60000);
    const h = Math.floor(d / 3600000);
    const days = Math.floor(d / 86400000);
    if (m < 2)  return 'now';
    if (m < 60) return `${m}m`;
    if (h < 24) return `${h}h`;
    return `${days}d`;
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-card)', borderRadius: '26px 26px 0 0',
        padding: '20px 16px 44px', width: '100%', maxWidth: 600,
        maxHeight: '80vh', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 16px' }} />

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <p style={{ fontSize: 19, fontWeight: 800, color: 'var(--text)' }}>
            🔔 Notifications {unread > 0 && <span style={{ fontSize: 13, fontWeight: 700, color: ACCENT, marginLeft: 6 }}>({unread} new)</span>}
          </p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 22, cursor: 'pointer', padding: '0 4px' }}>×</button>
        </div>

        {/* Actions row */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <button onClick={() => { onClose(); onOpenAlerts(); }} style={{
            flex: 1, padding: '9px 0', borderRadius: 12, cursor: 'pointer', fontSize: 13, fontWeight: 600,
            border: `1px solid ${ACCENT}`, background: `rgba(212,98,42,0.08)`, color: ACCENT,
          }}>⚙️ Manage alerts</button>
          {unread > 0 && (
            <button onClick={onMarkAllRead} style={{
              flex: 1, padding: '9px 0', borderRadius: 12, cursor: 'pointer', fontSize: 13, fontWeight: 600,
              border: '0.5px solid var(--border)', background: 'var(--bg-card2)', color: 'var(--text-sub)',
            }}>✓ Mark all read</button>
          )}
        </div>

        {/* List */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {notifications.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: 40 }}>
              <p style={{ fontSize: 40, marginBottom: 12 }}>🔕</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>No notifications yet</p>
              <p style={{ fontSize: 14, color: 'var(--text-sub)', lineHeight: 1.6, marginBottom: 20 }}>
                Create alerts to be notified when new deals match your criteria.
              </p>
              <button onClick={() => { onClose(); onOpenAlerts(); }} style={{
                padding: '11px 24px', borderRadius: 14, border: 'none',
                background: `linear-gradient(135deg, ${ACCENT}, #B84E20)`,
                color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}>🔔 Set up alerts</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => handleNotifClick(n)}
                  style={{
                    padding: '13px 14px', borderRadius: 16, cursor: 'pointer',
                    background: n.is_read ? 'var(--bg-card2)' : `rgba(212,98,42,0.07)`,
                    border: n.is_read ? '0.5px solid var(--border)' : `1px solid ${ACCENT}44`,
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                  }}
                >
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 5,
                    background: n.is_read ? 'var(--border)' : ACCENT,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {n.title}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-sub)' }}>{n.message}</p>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, paddingTop: 2 }}>
                    {timeAgoShort(n.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Home component ──────────────────────────────────────────────────────
export default function Home() {
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState('en');

  // Tab
  const [tab, setTab] = useState('sales');

  // Data
  const [promos, setPromos] = useState([]);
  const [loadingPromos, setLoadingPromos] = useState(true);
  const [deals, setDeals] = useState([]);
  const [loadingDeals, setLoadingDeals] = useState(false);

  // Filters
  const [storeFilter, setStoreFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortDeals, setSortDeals] = useState('hot');
  const [myDealsOnly, setMyDealsOnly] = useState(false);

  // City
  const [ville, setVille] = useState(null);
  const [userCoords, setUserCoords] = useState(null);
  const [villes, setVilles] = useState([]);
  const [showCityModal, setShowCityModal] = useState(false);

  // Votes
  const [promoVotes, setPromoVotes] = useState({});
  const [votedDeals, setVotedDeals] = useState({});

  // Auth
  const [user, setUser] = useState(null);

  // Modals
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [postSuccess, setPostSuccess] = useState(false);

  // Alerts & Notifications
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showNotificationSheet, setShowNotificationSheet] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const t = translations[lang];
  const dir = lang === 'he' ? 'rtl' : 'ltr';
  const isDark = resolvedTheme === 'dark';

  // ── Init ──
  useEffect(() => {
    setMounted(true);
    try {
      const pv = localStorage.getItem('dilzPromoVotes');
      if (pv) setPromoVotes(JSON.parse(pv));
      const dv = localStorage.getItem('dilzDealVotes');
      if (dv) setVotedDeals(JSON.parse(dv));
      const ll = localStorage.getItem('dilzLang');
      if (ll) setLang(ll);
      // Restore tab from back-nav
      const rt = sessionStorage.getItem('dilzReturnTab');
      if (rt) {
        setTab(rt);
        sessionStorage.removeItem('dilzReturnTab');
        const sy = sessionStorage.getItem('dilzScrollY');
        if (sy) {
          sessionStorage.removeItem('dilzScrollY');
          setTimeout(() => window.scrollTo({ top: parseInt(sy), behavior: 'instant' }), 300);
        }
      }
      // Restore sort after posting a deal (show user their new deal)
      const rs = sessionStorage.getItem('dilzReturnSort');
      if (rs) { setSortDeals(rs); sessionStorage.removeItem('dilzReturnSort'); }
    } catch {}

    fetch('/api/promos')
      .then(r => r.json())
      .then(d => { setPromos(d.promos || []); setLoadingPromos(false); })
      .catch(() => setLoadingPromos(false));

    fetch('/api/villes')
      .then(r => r.json())
      .then(d => setVilles(d.villes || []))
      .catch(() => {});

    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user || null;
      setUser(u);
      if (u && data.session) {
        fetch('/api/notifications', { headers: { 'Authorization': `Bearer ${data.session.access_token}` } })
          .then(r => r.ok ? r.json() : null)
          .then(d => {
            if (d) {
              setNotifications(d.notifications || []);
              setUnreadCount((d.notifications || []).filter(n => !n.is_read).length);
            }
          }).catch(() => {});
      }
    });
  }, []);

  // ── Deals fetch ──
  useEffect(() => {
    if (tab !== 'deals' && tab !== 'search') return;
    setLoadingDeals(true);
    const params = new URLSearchParams();
    if (categoryFilter !== 'all') params.set('categorie', categoryFilter);
    params.set('tri', sortDeals === 'nearby' ? 'latest' : sortDeals);
    if (myDealsOnly && user?.id) params.set('auteur_id', user.id);
    fetch(`/api/bons-plans?${params}`)
      .then(r => r.json())
      .then(d => { setDeals(d.bons_plans || []); setLoadingDeals(false); })
      .catch(() => setLoadingDeals(false));
  }, [tab, categoryFilter, sortDeals, myDealsOnly, user]);

  // Also fetch deals when switching to search tab if empty
  useEffect(() => {
    if (tab === 'search' && deals.length === 0 && !loadingDeals) {
      setLoadingDeals(true);
      fetch('/api/bons-plans?tri=latest')
        .then(r => r.json())
        .then(d => { setDeals(d.bons_plans || []); setLoadingDeals(false); })
        .catch(() => setLoadingDeals(false));
    }
  }, [tab]);

  const handleCitySelect = (villeNom, coords) => {
    setVille(villeNom);
    const c = coords || (villeNom ? CITY_COORDS[villeNom] || null : null);
    setUserCoords(c);
    if (c) setSortDeals('nearby');
    else setSortDeals('hot');
  };

  const handleLangToggle = () => {
    const next = lang === 'en' ? 'he' : 'en';
    setLang(next);
    try { localStorage.setItem('dilzLang', next); } catch {}
  };

  const handleDealVote = async (id, type) => {
    if (!user) { router.push('/auth'); return; }

    // Get auth token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/auth'); return; }

    // Compute optimistic state
    const currentVote = votedDeals[id] || null;
    const optimisticNewVote = currentVote === type ? null : type;
    const chaud_delta = (currentVote === 'chaud' ? -1 : 0) + (optimisticNewVote === 'chaud' ? 1 : 0);
    const froid_delta = (currentVote === 'froid' ? -1 : 0) + (optimisticNewVote === 'froid' ? 1 : 0);

    // Optimistic update
    setVotedDeals(prev => {
      const next = { ...prev, [id]: optimisticNewVote };
      try { localStorage.setItem('dilzDealVotes', JSON.stringify(next)); } catch {}
      return next;
    });
    setDeals(prev => prev.map(d => d.id !== id ? d : {
      ...d,
      votes_chaud: Math.max(0, (d.votes_chaud || 0) + chaud_delta),
      votes_froid: Math.max(0, (d.votes_froid || 0) + froid_delta),
    }));

    const apiRes = await fetch('/api/bons-plans', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        action: 'vote', id, type,
        // Fallback deltas for when votes table isn't set up yet
        chaud_delta, froid_delta,
      }),
    });

    if (apiRes.ok) {
      const data = await apiRes.json();
      // Reconcile with server-authoritative state
      const serverVote = data.newType ?? null;
      setVotedDeals(prev => {
        const next = { ...prev, [id]: serverVote };
        try { localStorage.setItem('dilzDealVotes', JSON.stringify(next)); } catch {}
        return next;
      });
      if (data.votes_chaud !== undefined) {
        setDeals(prev => prev.map(d => d.id !== id ? d : {
          ...d,
          votes_chaud: data.votes_chaud,
          votes_froid: data.votes_froid,
        }));
      }
    } else {
      // Rollback
      setVotedDeals(prev => {
        const next = { ...prev, [id]: currentVote };
        try { localStorage.setItem('dilzDealVotes', JSON.stringify(next)); } catch {}
        return next;
      });
      setDeals(prev => prev.map(d => d.id !== id ? d : {
        ...d,
        votes_chaud: Math.max(0, (d.votes_chaud || 0) - chaud_delta),
        votes_froid: Math.max(0, (d.votes_froid || 0) - froid_delta),
      }));
    }
  };

  const handlePromoVote = (barcode, type) => {
    setPromoVotes(prev => {
      const cur = prev[barcode] || { chaud: 0, froid: 0, myVote: null };
      let updated;
      if (cur.myVote === type) {
        updated = { ...cur, [type]: Math.max(0, cur[type] - 1), myVote: null };
      } else {
        const undo = cur.myVote ? { [cur.myVote]: Math.max(0, cur[cur.myVote] - 1) } : {};
        updated = { ...cur, ...undo, [type]: cur[type] + 1, myVote: type };
      }
      const next = { ...prev, [barcode]: updated };
      try { localStorage.setItem('dilzPromoVotes', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const handlePostSuccess = (newId) => {
    setShowPostModal(false);
    if (newId) {
      // When user navigates back, they'll see the feed sorted by New so their deal is visible
      try { sessionStorage.setItem('dilzReturnSort', 'latest'); } catch {}
      router.push(`/deal/${newId}`);
    } else {
      // No id returned — fall back to showing the feed sorted by New
      setSortDeals('latest');
      setPostSuccess(true);
      setTimeout(() => {
        setPostSuccess(false);
        setTab('deals');
        setLoadingDeals(true);
        fetch('/api/bons-plans?tri=latest')
          .then(r => r.json())
          .then(d => { setDeals(d.bons_plans || []); setLoadingDeals(false); })
          .catch(() => setLoadingDeals(false));
      }, 1800);
    }
  };

  // Computed displayed deals (proximity sort)
  const displayedDeals = (sortDeals === 'nearby' && userCoords)
    ? [...deals].sort((a, b) => {
        const ca = a.ville ? CITY_COORDS[a.ville] : null;
        const cb = b.ville ? CITY_COORDS[b.ville] : null;
        const da = ca ? distanceKm(userCoords.lat, userCoords.lon, ca.lat, ca.lon) : Infinity;
        const db = cb ? distanceKm(userCoords.lat, userCoords.lon, cb.lat, cb.lon) : Infinity;
        return da - db;
      })
    : deals;

  const filteredPromos = storeFilter === 'all' ? promos : promos.filter(p => p.meilleurEnseigne === storeFilter);
  const heroPromo = filteredPromos[0] || null;
  const gridPromos = filteredPromos.slice(1);

  if (!mounted) return null;

  const cityLabel = ville ? traduireVille(ville, lang) : (lang === 'en' ? 'All Israel' : 'כל הארץ');

  // ── Nav items ──
  const NAV = [
    {
      id: 'sales',
      label: t.nav.sales,
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? ACCENT : 'var(--text-sub)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
      ),
    },
    {
      id: 'deals',
      label: t.nav.deals,
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? ACCENT : 'none'} stroke={active ? ACCENT : 'var(--text-sub)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      ),
    },
    {
      id: 'search',
      label: t.nav.search,
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? ACCENT : 'var(--text-sub)'} strokeWidth="1.8" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      ),
    },
    {
      id: 'profile',
      label: t.nav.profile,
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? ACCENT : 'var(--text-sub)'} strokeWidth="1.8" strokeLinecap="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
      ),
    },
  ];

  return (
    <>
      <Head>
        <title>Dilz — Best deals & promotions in Israel</title>
        <meta name="description" content="Compare supermarket prices, discover community deals, and save money in Israel. Official promos from Shufersal, Rami Levy, Victory, Yohananof and more." />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta property="og:title" content="Dilz — Smart deals in Israel" />
        <meta property="og:description" content="Official supermarket promos + community deals. Find the best prices near you." />
        <meta name="theme-color" content="#D4622A" />
      </Head>

      <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 84 }} dir={dir}>

        {/* ── Sticky Header ── */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 100,
          background: 'var(--nav-bg)',
          borderBottom: `0.5px solid var(--border)`,
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        }}>
          <div style={{ maxWidth: 600, margin: '0 auto', padding: '10px 14px 10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

              {/* Left controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ThemeToggle />
                <button onClick={handleLangToggle} style={{
                  height: 34, padding: '0 10px', borderRadius: 10,
                  background: 'var(--bg-card2)', border: '0.5px solid var(--border)',
                  color: 'var(--text-sub)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}>
                  {lang === 'en' ? 'עב' : 'EN'}
                </button>
              </div>

              {/* Logo — centered */}
              <div style={{ flex: 1, textAlign: 'center' }}>
                <span style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.5px', cursor: 'pointer' }}
                  onClick={() => setTab('sales')}>
                  dil<span style={{ color: ACCENT }}>z</span>
                </span>
              </div>

              {/* Right controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {/* City selector */}
                <button onClick={() => setShowCityModal(true)} style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  height: 34, padding: '0 10px', borderRadius: 20,
                  background: ville ? `rgba(212,98,42,0.1)` : 'var(--bg-card2)',
                  border: ville ? `1px solid ${ACCENT}` : '0.5px solid var(--border)',
                  color: ville ? ACCENT : 'var(--text-sub)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  maxWidth: 100, overflow: 'hidden',
                }}>
                  <span style={{ fontSize: 12 }}>📍</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {cityLabel}
                  </span>
                </button>

                {/* Bell / notifications */}
                {user && (
                  <button onClick={() => setShowNotificationSheet(true)} aria-label="Notifications" style={{
                    position: 'relative', width: 34, height: 34, borderRadius: '50%',
                    background: 'var(--bg-card2)', border: '0.5px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', flexShrink: 0,
                  }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-sub)" strokeWidth="2" strokeLinecap="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    </svg>
                    {unreadCount > 0 && (
                      <span style={{
                        position: 'absolute', top: -2, right: -2,
                        minWidth: 16, height: 16, borderRadius: 8,
                        background: ACCENT, color: '#fff',
                        fontSize: 9, fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '0 3px',
                      }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                    )}
                  </button>
                )}

                {/* Profile avatar */}
                <button onClick={() => setTab('profile')} style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: user
                    ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`
                    : 'var(--bg-card2)',
                  border: '0.5px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', flexShrink: 0,
                }}>
                  {user ? (
                    <span style={{ color: '#fff', fontSize: 12, fontWeight: 800 }}>
                      {(user.user_metadata?.display_name || user.email || 'U').slice(0, 2).toUpperCase()}
                    </span>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-sub)" strokeWidth="2" strokeLinecap="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Value prop / city context */}
            <p style={{
              textAlign: 'center', fontSize: 11, color: 'var(--text-muted)',
              marginTop: 4, letterSpacing: '0.1px',
            }}>
              {lang === 'en'
                ? `Best prices + community finds · ${cityLabel}`
                : `מחירים טובים + דילים מהקהילה · ${cityLabel}`}
            </p>
          </div>
        </div>

        {/* ── Content ── */}
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '16px 0 0' }}>

          {/* ══ SALES TAB ══ */}
          {tab === 'sales' && (
            <div style={{ padding: '0 14px' }}>
              {/* Store filter */}
              <div style={{
                display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16, paddingBottom: 2,
              }}>
                {STORE_FILTERS.map(f => {
                  const active = storeFilter === f.id;
                  const s = f.id !== 'all' ? STORE_COLORS[f.id] : null;
                  return (
                    <button key={f.id} onClick={() => setStoreFilter(f.id)} style={{
                      flexShrink: 0, padding: '7px 16px', borderRadius: 20, cursor: 'pointer',
                      border: active ? `1.5px solid ${s?.color || ACCENT}` : '0.5px solid var(--border)',
                      background: active
                        ? (s ? (isDark ? s.dark : s.bg) : `rgba(212,98,42,0.1)`)
                        : 'var(--bg-card)',
                      color: active ? (s?.color || ACCENT) : 'var(--text-sub)',
                      fontSize: 13, fontWeight: active ? 700 : 400, whiteSpace: 'nowrap',
                    }}>
                      {f.id === 'all' ? (lang === 'en' ? '✦ All stores' : '✦ כל הרשתות') : (lang === 'en' ? f.nameEn : f.id)}
                    </button>
                  );
                })}
              </div>

              {/* Content */}
              {loadingPromos ? (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                  <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.4 }}>🏷️</div>
                  <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{t.loadingDeals}</p>
                </div>
              ) : filteredPromos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <p style={{ fontSize: 40, marginBottom: 12 }}>🔍</p>
                  <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                    {lang === 'en' ? 'No promotions found' : 'לא נמצאו מבצעים'}
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--text-sub)', lineHeight: 1.6 }}>
                    {lang === 'en' ? 'Try another store or check back later.' : 'נסה חנות אחרת או בדוק שוב מאוחר יותר.'}
                  </p>
                  <button onClick={() => setStoreFilter('all')} style={{
                    marginTop: 16, padding: '10px 20px', borderRadius: 14,
                    background: `rgba(212,98,42,0.1)`, border: `1px solid ${ACCENT}`,
                    color: ACCENT, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}>Show all stores</button>
                </div>
              ) : (
                <>
                  {heroPromo && (
                    <HeroPromoCard
                      promo={heroPromo} lang={lang} isDark={isDark}
                      onClick={() => setSelectedPromo(heroPromo)}
                      votes={promoVotes[heroPromo.barcode]}
                      onVote={handlePromoVote}
                    />
                  )}

                  {gridPromos.length > 0 && (
                    <>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-sub)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {lang === 'en' ? `Best store prices (${filteredPromos.length})` : `מחירי חנויות (${filteredPromos.length})`}
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                        {gridPromos.map(p => (
                          <PromoCard
                            key={p.barcode} promo={p} lang={lang} isDark={isDark}
                            onClick={() => setSelectedPromo(p)}
                            votes={promoVotes[p.barcode]}
                            onVote={handlePromoVote}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* ══ DEALS TAB ══ */}
          {tab === 'deals' && (
            <div style={{ padding: '0 14px' }}>

              {/* Sort row */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 6, flex: 1, overflowX: 'auto' }}>
                  {[
                    { id: 'hot', label: '🔥 Hot' },
                    { id: 'latest', label: '🕒 New' },
                    ...(userCoords ? [{ id: 'nearby', label: '📍 Nearby' }] : []),
                    { id: 'ending', label: '⏳ Ending soon' },
                    ...(user ? [{ id: 'mine', label: '👤 Mine' }] : []),
                  ].map(s => {
                    const isMyDeals = s.id === 'mine';
                    const active = isMyDeals ? myDealsOnly : sortDeals === s.id;
                    return (
                      <button key={s.id} onClick={() => {
                        if (isMyDeals) setMyDealsOnly(v => !v);
                        else setSortDeals(s.id);
                      }} style={{
                        flexShrink: 0, padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
                        border: active ? `1.5px solid ${ACCENT}` : '0.5px solid var(--border)',
                        background: active ? `rgba(212,98,42,0.1)` : 'var(--bg-card)',
                        color: active ? ACCENT : 'var(--text-sub)',
                        fontSize: 13, fontWeight: active ? 700 : 400, whiteSpace: 'nowrap',
                      }}>{s.label}</button>
                    );
                  })}
                </div>
                {/* Map button */}
                <button onClick={() => router.push('/map')} style={{
                  flexShrink: 0, padding: '6px 12px', borderRadius: 20, cursor: 'pointer',
                  border: '0.5px solid var(--border)', background: 'var(--bg-card)',
                  color: 'var(--text-sub)', fontSize: 13, fontWeight: 500,
                }}>🗺️</button>
              </div>

              {/* Category filter */}
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 14, paddingBottom: 2 }}>
                {CATEGORIES.map(cat => {
                  const active = categoryFilter === cat;
                  return (
                    <button key={cat} onClick={() => setCategoryFilter(cat)} style={{
                      flexShrink: 0, padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
                      border: active ? `1.5px solid ${ACCENT}` : '0.5px solid var(--border)',
                      background: active ? `rgba(212,98,42,0.1)` : 'var(--bg-card)',
                      color: active ? ACCENT : 'var(--text-sub)',
                      fontSize: 13, fontWeight: active ? 700 : 400, whiteSpace: 'nowrap',
                    }}>{CATEGORY_ICONS[cat]} {t.categories[cat] || cat}</button>
                  );
                })}
              </div>

              {/* City context */}
              {ville && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    📍 {lang === 'en' ? `Deals in ${traduireVille(ville, 'en')}` : `דילים ב${ville}`}
                  </span>
                  <button onClick={() => setShowCityModal(true)} style={{
                    background: 'none', border: 'none', color: ACCENT,
                    fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0,
                  }}>
                    {lang === 'en' ? '· Change' : '· שנה'}
                  </button>
                </div>
              )}

              {/* Post CTA */}
              <button onClick={() => setShowPostModal(true)} style={{
                width: '100%', padding: '14px 20px', borderRadius: 18, cursor: 'pointer',
                border: `1.5px dashed ${ACCENT}`,
                background: `rgba(212,98,42,0.06)`,
                color: ACCENT, fontSize: 15, fontWeight: 700, marginBottom: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                📸 {lang === 'en' ? 'Spotted a deal? Share it now' : 'ראית דיל? שתף אותו עכשיו'}
              </button>

              {/* Post success banner */}
              {postSuccess && (
                <div style={{
                  padding: '14px 20px', borderRadius: 16, marginBottom: 14,
                  background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ fontSize: 22 }}>🔥</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#10B981' }}>
                    {lang === 'en' ? 'Deal shared! Refreshing...' : 'הדיל פורסם! מרענן...'}
                  </span>
                </div>
              )}

              {/* Deals list */}
              {loadingDeals ? (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                  <div style={{ fontSize: 32, opacity: 0.4, marginBottom: 12 }}>🔥</div>
                  <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{t.loading}</p>
                </div>
              ) : displayedDeals.length === 0 ? (
                <div style={{
                  textAlign: 'center', padding: '50px 20px',
                  background: 'var(--bg-card)', borderRadius: 22,
                  boxShadow: 'var(--shadow-card)',
                }}>
                  <p style={{ fontSize: 44, marginBottom: 12 }}>🛍️</p>
                  <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                    {sortDeals === 'ending'
                      ? (lang === 'en' ? 'No deals ending soon' : 'אין דילים שמסתיימים בקרוב')
                      : myDealsOnly
                        ? (lang === 'en' ? "You haven't posted any deals yet" : 'עדיין לא פרסמת דילים')
                        : (lang === 'en' ? 'No deals yet in this category' : 'אין דילים עדיין בקטגוריה זו')}
                  </p>
                  <p style={{ fontSize: 14, color: 'var(--text-sub)', marginBottom: 20, lineHeight: 1.6 }}>
                    {sortDeals === 'ending'
                      ? (lang === 'en' ? 'Deals with an expiration date will appear here.' : 'דילים עם תאריך סיום יופיעו כאן.')
                      : (lang === 'en' ? 'Be the first to share a deal!' : 'היה הראשון לשתף דיל!')}
                  </p>
                  <button onClick={() => setShowPostModal(true)} style={{
                    padding: '12px 24px', borderRadius: 16, border: 'none',
                    background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`,
                    color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                    boxShadow: `0 4px 16px rgba(212,98,42,0.35)`,
                  }}>
                    📸 {lang === 'en' ? 'Share a deal' : 'שתף דיל'}
                  </button>
                </div>
              ) : (
                displayedDeals.map(deal => (
                  <DealCard
                    key={deal.id} deal={deal} lang={lang} isDark={isDark}
                    onVote={handleDealVote} userCoords={userCoords}
                    votedDeal={votedDeals[deal.id] || null}
                    user={user}
                  />
                ))
              )}

              {/* Footer: Sales promo link */}
              {!loadingDeals && displayedDeals.length > 0 && (
                <div style={{
                  textAlign: 'center', padding: '24px 0 8px',
                  borderTop: '0.5px solid var(--border)', marginTop: 8,
                }}>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>
                    {lang === 'en' ? 'Looking for supermarket prices?' : 'מחפש מחירי סופרמרקט?'}
                  </p>
                  <button onClick={() => setTab('sales')} style={{
                    padding: '10px 20px', borderRadius: 14,
                    background: `rgba(212,98,42,0.1)`, border: `1px solid ${ACCENT}`,
                    color: ACCENT, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}>
                    {lang === 'en' ? '🏷️ Browse store prices' : '🏷️ מחירי חנויות'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ══ SEARCH TAB ══ */}
          {tab === 'search' && (
            <SearchTab
              promos={promos} deals={deals} lang={lang} isDark={isDark}
              onPromoClick={setSelectedPromo}
              userCoords={userCoords}
              votedDeals={votedDeals}
              onDealVote={handleDealVote}
              user={user}
            />
          )}

          {/* ══ PROFILE TAB ══ */}
          {tab === 'profile' && (
            <ProfileTab user={user} lang={lang} onOpenAlerts={() => setShowAlertModal(true)} />
          )}
        </div>

        {/* ── Bottom Nav ── */}
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
          background: 'var(--nav-bg)',
          borderTop: '0.5px solid var(--border)',
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          padding: '8px 0 24px',
          boxShadow: 'var(--shadow-nav)',
        }}>
          <div style={{
            maxWidth: 600, margin: '0 auto',
            display: 'flex', justifyContent: 'space-around',
          }}>
            {NAV.map(item => {
              const active = tab === item.id;
              return (
                <button key={item.id} onClick={() => setTab(item.id)} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  background: 'none', border: 'none', cursor: 'pointer',
                  minWidth: 60, padding: '4px 0', position: 'relative',
                }}>
                  {item.icon(active)}
                  <span style={{
                    fontSize: 10, fontWeight: active ? 700 : 400,
                    color: active ? ACCENT : 'var(--text-sub)',
                  }}>{item.label}</span>
                  {active && (
                    <div style={{
                      position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)',
                      width: 20, height: 3, borderRadius: '0 0 4px 4px',
                      background: ACCENT,
                    }} />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Floating post button — visible on deals + sales tabs */}
        {(tab === 'deals' || tab === 'sales') && (
          <button
            onClick={() => setShowPostModal(true)}
            aria-label="Post a deal"
            style={{
              position: 'fixed', bottom: 84, right: 20, zIndex: 99,
              width: 52, height: 52, borderRadius: '50%', border: 'none',
              background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`,
              color: '#fff', fontSize: 24, cursor: 'pointer',
              boxShadow: `0 4px 20px rgba(212,98,42,0.5)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            +
          </button>
        )}

        {/* ── Modals ── */}
        {selectedPromo && (
          <PromoModal promo={selectedPromo} lang={lang} isDark={isDark} onClose={() => setSelectedPromo(null)} />
        )}
        {showCityModal && (
          <CityModal
            villes={villes} current={ville} lang={lang}
            onSelect={handleCitySelect}
            onClose={() => setShowCityModal(false)}
          />
        )}
        {showPostModal && (
          <PostDealModal
            user={user} lang={lang}
            onClose={() => setShowPostModal(false)}
            onSuccess={handlePostSuccess}
          />
        )}
        {showAlertModal && user && (
          <AlertModal user={user} lang={lang} onClose={() => setShowAlertModal(false)} />
        )}
        {showNotificationSheet && user && (
          <NotificationSheet
            user={user} lang={lang}
            notifications={notifications}
            onClose={() => setShowNotificationSheet(false)}
            onMarkAllRead={async () => {
              const { data } = await supabase.auth.getSession();
              if (!data.session) return;
              await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${data.session.access_token}` },
                body: JSON.stringify({ markAllRead: true }),
              }).catch(() => {});
              setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
              setUnreadCount(0);
            }}
            onOpenAlerts={() => setShowAlertModal(true)}
          />
        )}
      </div>
    </>
  );
}
