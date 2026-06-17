import { useEffect, useRef } from 'react';

export function Modal({ title, subtitle, onClose, children, footer, className = '' }) {
  const panelRef = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    const panel = panelRef.current;
    const focusable = panel?.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    focusable?.[0]?.focus?.();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab' || !focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="dilz-modal" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <section
        ref={panelRef}
        className={['dilz-modal__panel', className].filter(Boolean).join(' ')}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="dilz-modal__handle" aria-hidden="true" />
        <header className="dilz-modal__header">
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="dilz-modal__close" onClick={onClose} aria-label="Close">
            <span aria-hidden="true">x</span>
          </button>
        </header>
        <div className="dilz-modal__body">{children}</div>
        {footer && <footer className="dilz-modal__footer">{footer}</footer>}
      </section>
    </div>
  );
}
