export function Badge({ tone = 'neutral', className = '', children, ...props }) {
  return (
    <span className={['dilz-badge', `dilz-badge--${tone}`, className].filter(Boolean).join(' ')} {...props}>
      {children}
    </span>
  );
}
