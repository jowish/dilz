import { useEffect, useState } from 'react';

// One button, one dropdown — replacing the row of four icon toggles (map plus
// three card layouts) that used to sit on its own line under the filters.
// The trigger shows the view you are in, so the row still says what it is
// showing without spending four tap targets on it.
export function ViewMenu({ value, options, lang = 'en', onSelect }) {
  const [open, setOpen] = useState(false);
  const label = lang === 'he' ? 'תצוגה' : 'View';
  const current = options.find((option) => option.id === value) || options[0];

  // Same dismissal contract as the other popovers in the app (ShareMenu,
  // SafetyActions): any scroll, wheel, touch-drag or Escape closes it.
  useEffect(() => {
    if (!open) return undefined;
    const close = () => setOpen(false);
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('scroll', close, true);
    window.addEventListener('wheel', close, { capture: true, passive: true });
    window.addEventListener('touchmove', close, { capture: true, passive: true });
    window.addEventListener('keydown', closeOnEscape, true);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('wheel', close, true);
      window.removeEventListener('touchmove', close, true);
      window.removeEventListener('keydown', closeOnEscape, true);
    };
  }, [open]);

  return (
    <div className="dilz-view-menu">
      <button
        type="button"
        className={['dilz-view-menu__trigger', open && 'is-open'].filter(Boolean).join(' ')}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${label}: ${current?.label || ''}`}
        title={current?.label || label}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="dilz-view-menu__icon" aria-hidden="true">{current?.icon}</span>
        <span className="dilz-view-menu__label">{current?.label}</span>
        <span className="dilz-view-menu__chevron" aria-hidden="true" />
      </button>

      {open && (
        <>
          <button
            type="button"
            className="dilz-popover-dismiss"
            aria-label={lang === 'he' ? 'סגירת בחירת התצוגה' : 'Close view menu'}
            onClick={(event) => { event.stopPropagation(); setOpen(false); }}
          />
          <div className="dilz-view-menu__panel" role="menu" aria-label={label}>
            {options.map((option) => (
              <button
                key={option.id}
                type="button"
                role="menuitemradio"
                aria-checked={option.id === value}
                className={option.id === value ? 'is-active' : ''}
                onClick={() => { setOpen(false); onSelect(option); }}
              >
                <span className="dilz-view-menu__icon" aria-hidden="true">{option.icon}</span>
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
