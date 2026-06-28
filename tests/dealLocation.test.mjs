import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDealGpsUrl } from '../lib/dealLocation.js';

test('GPS URL uses exact coordinates when available', () => {
  assert.equal(
    buildDealGpsUrl({ latitude: 32.0853, longitude: 34.7818, adresse: 'Dizengoff 1, Tel Aviv' }),
    'https://www.google.com/maps/search/?api=1&query=32.0853%2C34.7818'
  );
});

test('GPS URL falls back to the complete address', () => {
  assert.equal(
    buildDealGpsUrl({ adresse: 'Dizengoff 1, Tel Aviv, Israel' }),
    'https://www.google.com/maps/search/?api=1&query=Dizengoff%201%2C%20Tel%20Aviv%2C%20Israel'
  );
});

test('GPS URL is empty when no location is available', () => {
  assert.equal(buildDealGpsUrl({}), '');
  assert.equal(buildDealGpsUrl({ latitude: 'bad', longitude: 34.7, adresse: '   ' }), '');
});
