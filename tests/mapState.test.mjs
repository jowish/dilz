import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMapUrl,
  getMapDealCoordinates,
  getMapFocusPoints,
  getVisibleMapDeals,
  groupMapDealsByCity,
  mapDealHasExactCoordinates,
  resolveMapCityKey,
  toggleCityFilter,
} from '../lib/mapState.js';

test('selects a city when no map filter is active', () => {
  assert.equal(toggleCityFilter(null, 'Tel Aviv'), 'Tel Aviv');
});

test('clicking the selected city clears the map filter', () => {
  assert.equal(toggleCityFilter('Tel Aviv', 'Tel Aviv'), null);
});

test('clicking All Israel clears any selected city', () => {
  assert.equal(toggleCityFilter('Jerusalem', null), null);
});

test('map URL omits the city parameter for the global view', () => {
  assert.equal(buildMapUrl(null), '/map');
  assert.equal(buildMapUrl('Tel Aviv'), '/map?city=Tel%20Aviv');
});

test('map deal coordinates prefer exact location and fall back to known city coordinates', () => {
  assert.deepEqual(getMapDealCoordinates({ latitude: 32.1, longitude: 34.8 }), { lat: 32.1, lon: 34.8, exact: true });
  assert.equal(mapDealHasExactCoordinates({ latitude: 32.1, longitude: 34.8 }), true);

  const fallback = getMapDealCoordinates({ ville: 'Tel Aviv' });
  assert.equal(fallback.exact, false);
  assert.equal(fallback.lat, 32.0853);
});

test('map grouping and city URL resolution keep zoom targets stable', () => {
  const deals = [
    { id: 1, ville: 'תל אביב' },
    { id: 2, ville: 'תל אביב', latitude: 32.09, longitude: 34.79 },
    { id: 3, ville: 'ירושלים' },
  ];
  const groups = groupMapDealsByCity(deals);
  assert.equal(groups['תל אביב'].length, 2);
  assert.equal(resolveMapCityKey('Tel Aviv', Object.keys(groups)), 'תל אביב');
  assert.equal(resolveMapCityKey('Unknown', Object.keys(groups)), null);
});

test('global map view includes exact and city fallback deals while city view narrows points', () => {
  const deals = [
    { id: 1, ville: 'תל אביב' },
    { id: 2, ville: 'ירושלים' },
    { id: 3, latitude: 31.9, longitude: 34.8 },
  ];
  const groups = groupMapDealsByCity(deals);
  assert.deepEqual(getVisibleMapDeals(deals, null, groups).map((deal) => deal.id), [1, 2, 3]);
  assert.deepEqual(getVisibleMapDeals(deals, 'תל אביב', groups).map((deal) => deal.id), [1]);
  assert.equal(getMapFocusPoints(deals, null, groups).length, 3);
  assert.equal(getMapFocusPoints(deals, 'תל אביב', groups).length, 1);
});
