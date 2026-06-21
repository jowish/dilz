import { useEffect } from 'react';
import { useSheetGesture } from '../../lib/useSheetGesture';

const CATEGORIES = ['Food', 'Tech', 'Fashion', 'Activities', 'Online'];

function MenuItem({ icon, label, active = false, onClick }) {
  return (
    <button
      type="button"
      className={['dilz-main-menu__item', active && 'is-active'].filter(Boolean).join(' ')}
      onClick={onClick}
    >
      <span className="dilz-main-menu__item-icon" aria-hidden="true">{icon}</span>
      <span>{label}</span>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
    </button>
  );
}

export function MainMenuSheet({
  lang = 'en',
  open,
  onClose,
  onHome,
  onDeals,
  onCodePromos,
  onCategory,
  onFree,
  activeCollection = 'all',
  activeCategory = 'all',
}) {
  const { panelRef, handleProps } = useSheetGesture(onClose);
  const text = lang === 'he'
    ? { dialog: 'תפריט ראשי', navigation: 'ניווט', menu: 'תפריט', close: 'סגירת התפריט', sections: 'חלקי Dilz', home: 'בית', deals: 'קניות חכמות', codes: 'קודי קופון', free: 'חינם', categories: 'קטגוריות', filter: 'סינון דילז', labels: { Food: 'מזון', Tech: 'טכנולוגיה', Fashion: 'אופנה', Activities: 'פעילויות', Online: 'אונליין' } }
    : { dialog: 'Main menu', navigation: 'Navigation', menu: 'Menu', close: 'Close menu', sections: 'Dilz sections', home: 'Home', deals: 'Shopping deals', codes: 'Promo codes', free: 'Free', categories: 'Categories', filter: 'Filter Dilz', labels: { Food: 'Food', Tech: 'Tech', Fashion: 'Fashion', Activities: 'Activities', Online: 'Online' } };
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="dilz-main-menu__backdrop" onClick={onClose}>
      <aside
        ref={panelRef}
        className="dilz-main-menu"
        role="dialog"
        aria-label={text.dialog}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dilz-main-menu__handle" aria-hidden="true" {...handleProps} />
        <div className="dilz-main-menu__header">
          <div>
            <span>{text.navigation}</span>
            <h2>{text.menu}</h2>
          </div>
          <button type="button" className="dilz-main-menu__close" onClick={onClose} aria-label={text.close}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <nav className="dilz-main-menu__links" aria-label={text.sections}>
          <MenuItem
            label={text.home}
            onClick={onHome}
            icon={<svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8.5Z" /></svg>}
          />
          <MenuItem
            label={text.deals}
            onClick={onDeals}
            icon={<svg viewBox="0 0 24 24"><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" /><path d="M7.5 7.5h.01" /></svg>}
          />
          <MenuItem
            label={text.codes}
            onClick={onCodePromos}
            icon={<svg viewBox="0 0 24 24"><path d="M4 8.5A2.5 2.5 0 0 0 4 13v4h16v-4a2.5 2.5 0 0 0 0-4.5V5H4v3.5Z" /><path d="M9 8h.01M15 14h.01M15 8l-6 6" /></svg>}
          />
          <MenuItem
            label={text.free}
            onClick={onFree}
            icon={<svg viewBox="0 0 24 24"><path d="M20 12v8H4v-8M2 7h20v5H2zM12 7v13M12 7H7.5A2.5 2.5 0 1 1 10 4.5L12 7Zm0 0h4.5A2.5 2.5 0 1 0 14 4.5L12 7Z" /></svg>}
          />
        </nav>

        <div className="dilz-main-menu__categories">
          <div className="dilz-main-menu__section-title">
            <span>{text.categories}</span>
            <small>{text.filter}</small>
          </div>
          <div className="dilz-main-menu__category-grid">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                className={activeCollection === 'all' && activeCategory === category ? 'is-active' : ''}
                onClick={() => onCategory(category)}
              >
                {text.labels[category]}
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
