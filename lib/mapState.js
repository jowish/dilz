import { getCityCoordinates } from './israelCities.js';

export function toggleCityFilter(selectedCity, clickedCity) {
  if (!clickedCity || selectedCity === clickedCity) return null;
  return clickedCity;
}

export function buildMapUrl(city) {
  return city ? `/map?city=${encodeURIComponent(city)}` : '/map';
}

function validPoint(lat, lon) {
  return Number.isFinite(lat)
    && Number.isFinite(lon)
    && lat >= 29.3
    && lat <= 33.6
    && lon >= 34.1
    && lon <= 35.95;
}

export function mapDealHasExactCoordinates(deal = {}) {
  return validPoint(Number(deal.latitude), Number(deal.longitude));
}

export function getMapDealCoordinates(deal = {}, fallbackCoords = {}) {
  const latitude = Number(deal.latitude);
  const longitude = Number(deal.longitude);
  if (validPoint(latitude, longitude)) return { lat: latitude, lon: longitude, exact: true };

  const cityCoords = deal.ville
    ? getCityCoordinates(deal.ville) || fallbackCoords[deal.ville] || null
    : null;
  return cityCoords && validPoint(Number(cityCoords.lat), Number(cityCoords.lon))
    ? { lat: Number(cityCoords.lat), lon: Number(cityCoords.lon), exact: false }
    : null;
}

export function groupMapDealsByCity(deals = [], fallbackCoords = {}) {
  return deals.reduce((groups, deal) => {
    if (!deal?.ville || !getMapDealCoordinates(deal, fallbackCoords)) return groups;
    if (!groups[deal.ville]) groups[deal.ville] = [];
    groups[deal.ville].push(deal);
    return groups;
  }, {});
}

export function getMapGroupCoordinates(city, deals = [], fallbackCoords = {}) {
  const cityCoords = city ? getCityCoordinates(city) || fallbackCoords[city] || null : null;
  if (cityCoords && validPoint(Number(cityCoords.lat), Number(cityCoords.lon))) {
    return { lat: Number(cityCoords.lat), lon: Number(cityCoords.lon) };
  }

  const points = deals.map((deal) => getMapDealCoordinates(deal, fallbackCoords)).filter(Boolean);
  if (!points.length) return null;
  return {
    lat: points.reduce((sum, point) => sum + point.lat, 0) / points.length,
    lon: points.reduce((sum, point) => sum + point.lon, 0) / points.length,
  };
}

export function resolveMapCityKey(requestedCity, cityKeys = [], fallbackCoords = {}) {
  if (!requestedCity) return null;
  if (cityKeys.includes(requestedCity)) return requestedCity;
  const requestedCoords = getCityCoordinates(requestedCity) || fallbackCoords[requestedCity] || null;
  if (!requestedCoords) return null;
  return cityKeys.find((city) => {
    const coords = getCityCoordinates(city) || fallbackCoords[city] || null;
    return coords
      && Math.abs(Number(coords.lat) - Number(requestedCoords.lat)) < 0.01
      && Math.abs(Number(coords.lon) - Number(requestedCoords.lon)) < 0.01;
  }) || null;
}

export function getVisibleMapDeals(deals = [], selectedCity = null, groupedDeals = null, fallbackCoords = {}) {
  if (selectedCity) return (groupedDeals?.[selectedCity] || []).filter((deal) => getMapDealCoordinates(deal, fallbackCoords));
  return deals.filter((deal) => getMapDealCoordinates(deal, fallbackCoords));
}

export function getMapFocusPoints(deals = [], selectedCity = null, groupedDeals = null, fallbackCoords = {}) {
  const visibleDeals = getVisibleMapDeals(deals, selectedCity, groupedDeals, fallbackCoords);
  return visibleDeals.map((deal) => getMapDealCoordinates(deal, fallbackCoords)).filter(Boolean);
}
