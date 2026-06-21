import { useMemo, useState } from 'react';
import { cityDisplayName, filterCityOptions, localizedCityOptions } from '../../lib/israelCities';

export function CityPicker({ value = '', cities = [], lang = 'en', onChange, error, includeAll = true }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const options = useMemo(() => localizedCityOptions(cities, lang), [cities, lang]);
  const filtered = useMemo(() => filterCityOptions(options, { search, lang }), [options, search, lang]);

  const select = (city) => {
    onChange(city?.value || '', city ? { lat: city.lat, lon: city.lon } : null);
    setOpen(false);
    setSearch('');
  };

  return (
    <div className={['dilz-city-picker', error && 'has-error'].filter(Boolean).join(' ')}>
      <div className="dilz-city-picker__control">
        <button type="button" className="dilz-city-picker__trigger" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
          <span>{value ? cityDisplayName(value, lang) : (lang === 'he' ? 'כל ישראל' : 'All Israel')}</span>
          <span aria-hidden="true">⌄</span>
        </button>
        {value && (
          <button
            type="button"
            className="dilz-city-picker__clear"
            aria-label={lang === 'he' ? 'ניקוי בחירת העיר' : 'Clear selected city'}
            onClick={() => select(null)}
          >
            ×
          </button>
        )}
      </div>
      {open && (
        <div className="dilz-city-picker__panel">
          <input autoFocus className="dilz-input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={lang === 'he' ? 'חיפוש עיר...' : 'Search city...'} />
          <div className="dilz-city-picker__options" dir={lang === 'he' ? 'rtl' : 'ltr'}>
            {includeAll && <button type="button" className={!value ? 'is-active' : ''} onClick={() => select(null)}>{lang === 'he' ? 'כל ישראל' : 'All Israel'}</button>}
            {filtered.map((city) => <button type="button" key={city.value} className={value === city.value ? 'is-active' : ''} onClick={() => select(city)}>{city.label}</button>)}
          </div>
        </div>
      )}
      {error && <span className="dilz-field__error">{error}</span>}
    </div>
  );
}
