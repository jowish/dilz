import test from 'node:test';
import assert from 'node:assert/strict';
import { CITY_COORDINATES, ISRAEL_CITIES, cityDisplayName, getCityCoordinates, mergeCities } from '../lib/israelCities.js';

test('catalog contains a broad set of Israeli cities', () => {
  assert.ok(ISRAEL_CITIES.length >= 60);
});

test('city values and English labels are unique', () => {
  assert.equal(new Set(ISRAEL_CITIES.map((city) => city.value)).size, ISRAEL_CITIES.length);
  assert.equal(new Set(ISRAEL_CITIES.map((city) => city.en)).size, ISRAEL_CITIES.length);
});

test('every catalog coordinate is finite and inside Israel bounds', () => {
  for (const city of ISRAEL_CITIES) {
    assert.ok(city.value && city.en && city.he);
    assert.ok(Number.isFinite(city.lat) && city.lat >= 29.3 && city.lat <= 33.6, city.en);
    assert.ok(Number.isFinite(city.lon) && city.lon >= 34.1 && city.lon <= 35.95, city.en);
  }
});

for (const name of ['Tel Aviv', 'Jerusalem', 'Haifa', 'Eilat', 'Beersheba']) {
  test(`looks up coordinates using English name: ${name}`, () => {
    const coords = getCityCoordinates(name);
    assert.ok(coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lon));
  });
}

test('looks up coordinates using canonical city value', () => {
  const city = ISRAEL_CITIES[0];
  assert.deepEqual(getCityCoordinates(city.value), { lat: city.lat, lon: city.lon });
  assert.deepEqual(CITY_COORDINATES[city.value], { lat: city.lat, lon: city.lon });
});

test('unknown cities have no coordinates and preserve their display name', () => {
  assert.equal(getCityCoordinates('Unknown Place'), null);
  assert.equal(cityDisplayName('Unknown Place', 'en'), 'Unknown Place');
});

test('displays catalog labels in English and Hebrew', () => {
  const city = ISRAEL_CITIES[0];
  assert.equal(cityDisplayName(city.value, 'en'), city.en);
  assert.equal(cityDisplayName(city.value, 'he'), city.he);
});

test('mergeCities adds unknown database values once', () => {
  const merged = mergeCities(['Custom City', 'Custom City', '', null]);
  const custom = merged.filter((city) => city.value === 'Custom City');
  assert.equal(custom.length, 1);
});

test('mergeCities does not duplicate canonical values', () => {
  const canonical = ISRAEL_CITIES[0].value;
  assert.equal(mergeCities([canonical]).filter((city) => city.value === canonical).length, 1);
});
