const ISRAEL_BOUNDS = { minLat: 29.3, maxLat: 33.6, minLon: 34.1, maxLon: 35.95 };

// In-memory rate limiter: max 10 requests per IP per minute
const rateLimitMap = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const window = 60_000;
  const max = 10;
  const entry = rateLimitMap.get(ip) || { count: 0, start: now };
  if (now - entry.start > window) {
    rateLimitMap.set(ip, { count: 1, start: now });
    return false;
  }
  if (entry.count >= max) return true;
  entry.count++;
  rateLimitMap.set(ip, entry);
  return false;
}

export function inIsrael(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= ISRAEL_BOUNDS.minLat && lat <= ISRAEL_BOUNDS.maxLat && lon >= ISRAEL_BOUNDS.minLon && lon <= ISRAEL_BOUNDS.maxLon;
}

export function locationPayload(item) {
  const address = item.address || {};
  return {
    address: item.display_name || '',
    city: address.city || address.town || address.village || address.municipality || '',
    latitude: Number(item.lat),
    longitude: Number(item.lon),
  };
}

export function simplifyAddress(query) {
  return String(query)
    .replace(/\b(street|road|avenue|boulevard|st|rd|ave)\b\.?/gi, '')
    .replace(/\s+([,.;])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

async function searchAddress(query, headers) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.search = new URLSearchParams({ q: query, format: 'jsonv2', addressdetails: '1', limit: '1', countrycodes: 'il' });
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error('Geocoding failed.');
  return response.json();
}

export default async function handler(req, res) {
  res.setHeader('Allow', 'GET');
  if (req.method !== 'GET') return res.status(405).end();
  const ip = (req.headers?.['x-forwarded-for'] ?? '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
  if (checkRateLimit(ip)) return res.status(429).json({ erreur: 'Too many requests. Please try again later.' });
  const lang = req.query.lang === 'he' ? 'he' : 'en';
  const headers = { 'User-Agent': `Dilz/1.0 (${process.env.GEOCODING_CONTACT || 'contact@dilz.app'})`, 'Accept-Language': lang };
  try {
    if (req.query.q) {
      const query = String(req.query.q).trim().slice(0, 300);
      if (!query) return res.status(400).json({ erreur: 'Address is required.' });
      let rows = await searchAddress(`${query}, Israel`, headers);
      if (!rows.length) {
        const simplified = simplifyAddress(query);
        if (simplified !== query) rows = await searchAddress(simplified, headers);
      }
      const item = rows.find((row) => inIsrael(Number(row.lat), Number(row.lon)));
      if (!item) return res.status(404).json({ erreur: 'Address not found in Israel.' });
      return res.status(200).json(locationPayload(item));
    }
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    if (!inIsrael(lat, lon)) return res.status(400).json({ erreur: 'Coordinates must be in Israel.' });
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.search = new URLSearchParams({ lat: String(lat), lon: String(lon), format: 'jsonv2', addressdetails: '1' });
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Geocoding failed.');
    const item = await response.json();
    return res.status(200).json(locationPayload(item));
  } catch (error) {
    return res.status(502).json({ erreur: error.message || 'Location service unavailable.' });
  }
}
