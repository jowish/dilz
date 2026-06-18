import { useEffect } from 'react';

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

export function PromoModal({ promo, lang, isDark, onClose }) {
  const nom = (lang !== 'he' && promo.nom_en) ? promo.nom_en : promo.nom;
  const imageSrc = productImageSrc(promo.image);

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', esc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="dilz-sheet-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={nom}
    >
      <div className="dilz-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="dilz-sheet__handle" aria-hidden="true" />

        {imageSrc && (
          <div className="dilz-promo-modal__image">
            <img
              src={imageSrc}
              alt={nom}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
        )}

        <p className="dilz-promo-modal__name" style={{ textAlign: lang === 'he' ? 'right' : 'left' }}>{nom}</p>

        <div className="dilz-promo-modal__prices">
          {promo.tousLesPrix.map((p) => {
            const isBest = p.prix === promo.prixMin;
            const s = STORE_COLORS[p.enseigne];
            const storeName = lang === 'he' ? p.enseigne : (s?.nameEn || p.enseigne);
            return (
              <div key={p.enseigne} className={['dilz-promo-modal__price-row', isBest && 'is-best'].filter(Boolean).join(' ')}>
                <span
                  className="dilz-promo-modal__store-badge"
                  style={s ? { color: s.color, background: isDark ? s.dark : s.bg } : undefined}
                >
                  {storeName}
                </span>
                <div className="dilz-promo-modal__price-right">
                  {isBest && <span className="dilz-promo-modal__best-badge">{lang !== 'he' ? 'Best price' : 'מחיר הטוב ביותר'}</span>}
                  <strong>&#8362;{p.prix.toFixed(2)}</strong>
                </div>
              </div>
            );
          })}
        </div>

        <div className="dilz-promo-modal__saving-summary">
          <p>
            {lang !== 'he'
              ? `Save ₪${(promo.prixMax - promo.prixMin).toFixed(2)} by choosing the best store (${promo.reduction}% difference)`
              : `חסכו ₪${(promo.prixMax - promo.prixMin).toFixed(2)} בבחירת החנות הזולה ביותר`}
          </p>
          <small>{lang !== 'he' ? 'Price comparison · not an official promotion' : 'השוואת מחירים · לא מבצע רשמי'}</small>
        </div>

        {promo.imageSource === 'open_food_facts' && (
          <a
            href={`https://world.openfoodfacts.org/product/${promo.barcode}`}
            target="_blank"
            rel="noreferrer"
            className="dilz-promo-modal__attribution"
          >
            Image: Open Food Facts · CC BY-SA
          </a>
        )}

        <button type="button" className="dilz-button dilz-button--secondary dilz-button--md" style={{ width: '100%', marginTop: 12 }} onClick={onClose}>
          {lang !== 'he' ? 'Close' : 'סגור'}
        </button>
      </div>
    </div>
  );
}
