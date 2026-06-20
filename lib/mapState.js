export function toggleCityFilter(selectedCity, clickedCity) {
  if (!clickedCity || selectedCity === clickedCity) return null;
  return clickedCity;
}

export function buildMapUrl(city) {
  return city ? `/map?city=${encodeURIComponent(city)}` : '/map';
}
