import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTheme } from 'next-themes';
import { translations, traduireVille } from '../lib/translations';
import { supabase } from '../lib/supabase';

const ACCENT = '#0284C7';
const ACCENT_DARK = '#0369A1';

const STORE_COLORS = {
  'שופרסל': { color: '#2563EB', bg: '#EFF6FF', bgDark: '#1E2D4A', nameEn: 'Shufersal' },
  'רמי לוי': { color: '#DC2626', bg: '#FEF2F2', bgDark: '#3D1A1A', nameEn: 'Rami Levy' },
  'ויקטורי': { color: '#7C3AED', bg: '#F5F3FF', bgDark: '#2D1F4A', nameEn: 'Victory' },
  'יוחננוף': { color: '#059669', bg: '#ECFDF5', bgDark: '#1A3D2E', nameEn: 'Yohananof' },
  'אושר עד': { color: '#D97706', bg: '#FFFBEB', bgDark: '#3D2E0A', nameEn: 'Osher Ad' },
  'כרפור': { color: '#0070CC', bg: '#EFF6FF', bgDark: '#162A3D', nameEn: 'Carrefour' },
};

const STORE_FILTERS = [
  { id: 'all' },
  { id: 'שופרסל', nameEn: 'Shufersal' },
  { id: 'רמי לוי', nameEn: 'Rami Levy' },
  { id: 'ויקטורי', nameEn: 'Victory' },
  { id: 'יוחננוף', nameEn: 'Yohananof' },
  { id: 'אושר עד', nameEn: 'Osher Ad' },
  { id: 'כרפור', nameEn: 'Carrefour' },
];

const CATEGORIES = ['all', 'Food', 'Tech', 'Fashion', 'Activities', 'Online'];

const CITY_COORDS = {
  'תל אביב': { lat: 32.0853, lon: 34.7818 },
  'ירושלים': { lat: 31.7683, lon: 35.2137 },
  'חיפה': { lat: 32.7940, lon: 34.9896 },
  'באר שבע': { lat: 31.2518, lon: 34.7913 },
  'אילת': { lat: 29.5577, lon: 34.9519 },
  'נתניה': { lat: 32.3226, lon: 34.8533 },
  'ראשון לציון': { lat: 31.9730, lon: 34.7925 },
  'פתח תקווה': { lat: 32.0878, lon: 34.8878 },
  'אשדוד': { lat: 31.7918, lon: 34.6495 },
  'אשקלון': { lat: 31.6688, lon: 34.5743 },
  'הרצליה': { lat: 32.1652, lon: 34.8440 },
  'כפר סבא': { lat: 32.1786, lon: 34.9078 },
  'רמת גן': { lat: 32.0821, lon: 34.8137 },
  'בני ברק': { lat: 32.0804, lon: 34.8338 },
  'חולון': { lat: 32.0114, lon: 34.7794 },
  'בת ים': { lat: 32.0204, lon: 34.7508 },
  'נהריה': { lat: 33.0073, lon: 35.0987 },
  'עכו': { lat: 32.9225, lon: 35.0779 },
  'טבריה': { lat: 32.7956, lon: 35.5310 },
  'צפת': { lat: 32.9646, lon: 35.4966 },
  'נצרת': { lat: 32.6996, lon: 35.3034 },
  'רחובות': { lat: 31.8928, lon: 34.8113 },
  'מודיעין': { lat: 31.8979, lon: 35.0100 },
  'לוד': { lat: 31.9519, lon: 34.8893 },
  'רמלה': { lat: 31.9283, lon: 34.8635 },
  'קריית גת': { lat: 31.6095, lon: 34.7748 },
  'דימונה': { lat: 31.0638, lon: 35.0278 },
  'אופקים': { lat: 31.3120, lon: 34.6221 },
  'עפולה': { lat: 32.6078, lon: 35.2897 },
  'כרמיאל': { lat: 32.9146, lon: 35.2962 },
  'ראש העין': { lat: 32.0969, lon: 34.9566 },
  'רעננה': { lat: 32.1836, lon: 34.8711 },
  'יהוד': { lat: 32.0326, lon: 34.8881 },
  'גבעתיים': { lat: 32.0704, lon: 34.8118 },
  'אור יהודה': { lat: 32.0267, lon: 34.8569 },
  'קריית אונו': { lat: 32.0639, lon: 34.8556 },
};

function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function timeAgo(date, langue) {
  const diff = Date.now() - new Date(date).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return langue === 'en' ? 'Just now' : 'זה עתה';
  if (h < 24) return langue === 'en' ? `${h}h ago` : `${h}ש' `;
  return langue === 'en' ? `${Math.floor(h / 24)}d ago` : `${Math.floor(h / 24)} ימים`;
}


function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div style={{ width: 32, height: 32 }} />;
  const isDark = resolvedTheme === 'dark';
  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--text-sub)', padding: 6,
        display: 'flex', alignItems: 'center', borderRadius: 8,
      }}
    >
      {isDark ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

function StoreBadge({ enseigne, langue, isDark }) {
  const s = STORE_COLORS[enseigne];
  if (!s) return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: 'var(--bg-card2)', color: 'var(--text-sub)' }}>
      {enseigne}
    </span>
  );
  return (
    <span style={{
      fontSize: 11, fontWeight: 600,
      padding: '3px 8px', borderRadius: 20,
      background: isDark ? s.bgDark : s.bg,
      color: s.color,
    }}>
      {langue === 'en' ? s.nameEn : enseigne}
    </span>
  );
}

function HeroPromoCard({ promo, langue, isDark, onClick, votes, onVote }) {
  const s = STORE_COLORS[promo.meilleurEnseigne] || { color: ACCENT, bg: '#FEF0EB', bgDark: '#2A1A12', nameEn: promo.meilleurEnseigne };
  const nom = (langue === 'en' && promo.nom_en) ? promo.nom_en : promo.nom;
  const myVote = votes?.myVote;

  return (
    <div
      style={{
        borderRadius: 22,
        overflow: 'hidden',
        marginBottom: 16,
        background: isDark
          ? `linear-gradient(135deg, ${s.bgDark} 0%, #17171D 100%)`
          : `linear-gradient(135deg, ${s.bg} 0%, #fff 100%)`,
        boxShadow: 'var(--shadow-float)',
        position: 'relative',
      }}
    >
      <div onClick={onClick} style={{ padding: '20px 20px 16px', cursor: 'pointer' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: ACCENT, color: '#fff',
          fontSize: 12, fontWeight: 800,
          padding: '4px 10px', borderRadius: 20,
          marginBottom: 14,
        }}>
          🔥 -{promo.reduction}% {langue === 'en' ? 'OFF' : 'הנחה'}
        </div>

        <p style={{
          fontSize: 16, fontWeight: 700,
          color: isDark ? '#F0EDE8' : '#1A1814',
          marginBottom: 12,
          lineHeight: 1.4,
          textAlign: langue === 'he' ? 'right' : 'left',
        }}>{nom}</p>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, justifyContent: langue === 'he' ? 'flex-end' : 'flex-start' }}>
          <span style={{ fontSize: 32, fontWeight: 900, color: ACCENT }}>₪{promo.prixMin}</span>
          <span style={{ fontSize: 16, color: 'var(--text-sub)', textDecoration: 'line-through' }}>₪{promo.prixMax}</span>
        </div>

        <div style={{ marginTop: 12 }}>
          <StoreBadge enseigne={promo.meilleurEnseigne} langue={langue} isDark={isDark} />
        </div>
      </div>

      {/* Vote buttons */}
      <div style={{
        display: 'flex', gap: 8, padding: '12px 20px 20px',
        borderTop: `0.5px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
      }}>
        <button onClick={() => onVote(promo.barcode, 'chaud')} style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '10px', borderRadius: 14, border: 'none',
          background: myVote === 'chaud' ? ACCENT : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
          color: myVote === 'chaud' ? '#fff' : (isDark ? '#F0EDE8' : '#1A1814'),
          fontSize: 13, fontWeight: 700, cursor: 'pointer',
          transition: 'all 0.15s',
        }}>🔥 {votes?.chaud || 0}</button>
        <button onClick={() => onVote(promo.barcode, 'froid')} style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '10px', borderRadius: 14, border: 'none',
          background: myVote === 'froid' ? '#4B9FE1' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
          color: myVote === 'froid' ? '#fff' : (isDark ? '#F0EDE8' : '#1A1814'),
          fontSize: 13, fontWeight: 700, cursor: 'pointer',
          transition: 'all 0.15s',
        }}>❄️ {votes?.froid || 0}</button>
      </div>
    </div>
  );
}

function PromoCard({ promo, langue, isDark, onClick, votes, onVote }) {
  const s = STORE_COLORS[promo.meilleurEnseigne] || { color: ACCENT, bg: '#FEF0EB', bgDark: '#2A1A12', nameEn: promo.meilleurEnseigne };
  const nom = (langue === 'en' && promo.nom_en) ? promo.nom_en : promo.nom;
  const initials = (nom || '').split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?';
  const myVote = votes?.myVote;

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div onClick={onClick} style={{ cursor: 'pointer' }}>
        <div style={{
          height: 90,
          background: isDark
            ? `linear-gradient(135deg, ${s.bgDark}, #1E1E26)`
            : `linear-gradient(135deg, ${s.bg}, #fff)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', top: 10,
            [langue === 'he' ? 'left' : 'right']: 10,
            background: ACCENT, color: '#fff',
            fontSize: 10, fontWeight: 800,
            padding: '3px 7px', borderRadius: 20,
          }}>-{promo.reduction}%</div>

          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: s.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>{initials}</span>
          </div>
        </div>

        <div style={{ padding: '10px 12px 8px' }}>
          <p style={{
            fontSize: 12, fontWeight: 600, color: 'var(--text)',
            marginBottom: 8, lineHeight: 1.4,
            textAlign: langue === 'he' ? 'right' : 'left',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}>{nom}</p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: ACCENT }}>₪{promo.prixMin}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'line-through' }}>₪{promo.prixMax}</span>
          </div>

          <StoreBadge enseigne={promo.meilleurEnseigne} langue={langue} isDark={isDark} />
        </div>
      </div>

      {/* Compact vote buttons */}
      <div style={{ display: 'flex', gap: 4, padding: '8px 10px 10px', borderTop: '0.5px solid var(--border)' }}>
        <button onClick={() => onVote(promo.barcode, 'chaud')} style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
          padding: '5px 4px', borderRadius: 10, border: 'none',
          background: myVote === 'chaud' ? ACCENT : 'var(--bg-card2)',
          color: myVote === 'chaud' ? '#fff' : 'var(--text)',
          fontSize: 11, fontWeight: 700, cursor: 'pointer',
        }}>🔥 {votes?.chaud || 0}</button>
        <button onClick={() => onVote(promo.barcode, 'froid')} style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
          padding: '5px 4px', borderRadius: 10, border: 'none',
          background: myVote === 'froid' ? '#4B9FE1' : 'var(--bg-card2)',
          color: myVote === 'froid' ? '#fff' : 'var(--text)',
          fontSize: 11, fontWeight: 700, cursor: 'pointer',
        }}>❄️ {votes?.froid || 0}</button>
      </div>
    </div>
  );
}

function PromoModal({ promo, langue, isDark, onClose }) {
  const s = STORE_COLORS[promo.meilleurEnseigne] || { color: ACCENT, bg: '#FEF0EB', bgDark: '#2A1A12', nameEn: promo.meilleurEnseigne };
  const nom = (langue === 'en' && promo.nom_en) ? promo.nom_en : promo.nom;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.6)', zIndex: 200,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)',
          borderRadius: '24px 24px 0 0',
          padding: '20px 20px 44px',
          width: '100%', maxWidth: 600,
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 20px' }} />
        <p style={{
          fontSize: 17, fontWeight: 700, color: 'var(--text)',
          textAlign: langue === 'he' ? 'right' : 'left',
          marginBottom: 20, lineHeight: 1.4,
        }}>{nom}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {promo.tousLesPrix.map(p => {
            const isBest = p.prix === promo.prixMin;
            const ps = STORE_COLORS[p.enseigne] || { color: ACCENT, bg: '#FEF0EB', bgDark: '#2A1A12', nameEn: p.enseigne };
            return (
              <div key={p.enseigne} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 16px', borderRadius: 16,
                background: isBest ? (isDark ? 'rgba(2,132,199,0.12)' : '#FEF0EB') : 'var(--bg-card2)',
                border: isBest ? `1.5px solid ${ACCENT}` : '0.5px solid var(--border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isBest ? (
                    <span style={{ fontSize: 11, fontWeight: 700, color: ACCENT }}>✓ {langue === 'en' ? 'Best' : 'הכי זול'}</span>
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--text-sub)' }}>+{(p.prix - promo.prixMin).toFixed(2)}₪</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: isBest ? ACCENT : 'var(--text-sub)' }}>₪{p.prix}</span>
                  <StoreBadge enseigne={p.enseigne} langue={langue} isDark={isDark} />
                </div>
              </div>
            );
          })}
        </div>

        <div style={{
          marginTop: 16, padding: '14px 16px',
          borderRadius: 16, background: 'var(--bg-card2)',
          textAlign: 'center',
        }}>
          <span style={{ fontSize: 14, color: 'var(--text-sub)' }}>
            {langue === 'en' ? 'Save up to' : 'חיסכון עד'}{' '}
            <span style={{ fontWeight: 800, color: ACCENT }}>
              ₪{(promo.prixMax - promo.prixMin).toFixed(2)}
            </span>
          </span>
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%', marginTop: 12, padding: 16,
            borderRadius: 16, border: 'none',
            background: 'var(--bg-card2)', color: 'var(--text-sub)',
            fontSize: 15, fontWeight: 500, cursor: 'pointer',
          }}
        >
          {langue === 'en' ? 'Close' : 'סגור'}
        </button>
      </div>
    </div>
  );
}

function DealCard({ deal, langue, onVote, userCoords, votedDeal, user }) {
  const router = useRouter();
  const reduction = deal.prix_original && deal.prix_original > deal.prix
    ? Math.round((deal.prix_original - deal.prix) / deal.prix_original * 100)
    : null;

  const dealCoords = deal.ville ? CITY_COORDS[deal.ville] : null;
  const distance = (userCoords && dealCoords)
    ? distanceKm(userCoords.lat, userCoords.lon, dealCoords.lat, dealCoords.lon)
    : null;

  const isOwner = user && user.id === deal.auteur_id;

  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: 20,
      overflow: 'hidden',
      boxShadow: 'var(--shadow-card)',
      marginBottom: 12,
    }}>
      <div
        onClick={() => {
          try { sessionStorage.setItem('dilzReturnTab', 'deals'); sessionStorage.setItem('dilzScrollY', String(window.scrollY)); } catch {}
          router.push(`/deal/${deal.id}`);
        }}
        style={{ cursor: 'pointer', position: 'relative', height: deal.image_url ? 200 : 72, background: 'var(--bg-card2)' }}
      >
        {deal.image_url ? (
          <img
            src={deal.image_url}
            alt={deal.titre}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 28 }}>🛍️</span>
          </div>
        )}

        {deal.categorie && (
          <span style={{
            position: 'absolute', top: 10, left: 10,
            background: 'rgba(0,0,0,0.65)', color: '#fff',
            fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20,
          }}>{deal.categorie}</span>
        )}
        {reduction !== null && (
          <span style={{
            position: 'absolute', top: 10, right: 10,
            background: ACCENT, color: '#fff',
            fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 20,
          }}>-{reduction}% OFF</span>
        )}
        {deal.image_url && deal.prix && (
          <div style={{
            position: 'absolute', bottom: 10, left: 10,
            background: 'rgba(0,0,0,0.7)', color: '#fff',
            padding: '5px 12px', borderRadius: 12,
            display: 'flex', alignItems: 'baseline', gap: 6,
          }}>
            <span style={{ fontSize: 18, fontWeight: 800 }}>₪{deal.prix}</span>
            {deal.prix_original && (
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', textDecoration: 'line-through' }}>₪{deal.prix_original}</span>
            )}
          </div>
        )}
      </div>

      <div style={{ padding: '12px 16px 14px' }}>
        {!deal.image_url && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6, justifyContent: langue === 'he' ? 'flex-end' : 'flex-start' }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: ACCENT }}>₪{deal.prix}</span>
            {deal.prix_original && (
              <span style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'line-through' }}>₪{deal.prix_original}</span>
            )}
          </div>
        )}

        <p
          onClick={() => {
            try { sessionStorage.setItem('dilzReturnTab', 'deals'); sessionStorage.setItem('dilzScrollY', String(window.scrollY)); } catch {}
            router.push(`/deal/${deal.id}`);
          }}
          style={{
            fontSize: 15, fontWeight: 700, color: 'var(--text)',
            marginBottom: 6, cursor: 'pointer',
            textAlign: langue === 'he' ? 'right' : 'left',
          }}
        >{deal.titre}</p>

        <p style={{
          fontSize: 12, color: 'var(--text-sub)',
          marginBottom: 12,
          textAlign: langue === 'he' ? 'right' : 'left',
          display: 'flex', alignItems: 'center', gap: 4,
          justifyContent: langue === 'he' ? 'flex-end' : 'flex-start',
        }}>
          <span>📍</span>
          <span>
            {[deal.magasin, deal.ville].filter(Boolean).join(' · ')}
            {distance !== null && (
              <span style={{
                marginLeft: 4,
                background: distance <= 10 ? 'rgba(5,150,105,0.12)' : distance <= 50 ? 'rgba(2,132,199,0.1)' : 'var(--bg-card2)',
                color: distance <= 10 ? '#059669' : distance <= 50 ? ACCENT : 'var(--text-muted)',
                fontSize: 10, fontWeight: 700,
                padding: '1px 6px', borderRadius: 10,
              }}>~{distance} km</span>
            )}
            {' · '}{timeAgo(deal.created_at, langue)}
            {deal.auteur_nom ? ` · ${deal.auteur_nom}` : ''}
          </span>
        </p>

        <div style={{ display: 'flex', gap: 8, borderTop: '0.5px solid var(--border)', paddingTop: 10, alignItems: 'center' }}>
          <button onClick={() => !votedDeal && onVote(deal.id, 'chaud')} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '7px 14px', borderRadius: 20,
            background: votedDeal === 'chaud' ? ACCENT : 'var(--bg-card2)',
            border: votedDeal === 'chaud' ? `0.5px solid ${ACCENT}` : '0.5px solid var(--border)',
            color: votedDeal === 'chaud' ? '#fff' : 'var(--text)',
            cursor: votedDeal ? 'default' : 'pointer',
            opacity: votedDeal && votedDeal !== 'chaud' ? 0.45 : 1,
            fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
          }}>🔥 {deal.votes_chaud}</button>
          <button onClick={() => !votedDeal && onVote(deal.id, 'froid')} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '7px 14px', borderRadius: 20,
            background: votedDeal === 'froid' ? '#4B9FE1' : 'var(--bg-card2)',
            border: votedDeal === 'froid' ? '0.5px solid #4B9FE1' : '0.5px solid var(--border)',
            color: votedDeal === 'froid' ? '#fff' : 'var(--text)',
            cursor: votedDeal ? 'default' : 'pointer',
            opacity: votedDeal && votedDeal !== 'froid' ? 0.45 : 1,
            fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
          }}>❄️ {deal.votes_froid}</button>
          <Link href={`/deal/${deal.id}`} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '7px 14px', borderRadius: 20,
            background: 'var(--bg-card2)', border: '0.5px solid var(--border)',
            color: 'var(--text)', textDecoration: 'none', fontSize: 13, fontWeight: 600,
            marginLeft: 'auto',
          }}>
            💬 {deal.commentaires?.[0]?.count || 0}
          </Link>
          {isOwner && (
            <Link href={`/deal/${deal.id}`} style={{
              display: 'flex', alignItems: 'center',
              padding: '7px 10px', borderRadius: 20,
              background: 'rgba(2,132,199,0.1)', border: `0.5px solid ${ACCENT}`,
              color: ACCENT, textDecoration: 'none', fontSize: 13, fontWeight: 600,
            }}>✏️</Link>
          )}
        </div>
      </div>
    </div>
  );
}

function CityModal({ villes, villeActuelle, langue, onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const filtered = villes.filter(v =>
    v.toLowerCase().includes(search.toLowerCase()) ||
    traduireVille(v, 'en').toLowerCase().includes(search.toLowerCase())
  );

  const handleGps = () => {
    setLoading(true);
    if (!navigator.geolocation) { setLoading(false); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=he`
          );
          const d = await r.json();
          const v = d.address?.city || d.address?.town || d.address?.village || null;
          if (v) { onSelect(v, { lat: latitude, lon: longitude }); onClose(); }
        } catch {}
        setLoading(false);
      },
      () => setLoading(false),
      { timeout: 5000 }
    );
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.6)', zIndex: 300,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)',
          borderRadius: '24px 24px 0 0',
          padding: '20px 16px 40px',
          width: '100%', maxWidth: 600,
          maxHeight: '80vh',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 16px' }} />
        <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', textAlign: 'center', marginBottom: 14 }}>
          {langue === 'en' ? 'Select city' : 'בחר עיר'}
        </p>

        <input
          type="text"
          placeholder={langue === 'en' ? 'Search city...' : 'חפש עיר...'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
          style={{
            width: '100%', padding: '11px 14px',
            borderRadius: 14, border: '0.5px solid var(--border)',
            background: 'var(--bg-input)', color: 'var(--text)',
            fontSize: 15, outline: 'none', marginBottom: 12,
            textAlign: langue === 'he' ? 'right' : 'left',
          }}
        />

        <div style={{ overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button onClick={() => { onSelect(null, null); onClose(); }} style={{
              padding: '11px 14px', borderRadius: 14,
              border: !villeActuelle ? `2px solid ${ACCENT}` : '0.5px solid var(--border)',
              background: !villeActuelle ? 'rgba(2,132,199,0.08)' : 'var(--bg-card2)',
              color: !villeActuelle ? ACCENT : 'var(--text)',
              fontSize: 14, fontWeight: !villeActuelle ? 700 : 400, cursor: 'pointer',
            }}>
              {langue === 'en' ? '🇮🇱 All Israel' : '🇮🇱 כל הארץ'}
            </button>

            <button onClick={handleGps} disabled={loading} style={{
              padding: '11px 14px', borderRadius: 14,
              border: '0.5px solid var(--border)',
              background: 'var(--bg-card2)',
              color: ACCENT,
              fontSize: 14, fontWeight: 500, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
              {loading ? '...' : (langue === 'en' ? 'My location' : 'מיקום נוכחי')}
            </button>

            {filtered.map(v => (
              <button key={v} onClick={() => { onSelect(v, CITY_COORDS[v] || null); onClose(); }} style={{
                padding: '11px 14px', borderRadius: 14,
                border: villeActuelle === v ? `2px solid ${ACCENT}` : '0.5px solid var(--border)',
                background: villeActuelle === v ? 'rgba(2,132,199,0.08)' : 'var(--bg-card2)',
                color: villeActuelle === v ? ACCENT : 'var(--text)',
                fontSize: 14, fontWeight: villeActuelle === v ? 700 : 400, cursor: 'pointer',
                textAlign: langue === 'he' ? 'right' : 'left',
              }}>
                {traduireVille(v, langue)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [langue, setLangue] = useState('en');

  const [tab, setTab] = useState('sales');
  const [promos, setPromos] = useState([]);
  const [loadingPromos, setLoadingPromos] = useState(true);
  const [storeFilter, setStoreFilter] = useState('all');
  const [selectedPromo, setSelectedPromo] = useState(null);

  const [deals, setDeals] = useState([]);
  const [loadingDeals, setLoadingDeals] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortDeals, setSortDeals] = useState('hot');
  const [myDealsOnly, setMyDealsOnly] = useState(false);

  const [ville, setVille] = useState(null);
  const [userCoords, setUserCoords] = useState(null);
  const [villes, setVilles] = useState([]);
  const [showCityModal, setShowCityModal] = useState(false);
  const [promoVotes, setPromoVotes] = useState({});
  const [votedDeals, setVotedDeals] = useState({});

  const [user, setUser] = useState(null);
  const [postForm, setPostForm] = useState({
    titre: '', description: '', prix: '', prix_original: '',
    magasin: '', ville: '', auteur_nom: '', categorie: 'Food',
    url_source: '', date_debut: '', date_fin: '',
  });
  const [postImageFile, setPostImageFile] = useState(null);
  const [postImagePreview, setPostImagePreview] = useState(null);
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [postError, setPostError] = useState('');
  const [postSuccess, setPostSuccess] = useState(false);

  const t = translations[langue];
  const dir = langue === 'he' ? 'rtl' : 'ltr';
  const isDark = resolvedTheme === 'dark';

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem('dilzPromoVotes');
      if (saved) setPromoVotes(JSON.parse(saved));
      const savedDealVotes = localStorage.getItem('dilzDealVotes');
      if (savedDealVotes) setVotedDeals(JSON.parse(savedDealVotes));
      // Restore tab + scroll when coming back from a deal page
      const returnTab = sessionStorage.getItem('dilzReturnTab');
      if (returnTab) {
        setTab(returnTab);
        sessionStorage.removeItem('dilzReturnTab');
        const savedY = sessionStorage.getItem('dilzScrollY');
        if (savedY) {
          sessionStorage.removeItem('dilzScrollY');
          setTimeout(() => window.scrollTo({ top: parseInt(savedY), behavior: 'instant' }), 300);
        }
      }
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
      if (u) {
        setPostForm(prev => ({
          ...prev,
          auteur_nom: u.user_metadata?.display_name || u.email?.split('@')[0] || '',
        }));
      }
    });
  }, []);

  useEffect(() => {
    if (tab !== 'deals') return;
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

  const handleCitySelect = (villeNom, coords) => {
    setVille(villeNom);
    const c = coords || (villeNom ? CITY_COORDS[villeNom] || null : null);
    setUserCoords(c);
    if (c) setSortDeals('nearby');
    else setSortDeals('hot');
  };

  const handleVote = async (id, type) => {
    if (votedDeals[id]) return;
    setVotedDeals(prev => {
      const next = { ...prev, [id]: type };
      try { localStorage.setItem('dilzDealVotes', JSON.stringify(next)); } catch {}
      return next;
    });
    setDeals(prev => prev.map(d => {
      if (d.id !== id) return d;
      return { ...d, [`votes_${type}`]: (d[`votes_${type}`] || 0) + 1 };
    }));
    await fetch('/api/bons-plans', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, vote: type }),
    });
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

  const handlePostImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPostImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPostImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handlePostDeal = async () => {
    if (!postForm.titre || !postForm.prix || !postForm.magasin) {
      setPostError('Title, price and store are required');
      return;
    }
    setPostSubmitting(true);
    setPostError('');
    try {
      let image_url = null;
      if (postImageFile) {
        const reader = new FileReader();
        const base64 = await new Promise((resolve) => {
          reader.onload = (e) => resolve(e.target.result.split(',')[1]);
          reader.readAsDataURL(postImageFile);
        });
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64, filename: postImageFile.name, mimeType: postImageFile.type }),
        });
        const uploadData = await uploadRes.json();
        if (uploadData.url) {
          image_url = uploadData.url;
        } else {
          setPostError(uploadData.erreur ? `Photo upload failed: ${uploadData.erreur}` : 'Photo upload failed. Deal will be posted without image.');
        }
      }

      const res = await fetch('/api/bons-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...postForm,
          prix: parseFloat(postForm.prix),
          prix_original: postForm.prix_original ? parseFloat(postForm.prix_original) : null,
          image_url,
          auteur_id: user?.id || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.erreur) {
        const msg = data.erreur || 'Failed to post deal';
        const detail = [data.code, data.hint].filter(Boolean).join(' — ');
        setPostError(detail ? `${msg} [${detail}]` : msg);
        setPostSubmitting(false);
        return;
      }
      if (data.bon_plan) {
        setPostSuccess(true);
        setPostForm(prev => ({ ...prev, titre: '', description: '', prix: '', prix_original: '', magasin: '', ville: '', url_source: '', date_debut: '', date_fin: '', categorie: 'Food' }));
        setPostImageFile(null);
        setPostImagePreview(null);
        setTimeout(() => { setPostSuccess(false); setTab('deals'); }, 1600);
      }
    } catch (e) {
      setPostError(e?.message ? `Erreur: ${e.message}` : 'Network error — check your connection and try again.');
    }
    setPostSubmitting(false);
  };

  const displayedDeals = (sortDeals === 'nearby' && userCoords)
    ? [...deals].sort((a, b) => {
        const ca = a.ville ? CITY_COORDS[a.ville] : null;
        const cb = b.ville ? CITY_COORDS[b.ville] : null;
        const da = ca ? distanceKm(userCoords.lat, userCoords.lon, ca.lat, ca.lon) : Infinity;
        const db = cb ? distanceKm(userCoords.lat, userCoords.lon, cb.lat, cb.lon) : Infinity;
        return da - db;
      })
    : deals;

  const filteredPromos = storeFilter === 'all'
    ? promos
    : promos.filter(p => p.meilleurEnseigne === storeFilter);

  const heroPromo = filteredPromos[0] || null;
  const gridPromos = filteredPromos.slice(1);

  if (!mounted) return null;

  const navItems = [
    {
      id: 'sales', label: langue === 'en' ? 'Sales' : 'מבצעים',
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? ACCENT : 'var(--text-sub)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      id: 'deals', label: langue === 'en' ? 'Deals' : 'דילים',
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? ACCENT : 'none'} stroke={active ? ACCENT : 'var(--text-sub)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      ),
    },
    {
      id: 'post', label: langue === 'en' ? 'Post' : 'פרסם',
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? ACCENT : 'var(--text-sub)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      ),
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 80 }} dir={dir}>

      {/* Header */}
      <div style={{
        background: 'var(--nav-bg)',
        borderBottom: '0.5px solid var(--border)',
        padding: '12px 16px 14px',
        position: 'sticky', top: 0, zIndex: 100,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ThemeToggle />
              <button
                onClick={() => setLangue(langue === 'he' ? 'en' : 'he')}
                style={{
                  background: 'var(--bg-card2)', border: 'none',
                  borderRadius: 10, padding: '5px 10px',
                  cursor: 'pointer', fontSize: 12, color: 'var(--text-sub)', fontWeight: 700,
                }}
              >
                {langue === 'he' ? 'EN' : 'עב'}
              </button>
              <button
                onClick={() => setShowCityModal(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: ville ? 'rgba(2,132,199,0.1)' : 'var(--bg-card2)',
                  border: ville ? `1px solid ${ACCENT}` : '0.5px solid var(--border)',
                  borderRadius: 20, padding: '5px 12px',
                  cursor: 'pointer', fontSize: 12,
                  color: ville ? ACCENT : 'var(--text-sub)', fontWeight: 500,
                }}
              >
                <span style={{ fontSize: 14 }}>📍</span>
                {ville ? traduireVille(ville, langue) : (langue === 'en' ? 'All Israel' : 'כל הארץ')}
              </button>
            </div>
            <span style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', letterSpacing: -1 }}>
              dil<span style={{ color: ACCENT }}>z</span>
            </span>
            <Link href="/profil" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 34, height: 34, borderRadius: '50%',
              background: 'var(--bg-card2)', textDecoration: 'none',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-sub)" strokeWidth="2" strokeLinecap="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '16px 14px 0' }}>

        {/* ── SALES TAB ── */}
        {tab === 'sales' && (
          <div>
            {/* Store filter chips */}
            <div style={{
              display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16,
              paddingBottom: 4,
              scrollbarWidth: 'none', msOverflowStyle: 'none',
            }}>
              {STORE_FILTERS.map(f => {
                const active = storeFilter === f.id;
                const s = f.id !== 'all' ? STORE_COLORS[f.id] : null;
                return (
                  <button
                    key={f.id}
                    onClick={() => setStoreFilter(f.id)}
                    style={{
                      flexShrink: 0,
                      padding: '7px 16px', borderRadius: 20,
                      border: active ? `1.5px solid ${s ? s.color : ACCENT}` : '0.5px solid var(--border)',
                      background: active ? (s ? (isDark ? s.bgDark : s.bg) : 'rgba(2,132,199,0.1)') : 'var(--bg-card)',
                      color: active ? (s ? s.color : ACCENT) : 'var(--text-sub)',
                      fontSize: 13, fontWeight: active ? 700 : 400, cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {f.id === 'all' ? t.filters.all : (langue === 'en' ? f.nameEn : f.id)}
                  </button>
                );
              })}
            </div>

            {loadingPromos ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                {t.loadingDeals}
              </div>
            ) : filteredPromos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                {langue === 'en' ? 'No promotions found' : 'לא נמצאו מבצעים'}
              </div>
            ) : (
              <>
                {heroPromo && (
                  <HeroPromoCard
                    promo={heroPromo}
                    langue={langue}
                    isDark={isDark}
                    onClick={() => setSelectedPromo(heroPromo)}
                    votes={promoVotes[heroPromo.barcode]}
                    onVote={handlePromoVote}
                  />
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {gridPromos.map(p => (
                    <PromoCard
                      key={p.barcode}
                      promo={p}
                      langue={langue}
                      isDark={isDark}
                      onClick={() => setSelectedPromo(p)}
                      votes={promoVotes[p.barcode]}
                      onVote={handlePromoVote}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── DEALS TAB ── */}
        {tab === 'deals' && (
          <div>
            {/* Sort bar + map button */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 8, flex: 1, overflowX: 'auto', scrollbarWidth: 'none' }}>
                {[
                  { id: 'hot', label: '🔥 Hot' },
                  { id: 'latest', label: '🕒 Latest' },
                  ...(userCoords ? [{ id: 'nearby', label: '📍 Nearby' }] : []),
                ].map(s => (
                  <button key={s.id} onClick={() => setSortDeals(s.id)} style={{
                    flexShrink: 0,
                    padding: '6px 14px', borderRadius: 20,
                    border: sortDeals === s.id ? `1.5px solid ${ACCENT}` : '0.5px solid var(--border)',
                    background: sortDeals === s.id ? 'rgba(2,132,199,0.1)' : 'var(--bg-card)',
                    color: sortDeals === s.id ? ACCENT : 'var(--text-sub)',
                    fontSize: 13, fontWeight: sortDeals === s.id ? 700 : 400, cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}>{s.label}</button>
                ))}
                {user && (
                  <button onClick={() => setMyDealsOnly(v => !v)} style={{
                    flexShrink: 0,
                    padding: '6px 14px', borderRadius: 20,
                    border: myDealsOnly ? `1.5px solid ${ACCENT}` : '0.5px solid var(--border)',
                    background: myDealsOnly ? 'rgba(2,132,199,0.1)' : 'var(--bg-card)',
                    color: myDealsOnly ? ACCENT : 'var(--text-sub)',
                    fontSize: 13, fontWeight: myDealsOnly ? 700 : 400, cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}>👤 My Deals</button>
                )}
              </div>
              <button
                onClick={() => router.push('/map')}
                style={{
                  flexShrink: 0,
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 14px', borderRadius: 20,
                  border: '0.5px solid var(--border)', background: 'var(--bg-card)',
                  color: 'var(--text-sub)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                }}
              >
                🗺️ Map
              </button>
            </div>

            {/* Category filter */}
            <div style={{
              display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 14,
              paddingBottom: 4,
              scrollbarWidth: 'none', msOverflowStyle: 'none',
            }}>
              {CATEGORIES.map(cat => {
                const active = categoryFilter === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    style={{
                      flexShrink: 0,
                      padding: '7px 16px', borderRadius: 20,
                      border: active ? `1.5px solid ${ACCENT}` : '0.5px solid var(--border)',
                      background: active ? 'rgba(2,132,199,0.1)' : 'var(--bg-card)',
                      color: active ? ACCENT : 'var(--text-sub)',
                      fontSize: 13, fontWeight: active ? 700 : 400, cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {t.categories[cat] || cat}
                  </button>
                );
              })}
            </div>

            {loadingDeals ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>{t.loading}</div>
            ) : deals.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                {langue === 'en' ? 'No deals yet — be the first!' : 'אין דילים עדיין — היה הראשון!'}
              </div>
            ) : (
              displayedDeals.map(deal => (
                <DealCard key={deal.id} deal={deal} langue={langue} onVote={handleVote} userCoords={userCoords} votedDeal={votedDeals[deal.id] || null} user={user} />
              ))
            )}
          </div>
        )}

        {/* ── POST TAB ── */}
        {tab === 'post' && (
          <div style={{ paddingBottom: 20 }}>
            {!user ? (
              <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                <div style={{ fontSize: 52, marginBottom: 16 }}>📸</div>
                <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>
                  {langue === 'en' ? 'Share a deal' : 'שתף דיל'}
                </p>
                <p style={{ fontSize: 14, color: 'var(--text-sub)', marginBottom: 28, lineHeight: 1.6 }}>
                  {langue === 'en' ? 'Sign in to share deals with the community' : 'התחבר כדי לשתף דילים עם הקהילה'}
                </p>
                <Link href="/auth" style={{
                  display: 'inline-block', padding: '14px 28px',
                  borderRadius: 18, background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`,
                  color: '#fff', fontSize: 15, fontWeight: 700, textDecoration: 'none',
                  boxShadow: '0 4px 18px rgba(2,132,199,0.4)',
                }}>
                  {langue === 'en' ? 'Sign in' : 'התחבר'}
                </Link>
              </div>
            ) : postSuccess ? (
              <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                <div style={{ fontSize: 52, marginBottom: 16 }}>🔥</div>
                <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>
                  {langue === 'en' ? 'Deal shared!' : 'הדיל פורסם!'}
                </p>
                <p style={{ fontSize: 14, color: 'var(--text-sub)' }}>
                  {langue === 'en' ? 'Taking you to deals...' : 'מעביר אותך לדילים...'}
                </p>
              </div>
            ) : (
              <>
                <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 20 }}>
                  🔥 {langue === 'en' ? 'Share a deal' : 'שתף דיל'}
                </p>

                {/* Image upload */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ cursor: 'pointer' }}>
                    <div style={{
                      height: postImagePreview ? 180 : 90,
                      borderRadius: 16,
                      border: `2px dashed ${postImagePreview ? ACCENT : 'var(--border)'}`,
                      background: postImagePreview ? 'transparent' : 'var(--bg-card)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                    }}>
                      {postImagePreview ? (
                        <img src={postImagePreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                          <div style={{ fontSize: 24, marginBottom: 4 }}>📸</div>
                          <div style={{ fontSize: 13 }}>{langue === 'en' ? 'Add photo' : 'הוסף תמונה'}</div>
                        </div>
                      )}
                    </div>
                    <input type="file" accept="image/*" capture="environment" onChange={handlePostImage} style={{ display: 'none' }} />
                  </label>
                </div>

                {[
                  ['Title *', 'titre', langue === 'en' ? 'e.g. Pizza 3+1 at Dominos' : 'לדוגמה: פיצה 3+1 בדומינוס'],
                  ['Store / Place *', 'magasin', langue === 'en' ? 'e.g. Dominos, KSP' : 'לדוגמה: דומינוס, KSP'],
                ].map(([label, key, placeholder]) => (
                  <div key={key} style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 5 }}>{label}</label>
                    <input type="text" placeholder={placeholder} value={postForm[key]}
                      onChange={e => setPostForm({ ...postForm, [key]: e.target.value })}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 14, border: '0.5px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text)', fontSize: 14, outline: 'none' }}
                    />
                  </div>
                ))}

                {/* City dropdown */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 5 }}>
                    {langue === 'en' ? 'City' : 'עיר'}
                  </label>
                  <select
                    value={postForm.ville}
                    onChange={e => setPostForm({ ...postForm, ville: e.target.value })}
                    style={{
                      width: '100%', padding: '12px 14px', borderRadius: 14,
                      border: '0.5px solid var(--border)', background: 'var(--bg-input)',
                      color: postForm.ville ? 'var(--text)' : 'var(--text-muted)',
                      fontSize: 14, outline: 'none', appearance: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">{langue === 'en' ? 'Select a city…' : 'בחר עיר…'}</option>
                    {Object.keys(CITY_COORDS).map(v => (
                      <option key={v} value={v}>{traduireVille(v, langue)}</option>
                    ))}
                    <option value="אונליין">{langue === 'en' ? '🌐 Online deal' : '🌐 דיל אונליין'}</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  {[['Deal price *', 'prix', '₪39'], ['Original price', 'prix_original', '₪79']].map(([label, key, ph]) => (
                    <div key={key}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 5 }}>{label}</label>
                      <input type="number" placeholder={ph} value={postForm[key]}
                        onChange={e => setPostForm({ ...postForm, [key]: e.target.value })}
                        style={{ width: '100%', padding: '12px 14px', borderRadius: 14, border: '0.5px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text)', fontSize: 14, outline: 'none' }}
                      />
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 5 }}>
                    {langue === 'en' ? 'Category' : 'קטגוריה'}
                  </label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['Food', 'Tech', 'Fashion', 'Activities', 'Online'].map(cat => (
                      <button key={cat} onClick={() => setPostForm({ ...postForm, categorie: cat })} style={{
                        padding: '6px 12px', borderRadius: 20,
                        border: postForm.categorie === cat ? `1.5px solid ${ACCENT}` : '0.5px solid var(--border)',
                        background: postForm.categorie === cat ? 'rgba(2,132,199,0.1)' : 'var(--bg-input)',
                        color: postForm.categorie === cat ? ACCENT : 'var(--text-sub)',
                        fontSize: 13, fontWeight: postForm.categorie === cat ? 700 : 400, cursor: 'pointer',
                      }}>{cat}</button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 5 }}>
                    {langue === 'en' ? 'Link (optional)' : 'קישור (אופציונלי)'}
                  </label>
                  <input type="url" placeholder="https://..." value={postForm.url_source}
                    onChange={e => setPostForm({ ...postForm, url_source: e.target.value })}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 14, border: '0.5px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text)', fontSize: 14, outline: 'none' }}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 5 }}>
                    {langue === 'en' ? 'Description (optional)' : 'תיאור (אופציונלי)'}
                  </label>
                  <textarea placeholder={langue === 'en' ? 'More details...' : 'פרטים נוספים...'} value={postForm.description}
                    onChange={e => setPostForm({ ...postForm, description: e.target.value })}
                    rows={3}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 14, border: '0.5px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text)', fontSize: 14, outline: 'none', resize: 'vertical' }}
                  />
                </div>

                {postError && <p style={{ color: '#DC2626', fontSize: 13, marginBottom: 12 }}>{postError}</p>}

                <button onClick={handlePostDeal} disabled={postSubmitting} style={{
                  width: '100%', padding: 16, borderRadius: 16, border: 'none',
                  background: postSubmitting ? 'var(--bg-card2)' : `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`,
                  color: postSubmitting ? 'var(--text-muted)' : '#fff',
                  fontSize: 16, fontWeight: 700, cursor: postSubmitting ? 'default' : 'pointer',
                  boxShadow: postSubmitting ? 'none' : '0 4px 18px rgba(2,132,199,0.4)',
                }}>
                  {postSubmitting ? (langue === 'en' ? 'Sharing...' : 'מפרסם...') : (langue === 'en' ? 'Share deal 🔥' : 'פרסם דיל 🔥')}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'var(--nav-bg)',
        borderTop: '0.5px solid var(--border)',
        display: 'flex', justifyContent: 'space-around',
        padding: '10px 0 24px',
        zIndex: 50,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}>
        {navItems.map(item => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                background: 'none', border: 'none', cursor: 'pointer',
                position: 'relative', minWidth: 64, padding: '4px 0',
              }}
            >
              {item.icon(active)}
              <span style={{
                fontSize: 10, fontWeight: active ? 700 : 400,
                color: active ? ACCENT : 'var(--text-sub)',
              }}>{item.label}</span>
              {active && (
                <div style={{
                  width: 4, height: 4, borderRadius: '50%',
                  background: ACCENT, position: 'absolute', bottom: -2,
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Promo modal */}
      {selectedPromo && (
        <PromoModal
          promo={selectedPromo}
          langue={langue}
          isDark={isDark}
          onClose={() => setSelectedPromo(null)}
        />
      )}

      {/* City modal */}
      {showCityModal && (
        <CityModal
          villes={villes}
          villeActuelle={ville}
          langue={langue}
          onSelect={handleCitySelect}
          onClose={() => setShowCityModal(false)}
        />
      )}
    </div>
  );
}
