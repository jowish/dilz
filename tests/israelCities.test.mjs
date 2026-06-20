import test from 'node:test';
import assert from 'node:assert/strict';
import { CITY_COORDINATES, ISRAEL_CITIES, cityDisplayName, filterCityOptions, getCityCoordinates, localizedCityOptions, mergeCities } from '../lib/israelCities.js';

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

test('mergeCities does not duplicate a catalog city supplied in English', () => {
  assert.equal(mergeCities(['Tel Aviv']).filter((city) => city.en === 'Tel Aviv').length, 1);
});

test('every catalog city has an English label without Hebrew characters', () => {
  for (const city of localizedCityOptions([], 'en')) {
    assert.equal(/[\u0590-\u05ff]/.test(city.label), false, city.label);
  }
});

test('every catalog city displays its Hebrew label in Hebrew mode', () => {
  for (const city of localizedCityOptions([], 'he')) {
    assert.equal(city.label, city.he);
    assert.ok(/[\u0590-\u05ff]/.test(city.label), city.en);
  }
});

test('English mode excludes untranslated Hebrew-only database values', () => {
  const options = localizedCityOptions(['עיר ללא תרגום'], 'en');
  assert.equal(options.some((city) => /[\u0590-\u05ff]/.test(city.label)), false);
});

test('Hebrew mode excludes untranslated English-only database values', () => {
  const options = localizedCityOptions(['Untranslated City'], 'he');
  assert.equal(options.some((city) => /[A-Za-z]/.test(city.label)), false);
});

test('translates a database-only Hebrew city in English mode', () => {
  const options = localizedCityOptions(['רמת השרון'], 'en');
  assert.equal(options.find((city) => city.value === 'רמת השרון')?.label, 'Ramat HaSharon');
  assert.equal(cityDisplayName('רמת השרון', 'en'), 'Ramat HaSharon');
});

test('converts a known English city back to Hebrew', () => {
  assert.equal(cityDisplayName('Tel Aviv', 'he'), 'תל אביב');
  assert.equal(cityDisplayName('Jerusalem', 'he'), 'ירושלים');
});

test('sorts English city options alphabetically by their displayed label', () => {
  const labels = localizedCityOptions([], 'en').map((city) => city.label);
  const expected = [...labels].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
  assert.deepEqual(labels, expected);
});

test('sorts Hebrew city options using the Hebrew locale', () => {
  const labels = localizedCityOptions([], 'he').map((city) => city.label);
  const expected = [...labels].sort((a, b) => a.localeCompare(b, 'he', { sensitivity: 'base' }));
  assert.deepEqual(labels, expected);
});

test('search matches both English and Hebrew city names', () => {
  const englishResults = filterCityOptions(localizedCityOptions([], 'en'), { search: 'ירושלים', lang: 'en' });
  const hebrewResults = filterCityOptions(localizedCityOptions([], 'he'), { search: 'Jerusalem', lang: 'he' });
  assert.equal(englishResults[0]?.label, 'Jerusalem');
  assert.equal(hebrewResults[0]?.label, 'ירושלים');
});

test('search filters city options without changing their display language', () => {
  const english = filterCityOptions(localizedCityOptions([], 'en'), { search: 'aviv', lang: 'en' });
  const hebrew = filterCityOptions(localizedCityOptions([], 'he'), { search: 'Tel Aviv', lang: 'he' });
  assert.deepEqual(english.map((city) => city.label), ['Tel Aviv']);
  assert.equal(hebrew.length, 1);
  assert.ok(/[\u0590-\u05ff]/.test(hebrew[0].label));
});
