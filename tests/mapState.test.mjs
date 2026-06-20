import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMapUrl, toggleCityFilter } from '../lib/mapState.js';

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
