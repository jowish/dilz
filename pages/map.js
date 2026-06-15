import { useState, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
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

export default function MapPage() {
  const router = useRouter();
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [leafletReady, setLeafletReady] = useState(false);

  useEffect(() => {
    fetch('/api/bons-plans?limit=200&tri=hot')
      .then(r => r.json())
      .then(d => { setDeals(d.bons_plans || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Load Leaflet CSS + JS from CDN then init map
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

  // Init map once Leaflet ready + deals loaded + container mounted
  useEffect(() => {
    if (!leafletReady || loading || !mapRef.current || leafletMapRef.current) return;
    const L = window.L;
    if (!L) return;

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

    const dealsWithCoords = deals.filter(d => d.ville && CITY_COORDS[d.ville]);

    // Group deals by city to avoid overlapping markers
    const byCity = {};
    dealsWithCoords.forEach(deal => {
      const key = deal.ville;
      if (!byCity[key]) byCity[key] = [];
      byCity[key].push(deal);
    });

    Object.entries(byCity).forEach(([ville, cityDeals]) => {
      const coords = CITY_COORDS[ville];
      const count = cityDeals.length;

      const icon = L.divIcon({
        className: '',
        html: `<div style="
          background: ${ACCENT};
          color: #fff;
          border-radius: 50%;
          width: ${count > 1 ? 36 : 30}px;
          height: ${count > 1 ? 36 : 30}px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${count > 1 ? 13 : 11}px;
          font-weight: 800;
          font-family: -apple-system, sans-serif;
          box-shadow: 0 2px 8px rgba(2,132,199,0.5);
          border: 2px solid #fff;
          cursor: pointer;
        ">${count > 1 ? count : '🛍️'}</div>`,
        iconSize: [count > 1 ? 36 : 30, count > 1 ? 36 : 30],
        iconAnchor: [count > 1 ? 18 : 15, count > 1 ? 18 : 15],
      });

      const marker = L.marker([coords.lat, coords.lon], { icon }).addTo(map);
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        flushSync(() => setSelectedDeal({ deals: cityDeals, ville }));
      });
    });

    return () => {
      map.remove();
      leafletMapRef.current = null;
    };
  }, [leafletReady, loading, deals]);

  return (
    <>
      <Head>
        <title>dilz — Map</title>
      </Head>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>
        {/* Header */}
        <div style={{
          background: 'var(--nav-bg)',
          borderBottom: '0.5px solid var(--border)',
          padding: '14px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          zIndex: 50,
          flexShrink: 0,
        }}>
          <button onClick={() => router.back()} style={{
            background: 'none', border: 'none',
            color: 'var(--text-sub)', fontSize: 14, fontWeight: 500, cursor: 'pointer',
          }}>
            ← Back
          </button>
          <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
            dil<span style={{ color: ACCENT }}>z</span> Map
          </span>
          <div style={{ width: 48 }} />
        </div>

        {/* Map container */}
        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading deals...</span>
          </div>
        ) : (
          <div ref={mapRef} style={{ flex: 1 }} />
        )}

        {/* Deal panel — slides up when a marker is tapped */}
        {selectedDeal && (
          <div
            onClick={() => setSelectedDeal(null)}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.4)', zIndex: 200,
              display: 'flex', alignItems: 'flex-end',
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: 600, margin: '0 auto',
                background: 'var(--bg-card)',
                borderRadius: '24px 24px 0 0',
                padding: '16px 16px 40px',
                maxHeight: '55vh', overflowY: 'auto',
              }}
            >
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 14px' }} />
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-sub)', marginBottom: 10 }}>
                📍 {selectedDeal.ville} — {selectedDeal.deals.length} deal{selectedDeal.deals.length > 1 ? 's' : ''}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {selectedDeal.deals.map(deal => (
                  <div
                    key={deal.id}
                    onClick={() => { setSelectedDeal(null); router.push(`/deal/${deal.id}`); }}
                    style={{
                      display: 'flex', gap: 12, alignItems: 'center',
                      background: 'var(--bg-card2)', borderRadius: 16,
                      padding: '12px 14px', cursor: 'pointer',
                    }}
                  >
                    {deal.image_url && (
                      <img src={deal.image_url} alt={deal.titre} style={{
                        width: 56, height: 56, borderRadius: 12, objectFit: 'cover', flexShrink: 0,
                      }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: 14, fontWeight: 700, color: 'var(--text)',
                        marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{deal.titre}</p>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: ACCENT }}>₪{deal.prix}</span>
                        {deal.prix_original && (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'line-through' }}>₪{deal.prix_original}</span>
                        )}
                        <span style={{ fontSize: 11, color: 'var(--text-sub)' }}>{deal.magasin}</span>
                      </div>
                    </div>
                    <span style={{ fontSize: 18, color: 'var(--text-sub)', flexShrink: 0 }}>›</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
