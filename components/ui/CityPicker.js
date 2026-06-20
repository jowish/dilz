import { useMemo, useState } from 'react';
import { cityDisplayName, mergeCities } from '../../lib/israelCities';

export function CityPicker({ value = '', cities = [], lang = 'en', onChange, error, includeAll = true }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [letter, setLetter] = useState('');
  const options = useMemo(() => mergeCities(cities), [cities]);
  const labels = options.map((city) => ({ ...city, label: cityDisplayName(city.value, lang) }));
  const letters = [...new Set(labels.map((city) => city.label.trim().charAt(0).toUpperCase()).filter(Boolean))].sort((a, b) => a.localeCompare(b, lang === 'he' ? 'he' : 'en'));
  const filtered = labels.filter((city) => {
    const query = search.trim().toLocaleLowerCase();
    return (!letter || city.label.toUpperCase().startsWith(letter)) && (!query || `${city.label} ${city.en} ${city.he}`.toLocaleLowerCase().includes(query));
  });

  const select = (city) => {
    onChange(city?.value || '', city ? { lat: city.lat, lon: city.lon } : null);
    setOpen(false);
    setSearch('');
    setLetter('');
  };

  return (
    <div className={['dilz-city-picker', error && 'has-error'].filter(Boolean).join(' ')}>
      <button type="button" className="dilz-city-picker__trigger" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        <span>{value ? cityDisplayName(value, lang) : (lang === 'he' ? 'כל ישראל' : 'All Israel')}</span>
        <span aria-hidden="true">⌄</span>
      </button>
      {open && (
        <div className="dilz-city-picker__panel">
          <input autoFocus className="dilz-input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={lang === 'he' ? 'חיפוש עיר...' : 'Search city...'} />
          <div className="dilz-city-picker__letters" aria-label={lang === 'he' ? 'סינון לפי אות' : 'Filter by first letter'}>
            <button type="button" className={!letter ? 'is-active' : ''} onClick={() => setLetter('')}>#</button>
            {letters.map((item) => <button type="button" key={item} className={letter === item ? 'is-active' : ''} onClick={() => setLetter(item)}>{item}</button>)}
          </div>
          <div className="dilz-city-picker__options">
            {includeAll && <button type="button" className={!value ? 'is-active' : ''} onClick={() => select(null)}>{lang === 'he' ? 'כל ישראל' : 'All Israel'}</button>}
            {filtered.map((city) => <button type="button" key={city.value} className={value === city.value ? 'is-active' : ''} onClick={() => select(city)}>{city.label}</button>)}
          </div>
        </div>
      )}
      {error && <span className="dilz-field__error">{error}</span>}
    </div>
  );
}
