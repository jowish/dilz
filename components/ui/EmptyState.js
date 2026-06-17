import { Button } from './Button';

export function EmptyState({ title, text, actionLabel, onAction }) {
  return (
    <div className="dilz-empty-state">
      <div className="dilz-empty-state__mark" aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 7h16M6 7l1 13h10l1-13" />
          <path d="M9 7V5a3 3 0 0 1 6 0v2" />
        </svg>
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
