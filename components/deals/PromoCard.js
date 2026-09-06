import { Badge } from '../ui/Badge';
import { IconButton } from '../ui/Button';
import { VoteEmoji } from '../ui/VoteEmoji';

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

  const bannerBg = isDark ? 'var(--surface-soft)' : 'var(--section-bg)';

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
          <strong>{promo.prixMin.toFixed(2)} &#8362;</strong>
          {promo.prixMax > promo.prixMin && (
            <del>{promo.prixMax.toFixed(2)} &#8362;</del>
          )}
        </div>
        <span className="dilz-promo-card__store">
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
          <VoteEmoji type="chaud" />
          <strong>{votes?.chaud || 0}</strong>
        </button>
        <button
          type="button"
          className={['dilz-promo-vote-btn', myVote === 'froid' && 'is-cold'].filter(Boolean).join(' ')}
          onClick={() => onVote(promo.barcode, 'froid')}
          aria-label="Cold"
          aria-pressed={myVote === 'froid'}
        >
          <VoteEmoji type="froid" />
          <strong>{votes?.froid || 0}</strong>
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

  const bannerBg = isDark ? 'var(--surface-soft)' : 'var(--section-bg)';

  return (
    <article className="dilz-hero-promo-card" style={{ background: bannerBg }}>
      <button type="button" className="dilz-hero-promo-card__media" onClick={onClick} aria-label={`View ${nom}`} style={{ background: bannerBg }}>
        <span className="dilz-hero-promo-card__media-icon" aria-hidden="true"><ShopBagIcon /></span>
        {imageSrc && (
          <img src={imageSrc} alt={nom} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        )}
        <div className="dilz-hero-promo-card__badges">
          {s && <span className="dilz-hero-promo-card__store">{storeName}</span>}
          {promo.reduction > 3 && <span className="dilz-promo-card__discount">-{promo.reduction}%</span>}
        </div>
      </button>

      <div className="dilz-hero-promo-card__body" onClick={onClick} role="button" tabIndex={-1} style={{ cursor: 'pointer' }}>
        <p className="dilz-hero-promo-card__label">{lang !== 'he' ? 'Price comparison' : 'השוואת מחירים'}</p>
        <p className="dilz-hero-promo-card__name">{nom}</p>
        <div className="dilz-hero-promo-card__prices">
          <strong>{promo.prixMin.toFixed(2)} &#8362;</strong>
          <del>{promo.prixMax.toFixed(2)} &#8362;</del>
          <span className="dilz-hero-promo-card__saving">
            {lang !== 'he' ? `Save ${(promo.prixMax - promo.prixMin).toFixed(2)} ₪` : `חסכו ${(promo.prixMax - promo.prixMin).toFixed(2)} ₪`}
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
          <VoteEmoji type="chaud" />
          <strong>{votes?.chaud || 0}</strong>
        </button>
        <button
          type="button"
          className={['dilz-promo-vote-btn', myVote === 'froid' && 'is-cold'].filter(Boolean).join(' ')}
          onClick={() => onVote(promo.barcode, 'froid')}
          aria-label="Cold"
          aria-pressed={myVote === 'froid'}
        >
          <VoteEmoji type="froid" />
          <strong>{votes?.froid || 0}</strong>
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
