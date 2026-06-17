export function SearchBar({ value, onChange, onFocus, placeholder = 'Search deals, stores, cities', rightAction }) {
  return (
    <div className="dilz-search-bar">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input value={value || ''} onChange={onChange} onFocus={onFocus} placeholder={placeholder} />
      {rightAction}
    </div>
  );
}
