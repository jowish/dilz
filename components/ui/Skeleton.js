export function Skeleton({ className = '', style }) {
  return <div className={['dilz-skeleton', className].filter(Boolean).join(' ')} style={style} aria-hidden="true" />;
}

export function DealCardSkeleton() {
  return (
    <article className="dilz-card dilz-deal-card">
      <Skeleton className="dilz-deal-card__image" />
      <div className="dilz-deal-card__body">
        <Skeleton style={{ width: '42%', height: 12, marginBottom: 10 }} />
        <Skeleton style={{ width: '92%', height: 18, marginBottom: 8 }} />
        <Skeleton style={{ width: '72%', height: 18, marginBottom: 16 }} />
        <Skeleton style={{ width: '55%', height: 24, marginBottom: 16 }} />
        <Skeleton style={{ width: '100%', height: 36 }} />
      </div>
    </article>
  );
}
