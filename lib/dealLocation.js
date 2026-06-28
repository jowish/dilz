export function buildDealGpsUrl(deal = {}) {
  const latitude = Number(deal.latitude);
  const longitude = Number(deal.longitude);
  const query = Number.isFinite(latitude) && Number.isFinite(longitude)
    ? `${latitude},${longitude}`
    : String(deal.adresse || '').trim();

  if (!query) return '';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
