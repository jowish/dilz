export function FilterChip({ selected = false, className = '', children, ...props }) {
  return (
    <button
      type="button"
      className={['dilz-filter-chip', selected && 'is-selected', className].filter(Boolean).join(' ')}
      aria-pressed={selected}
      {...props}
    >
      {children}
    </button>
  );
}
