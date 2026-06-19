import { useState, useEffect, useRef } from 'react';
import { traduireVille } from '../../lib/translations';
import { getDevicePosition } from '../../lib/nativeApp';

const POPULAR_CITIES = ['תל אביב', 'ירושלים', 'חיפה', 'ראשון לציון', 'נתניה', 'רעננה', 'הרצליה', 'כפר סבא', 'רמת גן', 'פתח תקווה'];

const CITY_COORDS = {
  'תל אביב':     { lat: 32.0853, lon: 34.7818 },
  'ירושלים':     { lat: 31.7683, lon: 35.2137 },
  'חיפה':        { lat: 32.7940, lon: 34.9896 },
  'באר שבע':     { lat: 31.2518, lon: 34.7913 },
  'אילת':        { lat: 29.5577, lon: 34.9519 },
  'נתניה':       { lat: 32.3226, lon: 34.8533 },
  'ראשון לציון': { lat: 31.9730, lon: 34.7925 },
  'פתח תקווה':   { lat: 32.0878, lon: 34.8878 },
  'הרצליה':      { lat: 32.1652, lon: 34.8440 },
  'כפר סבא':     { lat: 32.1786, lon: 34.9078 },
  'רמת גן':      { lat: 32.0821, lon: 34.8137 },
  'רעננה':       { lat: 32.1836, lon: 34.8711 },
};

function LocationIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>;
}

export function CityModal({ villes = [], current, lang, onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', esc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const allCities = [...new Set([...POPULAR_CITIES, ...villes])];
  const filtered = allCities.filter((v) =>
    v.toLowerCase().includes(search.toLowerCase()) ||
    (traduireVille(v, 'en') || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleGps = async () => {
    setGpsLoading(true);
    try {
      const { coords: { latitude, longitude } } = await getDevicePosition({ timeout: 8000 });
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=he`
      );
      const d = await r.json();
      const v = d.address?.city || d.address?.town || d.address?.village || null;
      onSelect(v, { lat: latitude, lon: longitude });
      onClose();
    } catch {}
    setGpsLoading(false);
  };

  return (
    <div className="dilz-sheet-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={lang !== 'he' ? 'Select city' : 'בחר עיר'}>
      <div className="dilz-sheet dilz-city-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dilz-sheet__handle" aria-hidden="true" />
        <h2 className="dilz-sheet__title">{lang !== 'he' ? 'Select your city' : 'בחר עיר'}</h2>

        <div className="dilz-city-modal__search">
          <input
            ref={inputRef}
            type="text"
            className="dilz-input"
            placeholder={lang !== 'he' ? 'Search city...' : 'חפש עיר...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={lang !== 'he' ? 'Search city' : 'חפש עיר'}
          />
        </div>

        <div className="dilz-city-modal__grid">
          <button
            type="button"
            className={['dilz-city-btn', !current && 'is-active'].filter(Boolean).join(' ')}
            onClick={() => { onSelect(null, null); onClose(); }}
          >
            {lang !== 'he' ? 'All Israel' : 'כל הארץ'}
          </button>

          <button
            type="button"
            className="dilz-city-btn dilz-city-btn--gps"
            onClick={handleGps}
            disabled={gpsLoading}
          >
            <LocationIcon />
            {gpsLoading ? '...' : (lang !== 'he' ? 'My location' : 'מיקומי')}
          </button>

          {filtered.map((v) => (
            <button
              key={v}
              type="button"
              className={['dilz-city-btn', current === v && 'is-active'].filter(Boolean).join(' ')}
              onClick={() => { onSelect(v, CITY_COORDS[v] || null); onClose(); }}
            >
              {traduireVille(v, lang)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
