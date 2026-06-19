export function VoteEmoji({ type }) {
  return (
    <span className="dilz-vote-emoji" aria-hidden="true">
      {type === 'chaud' ? '\u{1F525}' : '\u2744\uFE0F'}
    </span>
  );
}
