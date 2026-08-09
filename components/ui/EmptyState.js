import { Button } from './Button';

function BoxIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 7h16M6 7l1 13h10l1-13" />
      <path d="M9 7V5a3 3 0 0 1 6 0v2" />
    </svg>
  );
}

function WifiOffIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M2 2l20 20" />
      <path d="M8.5 16.5a5 5 0 0 1 7 0" />
      <path d="M5 12.5a10 10 0 0 1 3.5-2.5" />
      <path d="M12 20h.01" />
      <path d="M16.5 12.5a10 10 0 0 1 2.5 1.9" />
      <path d="M19.5 9a15 15 0 0 1 2.5 2" />
      <path d="M2 11a15 15 0 0 1 4.5-3" />
    </svg>
  );
}

export function EmptyState({ title, text, actionLabel, onAction, tone = 'empty' }) {
  return (
    <div className={['dilz-empty-state', tone === 'error' && 'is-error'].filter(Boolean).join(' ')}>
      <div className="dilz-empty-state__mark" aria-hidden="true">
        {tone === 'error' ? <WifiOffIcon /> : <BoxIcon />}
      </div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {actionLabel && onAction && (
        <Button variant="soft" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
