import { Badge } from '../ui/Badge';
import { IconButton } from '../ui/Button';

const STORE_COLORS = {
  'שופרסל':  { color: '#2563EB', bg: '#EFF6FF', dark: '#1A2744', nameEn: 'Shufersal' },
  'רמי לוי': { color: '#DC2626', bg: '#FEF2F2', dark: '#3D1212', nameEn: 'Rami Levy' },
  'ויקטורי': { color: '#7C3AED', bg: '#F5F3FF', dark: '#2A1845', nameEn: 'Victory' },
  'יוחננוף': { color: '#059669', bg: '#ECFDF5', dark: '#0F3025', nameEn: 'Yohananof' },
  'אושר עד': { color: '#D97706', bg: '#FFFBEB', dark: '#3B2500', nameEn: 'Osher Ad' },
  'כרפור':   { color: '#0284C7', bg: '#F0F9FF', dark: '#0C2336', nameEn: 'Carrefour' },
  'BE':       { color: '#E2552D', bg: '#FFF4F0', dark: '#2A1210', nameEn: 'BE' },
  'Super-Pharm': { color: '#E11D48', bg: '#FFF1F2', dark: '#3B111B', nameEn: 'Super-Pharm' },
  'Good Pharm':  { color: '#16A34A', bg: '#F0FDF4', dark: '#12351F', nameEn: 'Good Pharm' },
};

function productImageSrc(image) {
  if (!image) return null;
  try {
    const url = new URL(image);
    if (url.hostname === 'rami-levy.co.il' || url.hostname.endsWith('.rami-levy.co.il')) {
      return `/api/image?url=${encodeURIComponent(url.toString())}`;
    }
  } catch {}
  return image;
}

function ShopBagIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 01-8 0"/>
    </svg>
  );
}

function HotIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2c0 0-4.5 5.5-4.5 10a4.5 4.5 0 0 0 9 0C16.5 7.5 12 2 12 2zm0 13a2.5 2.5 0 0 1-2.5-2.5C9.5 10 12 6.5 12 6.5S14.5 10 14.5 12.5A2.5 2.5 0 0 1 12 15z"/></svg>;
}

function ColdIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="2" x2="12" y2="22"/><path d="m20 10-8-8-8 8"/><path d="m20 14-8 8-8-8"/><line x1="2" y1="12" x2="22" y2="12"/><path d="m18 6-6 6-6-6"/><path d="m18 18-6-6-6 6"/></svg>;
}

function SaveIcon({ saved }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M19 21 12 17 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16Z" />
    </svg>
  );
}

export function PromoCard({ promo, lang, isDark, onClick, votes, onVote, isSaved, onSave }) {
  const s = STORE_COLORS[promo.meilleurEnseigne] || null;
  const nom = (lang !== 'he' && promo.nom_en) ? promo.nom_en : promo.nom;
  const myVote = votes?.myVote;
  const imageSrc = productImageSrc(promo.image);
  const storeName = lang === 'he' ? promo.meilleurEnseigne : (s?.nameEn || promo.meilleurEnseigne);

  const bannerBg = s
    ? (isDark ? `linear-gradient(135deg, ${s.dark}, #17171D)` : `linear-gradient(135deg, ${s.bg}, #fff)`)
    : 'var(--surface-soft)';

  return (
    <article className="dilz-promo-card">
      <button type="button" className="dilz-promo-card__media" style={{ background: bannerBg }} onClick={onClick} aria-label={`View ${nom}`}>
        <span className="dilz-promo-card__media-icon" aria-hidden="true"><ShopBagIcon /></span>
        {imageSrc && (
          <img src={imageSrc} alt={nom} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        )}
        {promo.reduction > 3 && (
          <span className="dilz-promo-card__discount">-{promo.reduction}%</span>
        )}
      </button>

      <div className="dilz-promo-card__body" onClick={onClick} role="button" tabIndex={-1} style={{ cursor: 'pointer' }}>
        <p className="dilz-promo-card__name">{nom}</p>
        <div className="dilz-promo-card__prices">
          <strong>&#8362;{promo.prixMin.toFixed(2)}</strong>
          {promo.prixMax > promo.prixMin && (
            <del>&#8362;{promo.prixMax.toFixed(2)}</del>
          )}
        </div>
        <span
          className="dilz-promo-card__store"
          style={s ? { color: s.color, background: isDark ? s.dark : s.bg } : undefined}
        >
          {storeName}
        </span>
      </div>

      <div className="dilz-promo-card__actions">
        <button
          type="button"
          className={['dilz-promo-vote-btn', myVote === 'chaud' && 'is-hot'].filter(Boolean).join(' ')}
          onClick={() => onVote(promo.barcode, 'chaud')}
          aria-label="Hot"
          aria-pressed={myVote === 'chaud'}
        >
          <HotIcon /> {votes?.chaud || 0}
        </button>
        <button
          type="button"
          className={['dilz-promo-vote-btn', myVote === 'froid' && 'is-cold'].filter(Boolean).join(' ')}
          onClick={() => onVote(promo.barcode, 'froid')}
          aria-label="Cold"
          aria-pressed={myVote === 'froid'}
        >
          <ColdIcon /> {votes?.froid || 0}
        </button>
        {onSave && (
          <IconButton
            aria-label={isSaved ? 'Unsave' : 'Save'}
            selected={isSaved}
            onClick={(e) => { e.stopPropagation(); onSave(); }}
            className="dilz-promo-card__save"
          >
            <SaveIcon saved={isSaved} />
          </IconButton>
        )}
      </div>
    </article>
  );
}

export function HeroPromoCard({ promo, lang, isDark, onClick, votes, onVote, isSaved, onSave }) {
  const s = STORE_COLORS[promo.meilleurEnseigne] || null;
  const nom = (lang !== 'he' && promo.nom_en) ? promo.nom_en : promo.nom;
  const myVote = votes?.myVote;
  const imageSrc = productImageSrc(promo.image);
  const storeName = lang === 'he' ? promo.meilleurEnseigne : (s?.nameEn || promo.meilleurEnseigne);

  const bannerBg = s
    ? (isDark ? `linear-gradient(145deg, ${s.dark} 0%, #0E0E12 100%)` : `linear-gradient(145deg, ${s.bg} 0%, #FFFFFF 100%)`)
    : 'var(--surface-soft)';

  return (
    <article className="dilz-hero-promo-card" style={{ background: bannerBg }}>
      <button type="button" className="dilz-hero-promo-card__media" onClick={onClick} aria-label={`View ${nom}`} style={{
        background: s ? (isDark ? `linear-gradient(145deg, ${s.dark}, #17171D)` : `linear-gradient(145deg, ${s.bg}, #fff)`) : 'var(--surface-soft)',
      }}>
        <span className="dilz-hero-promo-card__media-icon" aria-hidden="true"><ShopBagIcon /></span>
        {imageSrc && (
          <img src={imageSrc} alt={nom} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        )}
        <div className="dilz-hero-promo-card__badges">
          {s && <span className="dilz-hero-promo-card__store" style={{ color: s.color, background: isDark ? s.dark : s.bg }}>{storeName}</span>}
          {promo.reduction > 3 && <span className="dilz-promo-card__discount">-{promo.reduction}%</span>}
        </div>
      </button>

      <div className="dilz-hero-promo-card__body" onClick={onClick} role="button" tabIndex={-1} style={{ cursor: 'pointer' }}>
        <p className="dilz-hero-promo-card__label">{lang !== 'he' ? 'Price comparison' : 'השוואת מחירים'}</p>
        <p className="dilz-hero-promo-card__name">{nom}</p>
        <div className="dilz-hero-promo-card__prices">
          <strong>&#8362;{promo.prixMin.toFixed(2)}</strong>
          <del>&#8362;{promo.prixMax.toFixed(2)}</del>
          <span className="dilz-hero-promo-card__saving">
            {lang !== 'he' ? `Save ₪${(promo.prixMax - promo.prixMin).toFixed(2)}` : `חסכו ₪${(promo.prixMax - promo.prixMin).toFixed(2)}`}
          </span>
        </div>
      </div>

      <div className="dilz-promo-card__actions dilz-hero-promo-card__actions">
        <button
          type="button"
          className={['dilz-promo-vote-btn', myVote === 'chaud' && 'is-hot'].filter(Boolean).join(' ')}
          onClick={() => onVote(promo.barcode, 'chaud')}
          aria-label="Hot"
          aria-pressed={myVote === 'chaud'}
        >
          <HotIcon /> {votes?.chaud || 0}
        </button>
        <button
          type="button"
          className={['dilz-promo-vote-btn', myVote === 'froid' && 'is-cold'].filter(Boolean).join(' ')}
          onClick={() => onVote(promo.barcode, 'froid')}
          aria-label="Cold"
          aria-pressed={myVote === 'froid'}
        >
          <ColdIcon /> {votes?.froid || 0}
        </button>
        <button type="button" className="dilz-button dilz-button--ghost dilz-button--sm" onClick={onClick}>View</button>
        {onSave && (
          <IconButton aria-label={isSaved ? 'Unsave' : 'Save'} selected={isSaved} onClick={(e) => { e.stopPropagation(); onSave(); }}>
            <SaveIcon saved={isSaved} />
          </IconButton>
        )}
      </div>
    </article>
  );
}
