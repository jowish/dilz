import { useEffect, useMemo, useState } from 'react';
import { getDevicePosition } from '../../lib/nativeApp';
import { filterCityOptions, localizedCityOptions } from '../../lib/israelCities';

function LocationIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>;
}

export function CityModal({ villes = [], current, lang = 'en', onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const cities = useMemo(() => localizedCityOptions(villes, lang), [villes, lang]);
  const filtered = useMemo(() => filterCityOptions(cities, { search, lang }), [cities, search, lang]);

  useEffect(() => {
    const esc = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, [onClose]);

  const handleGps = async () => {
    setGpsLoading(true);
    setLocationError('');
    try {
      const { coords } = await getDevicePosition({ timeout: 10000, enableHighAccuracy: true });
      try {
        const response = await fetch(`/api/geocode?lat=${coords.latitude}&lon=${coords.longitude}&lang=${lang}`);
        const result = await response.json();
        if (response.ok) {
          onSelect(result.city || null, { lat: coords.latitude, lon: coords.longitude, address: result.address || '', exact: true });
          onClose();
          return;
        }
      } catch {}
      onSelect(null, { lat: coords.latitude, lon: coords.longitude, address: '', exact: true });
      onClose();
    } catch {
      setLocationError(lang === 'he' ? 'לא הצלחנו לזהות את המיקום. בדקו את ההרשאה או נסו שוב.' : 'We could not detect your location. Check permission or try again.');
    } finally {
      setGpsLoading(false);
    }
  };

  return (
    <div className="dilz-sheet-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={lang === 'he' ? 'בחירת עיר' : 'Select city'}>
      <div className="dilz-sheet dilz-city-modal" onClick={(event) => event.stopPropagation()}>
        <div className="dilz-sheet__handle" aria-hidden="true" />
        <h2 className="dilz-sheet__title">{lang === 'he' ? 'בחרו מיקום' : 'Choose a location'}</h2>
        <button type="button" className="dilz-location-detect" onClick={handleGps} disabled={gpsLoading}>
          <LocationIcon /> {gpsLoading ? (lang === 'he' ? 'מאתר...' : 'Locating...') : (lang === 'he' ? 'השתמשו במיקום המדויק שלי' : 'Use my exact location')}
        </button>
        {locationError && <p className="dilz-field__error">{locationError}</p>}
        <input autoFocus type="search" className="dilz-input dilz-city-modal__search" placeholder={lang === 'he' ? 'חיפוש עיר...' : 'Search city...'} value={search} onChange={(event) => setSearch(event.target.value)} />
        <div className="dilz-city-modal__grid" dir={lang === 'he' ? 'rtl' : 'ltr'}>
          <button type="button" className={['dilz-city-btn', !current && 'is-active'].filter(Boolean).join(' ')} onClick={() => { onSelect(null, null); onClose(); }}>{lang === 'he' ? 'כל ישראל' : 'All Israel'}</button>
          {filtered.map((city) => <button type="button" key={city.value} className={['dilz-city-btn', current === city.value && 'is-active'].filter(Boolean).join(' ')} onClick={() => { onSelect(city.value, { lat: city.lat, lon: city.lon }); onClose(); }}>{city.label}</button>)}
        </div>
      </div>
    </div>
  );
}
