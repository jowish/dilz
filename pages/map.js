import { useMemo, useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { traduireVille } from '../lib/translations';
import { useAppLanguage } from '../lib/useAppLanguage';
import { VoteEmoji } from '../components/ui/VoteEmoji';
import {
  buildMapUrl,
  getMapDealCoordinates,
  getMapFocusPoints,
  getMapGroupCoordinates,
  getVisibleMapDeals,
  groupMapDealsByCity,
  mapDealHasExactCoordinates,
  resolveMapCityKey,
  toggleCityFilter,
} from '../lib/mapState';

const MAP_TEXT = {
  en: { title: 'Dilz Map', back: 'Back', feed: 'Feed', points: 'active points', loading: 'Loading Dilz map...', israel: 'All Israel', tap: 'Tap a city to filter', mapPoints: 'Dilz map points', comments: 'comments' },
  he: { title: 'מפת Dilz', back: 'חזרה', feed: 'פיד', points: 'נקודות פעילות', loading: 'מפת Dilz נטענת...', israel: 'כל ישראל', tap: 'לחצו על עיר כדי לסנן', mapPoints: 'נקודות במפת Dilz', comments: 'תגובות' },
};

const ACCENT = '#0284C7';
const ISRAEL_BOUNDS = [
  [29.35, 34.15],
  [33.35, 35.95],
];

const CITY_COORDS = {
  'תל אביב': { lat: 32.0853, lon: 34.7818 },
  'ירושלים': { lat: 31.7683, lon: 35.2137 },
  'חיפה': { lat: 32.7940, lon: 34.9896 },
  'באר שבע': { lat: 31.2518, lon: 34.7913 },
  'אילת': { lat: 29.5577, lon: 34.9519 },
  'נתניה': { lat: 32.3226, lon: 34.8533 },
  'ראשון לציון': { lat: 31.9730, lon: 34.7925 },
  'פתח תקווה': { lat: 32.0878, lon: 34.8878 },
  'אשדוד': { lat: 31.7918, lon: 34.6495 },
  'אשקלון': { lat: 31.6688, lon: 34.5743 },
  'הרצליה': { lat: 32.1652, lon: 34.8440 },
  'כפר סבא': { lat: 32.1786, lon: 34.9078 },
  'רמת גן': { lat: 32.0821, lon: 34.8137 },
  'בני ברק': { lat: 32.0804, lon: 34.8338 },
  'חולון': { lat: 32.0114, lon: 34.7794 },
  'בת ים': { lat: 32.0204, lon: 34.7508 },
  'נהריה': { lat: 33.0073, lon: 35.0987 },
  'עכו': { lat: 32.9225, lon: 35.0779 },
  'טבריה': { lat: 32.7956, lon: 35.5310 },
  'צפת': { lat: 32.9646, lon: 35.4966 },
  'נצרת': { lat: 32.6996, lon: 35.3034 },
  'רחובות': { lat: 31.8928, lon: 34.8113 },
  'מודיעין': { lat: 31.8979, lon: 35.0100 },
  'לוד': { lat: 31.9519, lon: 34.8893 },
  'רמלה': { lat: 31.9283, lon: 34.8635 },
  'קריית גת': { lat: 31.6095, lon: 34.7748 },
  'דימונה': { lat: 31.0638, lon: 35.0278 },
  'אופקים': { lat: 31.3120, lon: 34.6221 },
  'עפולה': { lat: 32.6078, lon: 35.2897 },
  'כרמיאל': { lat: 32.9146, lon: 35.2962 },
  'ראש העין': { lat: 32.0969, lon: 34.9566 },
  'רעננה': { lat: 32.1836, lon: 34.8711 },
  'יהוד': { lat: 32.0326, lon: 34.8881 },
  'גבעתיים': { lat: 32.0704, lon: 34.8118 },
  'אור יהודה': { lat: 32.0267, lon: 34.8569 },
  'קריית אונו': { lat: 32.0639, lon: 34.8556 },
};

function formatPrice(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return n % 1 === 0
    ? n.toLocaleString('en-US')
    : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getCommentCount(deal) {
  return Number(deal.commentaires?.[0]?.count || deal.comments_count || 0);
}

export default function MapPage() {
  const router = useRouter();
  const { lang, setLang, dir } = useAppLanguage();
  const text = MAP_TEXT[lang];
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState(null);
  const [leafletReady, setLeafletReady] = useState(false);

  const dealsByCity = useMemo(() => groupMapDealsByCity(deals, CITY_COORDS), [deals]);
  const cityEntries = useMemo(
    () => Object.entries(dealsByCity).sort((a, b) => b[1].length - a[1].length),
    [dealsByCity]
  );
  const selectedDeals = useMemo(
    () => getVisibleMapDeals(deals, selectedCity, dealsByCity, CITY_COORDS),
    [deals, selectedCity, dealsByCity]
  );

  useEffect(() => {
    fetch('/api/bons-plans?limit=500&tri=hot')
      .then(r => r.json())
      .then(data => setDeals(data.bons_plans || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    const city = typeof router.query.city === 'string' ? router.query.city : null;
    setSelectedCity(resolveMapCityKey(city, Object.keys(dealsByCity), CITY_COORDS));
  }, [router.isReady, router.query.city, dealsByCity]);

  const selectCity = (city) => {
    const nextCity = toggleCityFilter(selectedCity, city);
    setSelectedCity(nextCity);
    router.replace(buildMapUrl(nextCity), undefined, { shallow: true, scroll: false });
  };

  const goBackToFeed = () => {
    let returnUrl = '/?tab=dilz';
    try {
      const saved = sessionStorage.getItem('dilzMapReturnUrl');
      if (saved && saved.startsWith('/')) returnUrl = saved;
    } catch {}
    router.push(returnUrl);
  };

  useEffect(() => {
    if (window.L) {
      setLeafletReady(true);
      return;
    }

    if (!document.getElementById('leaflet-css')) {
      const css = document.createElement('link');
      css.id = 'leaflet-css';
      css.rel = 'stylesheet';
      css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(css);
    }

    let js = document.getElementById('leaflet-js');
    if (!js) {
      js = document.createElement('script');
      js.id = 'leaflet-js';
      js.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      js.async = true;
      document.head.appendChild(js);
    }
    const markReady = () => {
      if (window.L) setLeafletReady(true);
    };
    js.addEventListener('load', markReady);
    const retry = window.setInterval(markReady, 150);
    return () => {
      js.removeEventListener('load', markReady);
      window.clearInterval(retry);
    };
  }, []);

  useEffect(() => {
    if (!leafletReady || loading || !mapRef.current) return;
    const L = window.L;
    if (!L) return;

    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }

    const israelBounds = L.latLngBounds(ISRAEL_BOUNDS);
    const map = L.map(mapRef.current, {
      center: [31.8, 34.9],
      zoom: 8,
      zoomControl: true,
      maxBounds: israelBounds.pad(0.35),
      maxBoundsViscosity: 0.75,
    });
    leafletMapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    cityEntries.forEach(([city, cityDeals]) => {
      const fallbackDeals = cityDeals.filter((deal) => !mapDealHasExactCoordinates(deal));
      if (!fallbackDeals.length) return;
      const coords = getMapGroupCoordinates(city, fallbackDeals, CITY_COORDS);
      if (!coords) return;
      const count = fallbackDeals.length;
      const active = city === selectedCity;
      const icon = L.divIcon({
        className: '',
        html: `<div class="dilz-map-marker ${active ? 'is-active' : ''}"><strong>Dilz</strong><span>${count}</span></div>`,
        iconSize: [active ? 72 : 62, active ? 40 : 36],
        iconAnchor: [active ? 36 : 31, active ? 20 : 18],
      });

      const marker = L.marker([coords.lat, coords.lon], { icon }).addTo(map);
      marker.on('click', () => {
        selectCity(city);
        map.flyTo([coords.lat, coords.lon], 12, { animate: true, duration: 0.5 });
      });
    });

    deals.filter(mapDealHasExactCoordinates).forEach((deal) => {
      const coords = getMapDealCoordinates(deal, CITY_COORDS);
      const icon = L.divIcon({
        className: '',
        html: `<div class="dilz-map-marker dilz-map-marker--exact"><strong>${formatPrice(deal.prix)} ₪</strong></div>`,
        iconSize: [64, 34],
        iconAnchor: [32, 17],
      });
      const marker = L.marker([coords.lat, coords.lon], { icon }).addTo(map);
      marker.on('click', () => {
        const nextCity = deal.ville || null;
        setSelectedCity(nextCity);
        router.replace(buildMapUrl(nextCity), undefined, { shallow: true, scroll: false });
        map.flyTo([coords.lat, coords.lon], 15, { animate: true, duration: 0.5 });
      });
    });

    const focusMap = () => {
      map.invalidateSize();
      const focusPoints = getMapFocusPoints(deals, selectedCity, dealsByCity, CITY_COORDS);
      if (selectedCity && focusPoints.length) {
        if (focusPoints.length === 1) {
          map.flyTo([focusPoints[0].lat, focusPoints[0].lon], 13, { animate: false });
        } else {
          map.fitBounds(focusPoints.map((point) => [point.lat, point.lon]), { padding: [34, 34], maxZoom: 13, animate: false });
        }
      } else if (focusPoints.length) {
        map.fitBounds(focusPoints.map((point) => [point.lat, point.lon]), { padding: [38, 38], maxZoom: 9, animate: false });
      } else {
        map.fitBounds(israelBounds, { padding: [18, 18], animate: false });
      }
    };

    map.whenReady(() => {
      focusMap();
      window.setTimeout(focusMap, 120);
      window.setTimeout(focusMap, 360);
    });

    return () => {
      map.remove();
      leafletMapRef.current = null;
    };
  }, [leafletReady, loading, cityEntries, selectedCity, deals]);

  const openDeal = (dealId) => router.push(`/deal/${dealId}`);

  return (
    <>
      <Head>
        <title>{text.title}</title>
      </Head>
      <div className="dilz-map-page" dir={dir}>
        <header className="dilz-map-header">
          <button type="button" className="dilz-map-back" onClick={goBackToFeed} aria-label={text.back}>
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M15 6 9 12l6 6" />
            </svg>
          </button>
          <div className="dilz-map-title" dir={dir}>
            <strong>{text.title}</strong>
            <span>{cityEntries.length} {text.points}</span>
          </div>
          <div className="dilz-map-header__actions">
            <select className="dilz-language-select" value={lang} onChange={(event) => setLang(event.target.value)} aria-label="Language"><option value="en">EN</option><option value="he">HE</option></select>
          </div>
        </header>

        <main className="dilz-map-body">
          <section className="dilz-map-canvas">
            {loading ? (
              <div className="dilz-map-loading">{text.loading}</div>
            ) : (
              <div ref={mapRef} className="dilz-map-node" />
            )}
          </section>

          <aside className="dilz-map-results">
            <div className="dilz-map-results__top">
              <div className="dilz-map-results__header">
                <p>{selectedCity ? traduireVille(selectedCity, lang) : text.israel}</p>
                <strong>{selectedDeals.length} Dilz</strong>
                {!selectedCity && <span>{text.tap}</span>}
              </div>

              <div className="dilz-map-city-strip" aria-label={text.mapPoints}>
                <button
                  type="button"
                  className={!selectedCity ? 'is-active' : ''}
                  onClick={() => selectCity(null)}
                >
                  <span>{text.israel}</span>
                  <strong>{getVisibleMapDeals(deals, null, dealsByCity, CITY_COORDS).length}</strong>
                </button>
                {cityEntries.slice(0, 12).map(([city, cityDeals]) => (
                  <button
                    key={city}
                    type="button"
                    className={city === selectedCity ? 'is-active' : ''}
                    onClick={() => selectCity(city)}
                  >
                    <span>{traduireVille(city, lang)}</span>
                    <strong>{cityDeals.length}</strong>
                  </button>
                ))}
              </div>
            </div>

            <div className="dilz-map-deal-list">
              {selectedDeals.map(deal => (
                <button key={deal.id} type="button" className="dilz-map-deal" onClick={() => openDeal(deal.id)}>
                  {deal.image_url ? (
                    <img src={deal.image_url} alt="" />
                  ) : (
                    <span className="dilz-map-deal__fallback">Dilz</span>
                  )}
                  <span className="dilz-map-deal__content">
                    <strong>{deal.titre}</strong>
                    <span>{[deal.magasin, deal.auteur_nom].filter(Boolean).join(' · ')}</span>
                    <span className="dilz-map-deal__stats">
                      <b>{formatPrice(deal.prix)} ₪</b>
                      <span><VoteEmoji type="chaud" /> {deal.votes_chaud || 0}</span>
                      <span><VoteEmoji type="froid" /> {deal.votes_froid || 0}</span>
                      <span>{getCommentCount(deal)} {text.comments}</span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </aside>
        </main>
      </div>
    </>
  );
}
