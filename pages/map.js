import { useMemo, useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

const ACCENT = '#0284C7';

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

function groupDealsByCity(deals) {
  const grouped = {};
  deals
    .filter(deal => deal.ville && CITY_COORDS[deal.ville])
    .forEach(deal => {
      if (!grouped[deal.ville]) grouped[deal.ville] = [];
      grouped[deal.ville].push(deal);
    });
  return grouped;
}

export default function MapPage() {
  const router = useRouter();
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState(null);
  const [leafletReady, setLeafletReady] = useState(false);

  const dealsByCity = useMemo(() => groupDealsByCity(deals), [deals]);
  const cityEntries = useMemo(
    () => Object.entries(dealsByCity).sort((a, b) => b[1].length - a[1].length),
    [dealsByCity]
  );
  const selectedDeals = selectedCity ? dealsByCity[selectedCity] || [] : [];

  useEffect(() => {
    fetch('/api/bons-plans?limit=200&tri=hot')
      .then(r => r.json())
      .then(data => setDeals(data.bons_plans || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedCity && cityEntries.length > 0) setSelectedCity(cityEntries[0][0]);
  }, [cityEntries, selectedCity]);

  useEffect(() => {
    if (!router.isReady) return;
    const city = typeof router.query.city === 'string' ? router.query.city : null;
    if (city && CITY_COORDS[city]) setSelectedCity(city);
  }, [router.isReady, router.query.city]);

  const selectCity = (city) => {
    setSelectedCity(city);
    router.push(`/map?city=${encodeURIComponent(city)}`, undefined, { shallow: true, scroll: false });
  };

  useEffect(() => {
    if (document.getElementById('leaflet-css')) {
      setLeafletReady(true);
      return;
    }
    const css = document.createElement('link');
    css.id = 'leaflet-css';
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(css);

    const js = document.createElement('script');
    js.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    js.onload = () => setLeafletReady(true);
    document.head.appendChild(js);
  }, []);

  useEffect(() => {
    if (!leafletReady || loading || !mapRef.current) return;
    const L = window.L;
    if (!L) return;

    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }

    const map = L.map(mapRef.current, {
      center: [31.8, 34.9],
      zoom: 8,
      zoomControl: true,
    });
    leafletMapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    cityEntries.forEach(([city, cityDeals]) => {
      const coords = CITY_COORDS[city];
      const count = cityDeals.length;
      const active = city === selectedCity;
      const icon = L.divIcon({
        className: '',
        html: `<div class="dilz-map-marker ${active ? 'is-active' : ''}"><strong>Dilz</strong><span>${count}</span></div>`,
        iconSize: [active ? 72 : 62, active ? 40 : 36],
        iconAnchor: [active ? 36 : 31, active ? 20 : 18],
      });

      const marker = L.marker([coords.lat, coords.lon], { icon }).addTo(map);
      marker.on('click', () => selectCity(city));
    });

    return () => {
      map.remove();
      leafletMapRef.current = null;
    };
  }, [leafletReady, loading, cityEntries, selectedCity]);

  const openDeal = (dealId) => router.push(`/deal/${dealId}`);

  return (
    <>
      <Head>
        <title>dilz - Map</title>
      </Head>
      <div className="dilz-map-page">
        <header className="dilz-map-header">
          <button type="button" onClick={() => router.back()}>Back</button>
          <div>
            <strong>dilz Map</strong>
            <span>{cityEntries.length} active points</span>
          </div>
          <button type="button" onClick={() => router.push('/?tab=dilz')}>Feed</button>
        </header>

        <main className="dilz-map-body">
          <section className="dilz-map-canvas">
            {loading ? (
              <div className="dilz-map-loading">Loading Dilz map...</div>
            ) : (
              <div ref={mapRef} className="dilz-map-node" />
            )}
          </section>

          <aside className="dilz-map-results">
            <div className="dilz-map-results__header">
              <p>{selectedCity || 'Israel'}</p>
              <strong>{selectedDeals.length} Dilz</strong>
              <span>Select any map point to see the Dilz available there.</span>
            </div>

            <div className="dilz-map-city-strip" aria-label="Dilz map points">
              {cityEntries.slice(0, 12).map(([city, cityDeals]) => (
                <button
                  key={city}
                  type="button"
                  className={city === selectedCity ? 'is-active' : ''}
                  onClick={() => selectCity(city)}
                >
                  <span>{city}</span>
                  <strong>{cityDeals.length}</strong>
                </button>
              ))}
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
                      <span>Hot {deal.votes_chaud || 0}</span>
                      <span>Cold {deal.votes_froid || 0}</span>
                      <span>Comments {getCommentCount(deal)}</span>
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
