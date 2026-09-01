export function VoteEmoji({ type }) {
  const isHot = type === 'chaud';
  return (
    <span className={`dilz-vote-emoji ${isHot ? 'dilz-vote-emoji--hot' : 'dilz-vote-emoji--cold'}`} aria-hidden="true">
      {isHot ? <FlameIcon /> : <SnowflakeIcon />}
    </span>
  );
}

function FlameIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12.963 2.286a.75.75 0 0 0-1.071-.136 9.742 9.742 0 0 0-3.539 6.176 7.547 7.547 0 0 1-1.705-1.715.75.75 0 0 0-1.152-.082A9 9 0 1 0 15.68 4.534a7.46 7.46 0 0 1-2.717-2.248ZM15.75 14.25a3.75 3.75 0 1 1-7.313-1.172c.628.465 1.35.81 2.133 1a5.99 5.99 0 0 1 1.925-3.545 3.75 3.75 0 0 1 3.255 3.717Z"
      />
    </svg>
  );
}

function SnowflakeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20M3 7.5l18 9M3 16.5l18-9" />
      <path d="M12 5.5 9.8 7M12 5.5l2.2 1.5M12 18.5l-2.2-1.5M12 18.5l2.2-1.5M5 9l-2.6-.3M5 9l.8-2.5M19 9l2.6-.3M19 9l-.8-2.5M5 15l.8 2.5M5 15l-2.6.3M19 15l-.8 2.5M19 15l2.6.3" />
    </svg>
  );
}
