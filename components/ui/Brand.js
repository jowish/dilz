// Shared brand primitives.
//
// Wordmark  — the "dILz" logotype with the quiet underline under "IL"
//             (the ISO code for Israel folded into the name).
// DilzMark  — the standalone symbol: the "d" drawn as a lens/magnifier,
//             one ring + one stem. Uses currentColor so it works ink-on-
//             paper and paper-on-ink from a single definition.

export function Wordmark({ className = '', ...props }) {
  return (
    <span className={['dilz-logo', className].filter(Boolean).join(' ')} {...props}>
      d<span className="dilz-logo__il">IL</span>z
    </span>
  );
}

export function DilzMark({ className = '', title, ...props }) {
  return (
    <svg
      className={['dilz-mark', className].filter(Boolean).join(' ')}
      viewBox="0 0 120 120"
      role={title ? 'img' : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
      {...props}
    >
      <circle cx="60" cy="74" r="25" fill="none" stroke="currentColor" strokeWidth="18" />
      <rect x="76" y="12" width="18" height="96" rx="2" fill="currentColor" />
    </svg>
  );
}
