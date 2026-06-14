import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTheme } from 'next-themes';
import { translations, traduireVille } from '../lib/translations';

const ACCENT = '#D4622A';
const ACCENT_DARK = '#B84E20';

const STORE_COLORS = {
  'שופרסל': { color: '#2563EB', bg: '#EFF6FF', bgDark: '#1E2D4A', nameEn: 'Shufersal' },
  'רמי לוי': { color: '#DC2626', bg: '#FEF2F2', bgDark: '#3D1A1A', nameEn: 'Rami Levy' },
  'ויקטורי': { color: '#7C3AED', bg: '#F5F3FF', bgDark: '#2D1F4A', nameEn: 'Victory' },
  'יוחננוף': { color: '#059669', bg: '#ECFDF5', bgDark: '#1A3D2E', nameEn: 'Yohananof' },
  'אושר עד': { color: '#D97706', bg: '#FFFBEB', bgDark: '#3D2E0A', nameEn: 'Osher Ad' },
};

const STORE_FILTERS = [
  { id: 'all' },
  { id: 'שופרסל', nameEn: 'Shufersal' },
  { id: 'רמי לוי', nameEn: 'Rami Levy' },
  { id: 'ויקטורי', nameEn: 'Victory' },
  { id: 'יוחננוף', nameEn: 'Yohananof' },
  { id: 'אושר עד', nameEn: 'Osher Ad' },
];

const CATEGORIES = ['all', 'Food', 'Tech', 'Fashion', 'Activities', 'Online'];

function timeAgo(date, langue) {
  const diff = Date.now() - new Date(date).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return langue === 'en' ? 'Just now' : 'זה עתה';
  if (h < 24) return langue === 'en' ? `${h}h ago` : `${h}ש' `;
  return langue === 'en' ? `${Math.floor(h / 24)}d ago` : `${Math.floor(h / 24)} ימים`;
}

async function detecterVille() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=he`
          );
          const data = await res.json();
          resolve(data.address?.city || data.address?.town || data.address?.village || null);
        } catch { resolve(null); }
      },
      () => resolve(null),
      { timeout: 5000 }
    );
  });
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
                background: isBest ? (isDark ? 'rgba(212,98,42,0.12)' : '#FEF0EB') : 'var(--bg-card2)',
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

function DealCard({ deal, langue, onVote }) {
  const reduction = deal.prix_original
    ? Math.round((deal.prix_original - deal.prix) / deal.prix_original * 100)
    : null;

  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: 20,
      overflow: 'hidden',
      boxShadow: 'var(--shadow-card)',
      marginBottom: 12,
    }}>
      <div style={{ position: 'relative', height: deal.image_url ? 200 : 72, background: 'var(--bg-card2)' }}>
        {deal.image_url ? (
          <img src={deal.image_url} alt={deal.titre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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

        <p style={{
          fontSize: 15, fontWeight: 700, color: 'var(--text)',
          marginBottom: 6,
          textAlign: langue === 'he' ? 'right' : 'left',
        }}>{deal.titre}</p>

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
            {' · '}{timeAgo(deal.created_at, langue)}
            {deal.auteur_nom ? ` · ${deal.auteur_nom}` : ''}
          </span>
        </p>

        <div style={{ display: 'flex', gap: 8, borderTop: '0.5px solid var(--border)', paddingTop: 10 }}>
          <button onClick={() => onVote(deal.id, 'chaud')} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '7px 14px', borderRadius: 20,
            background: 'var(--bg-card2)', border: '0.5px solid var(--border)',
            color: 'var(--text)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}>🔥 {deal.votes_chaud}</button>
          <button onClick={() => onVote(deal.id, 'froid')} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '7px 14px', borderRadius: 20,
            background: 'var(--bg-card2)', border: '0.5px solid var(--border)',
            color: 'var(--text)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
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

  const handleGps = async () => {
    setLoading(true);
    const v = await detecterVille();
    setLoading(false);
    if (v) { onSelect(v); onClose(); }
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
            <button onClick={() => { onSelect(null); onClose(); }} style={{
              padding: '11px 14px', borderRadius: 14,
              border: !villeActuelle ? `2px solid ${ACCENT}` : '0.5px solid var(--border)',
              background: !villeActuelle ? 'rgba(212,98,42,0.08)' : 'var(--bg-card2)',
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
              <button key={v} onClick={() => { onSelect(v); onClose(); }} style={{
                padding: '11px 14px', borderRadius: 14,
                border: villeActuelle === v ? `2px solid ${ACCENT}` : '0.5px solid var(--border)',
                background: villeActuelle === v ? 'rgba(212,98,42,0.08)' : 'var(--bg-card2)',
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

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  const [ville, setVille] = useState(null);
  const [villes, setVilles] = useState([]);
  const [showCityModal, setShowCityModal] = useState(false);
  const [promoVotes, setPromoVotes] = useState({});

  const t = translations[langue];
  const dir = langue === 'he' ? 'rtl' : 'ltr';
  const isDark = resolvedTheme === 'dark';

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem('dilzPromoVotes');
      if (saved) setPromoVotes(JSON.parse(saved));
    } catch {}
    fetch('/api/promos')
      .then(r => r.json())
      .then(d => { setPromos(d.promos || []); setLoadingPromos(false); })
      .catch(() => setLoadingPromos(false));
    fetch('/api/villes')
      .then(r => r.json())
      .then(d => setVilles(d.villes || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (tab !== 'deals') return;
    setLoadingDeals(true);
    const params = new URLSearchParams();
    if (categoryFilter !== 'all') params.set('categorie', categoryFilter);
    fetch(`/api/bons-plans?${params}`)
      .then(r => r.json())
      .then(d => { setDeals(d.bons_plans || []); setLoadingDeals(false); })
      .catch(() => setLoadingDeals(false));
  }, [tab, categoryFilter]);

  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setLoadingSearch(true);
      try {
        const res = await fetch('/api/prix?q=' + encodeURIComponent(searchQuery));
        const data = await res.json();
        setSearchResults(data.produits || []);
      } catch { }
      setLoadingSearch(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleVote = async (id, type) => {
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

  const filteredPromos = storeFilter === 'all'
    ? promos
    : promos.filter(p => p.meilleurEnseigne === storeFilter);

  const heroPromo = filteredPromos[0] || null;
  const gridPromos = filteredPromos.slice(1);

  if (!mounted) return null;

  const navItems = [
    {
      id: 'sales', label: t.nav.sales,
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? ACCENT : 'var(--text-muted)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      id: 'deals', label: t.nav.deals,
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? ACCENT : 'none'} stroke={active ? ACCENT : 'var(--text-muted)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      ),
    },
    {
      id: 'search', label: t.nav.search,
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? ACCENT : 'var(--text-muted)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
      ),
    },
    {
      id: 'profile', label: t.nav.profile,
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? ACCENT : 'var(--text-muted)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tab === 'search' ? 12 : 0 }}>
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
                  background: ville ? 'rgba(212,98,42,0.1)' : 'var(--bg-card2)',
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
          </div>

          {tab === 'search' && (
            <div style={{
              background: 'var(--bg-input)',
              borderRadius: 14, display: 'flex', alignItems: 'center',
              padding: '10px 14px', gap: 8, marginTop: 12,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder={t.search}
                autoFocus
                style={{
                  background: 'none', border: 'none', color: 'var(--text)',
                  fontSize: 15, flex: 1, outline: 'none',
                  textAlign: langue === 'he' ? 'right' : 'left',
                }}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}>×</button>
              )}
            </div>
          )}
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
                      background: active ? (s ? (isDark ? s.bgDark : s.bg) : 'rgba(212,98,42,0.1)') : 'var(--bg-card)',
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
                      background: active ? 'rgba(212,98,42,0.1)' : 'var(--bg-card)',
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

            {/* CTA */}
            <Link href="/bons-plans" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`,
              color: '#fff', padding: '16px 20px',
              borderRadius: 18, textDecoration: 'none',
              fontWeight: 700, fontSize: 15,
              marginBottom: 16,
              boxShadow: 'var(--shadow-accent)',
            }}>
              {t.shareNewDeal}
            </Link>

            {loadingDeals ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>{t.loading}</div>
            ) : deals.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                {langue === 'en' ? 'No deals yet — be the first!' : 'אין דילים עדיין — היה הראשון!'}
              </div>
            ) : (
              deals.map(deal => (
                <DealCard key={deal.id} deal={deal} langue={langue} onVote={handleVote} />
              ))
            )}
          </div>
        )}

        {/* ── SEARCH TAB ── */}
        {tab === 'search' && (
          <div>
            {/* Barcode scan shortcut */}
            <Link href="/scan" style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--bg-card)', borderRadius: 16,
              padding: '14px 16px', textDecoration: 'none',
              marginBottom: 14, border: '0.5px solid var(--border)',
              boxShadow: 'var(--shadow-card)',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
                  <path d="M3 9V6a1 1 0 0 1 1-1h3M15 5h3a1 1 0 0 1 1 1v3M21 15v3a1 1 0 0 1-1 1h-3M9 19H6a1 1 0 0 1-1-1v-3" />
                  <line x1="8" y1="12" x2="8" y2="12.01" /><line x1="12" y1="12" x2="12" y2="12.01" /><line x1="16" y1="12" x2="16" y2="12.01" />
                </svg>
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Scan a barcode</p>
                <p style={{ fontSize: 12, color: 'var(--text-sub)', margin: 0 }}>Compare prices across all stores</p>
              </div>
              <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 16 }}>›</span>
            </Link>

            {loadingSearch && (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)' }}>{t.loading}</div>
            )}
            {!loadingSearch && searchQuery.length >= 2 && searchResults.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                {t.noProducts}
              </div>
            )}
            {!loadingSearch && searchQuery.length < 2 && (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                {langue === 'en' ? 'Type at least 2 characters to search' : 'הקלד לפחות 2 תווים לחיפוש'}
              </div>
            )}
            {searchResults.map(produit => {
              const tousLesPrix = produit.tousLesPrix || [];
              const meilleurPrix = tousLesPrix.length ? Math.min(...tousLesPrix.map(p => p.prix)) : null;
              const nom = (langue === 'en' && produit.nom_en) ? produit.nom_en : produit.nom;
              return (
                <div key={produit.barcode} style={{
                  background: 'var(--bg-card)',
                  borderRadius: 18, padding: '14px 16px',
                  marginBottom: 10,
                  boxShadow: 'var(--shadow-card)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <span style={{ fontSize: 22, fontWeight: 800, color: ACCENT }}>₪{meilleurPrix}</span>
                    <div style={{ textAlign: langue === 'he' ? 'right' : 'left', flex: 1, marginLeft: langue === 'en' ? 12 : 0, marginRight: langue === 'he' ? 12 : 0 }}>
                      <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', marginBottom: 2 }}>{nom}</p>
                      {produit.quantite && (
                        <p style={{ fontSize: 12, color: 'var(--text-sub)' }}>{produit.quantite} {produit.unite}</p>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {tousLesPrix.map(p => {
                      const isBest = p.prix === meilleurPrix;
                      return (
                        <div key={p.enseigne} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '10px 12px', borderRadius: 12,
                          background: isBest ? 'rgba(212,98,42,0.08)' : 'var(--bg-card2)',
                          border: isBest ? `1px solid ${ACCENT}` : '0.5px solid var(--border)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <StoreBadge enseigne={p.enseigne} langue={langue} isDark={isDark} />
                            {isBest && (
                              <span style={{ fontSize: 11, color: ACCENT, fontWeight: 700 }}>
                                {langue === 'en' ? '✓ Best' : '✓ הכי זול'}
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: 18, fontWeight: 700, color: isBest ? ACCENT : 'var(--text-sub)' }}>₪{p.prix}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
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
              onClick={() => {
                if (item.id === 'profile') { router.push('/profil'); return; }
                setTab(item.id);
              }}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                background: 'none', border: 'none', cursor: 'pointer',
                position: 'relative', minWidth: 64, padding: '4px 0',
              }}
            >
              {item.icon(active)}
              <span style={{
                fontSize: 10, fontWeight: active ? 700 : 400,
                color: active ? ACCENT : 'var(--text-muted)',
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
          onSelect={setVille}
          onClose={() => setShowCityModal(false)}
        />
      )}
    </div>
  );
}
