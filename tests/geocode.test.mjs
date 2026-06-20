import test from 'node:test';
import assert from 'node:assert/strict';
import handler, { inIsrael, locationPayload, simplifyAddress } from '../pages/api/geocode.js';

function responseRecorder() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
    end() { this.ended = true; return this; },
  };
}

for (const [lat, lon, expected] of [[29.3, 34.1, true], [33.6, 35.95, true], [32.0853, 34.7818, true], [29.29, 34.8, false], [32, 36, false], [NaN, 35, false], ['32', 35, false]]) {
  test(`Israel bounds ${String(lat)},${String(lon)} => ${expected}`, () => {
    assert.equal(inIsrael(lat, lon), expected);
  });
}

test('maps a Nominatim payload to the public location contract', () => {
  assert.deepEqual(locationPayload({ display_name: '10 Street, Tel Aviv', lat: '32.1', lon: '34.8', address: { city: 'Tel Aviv' } }), {
    address: '10 Street, Tel Aviv', city: 'Tel Aviv', latitude: 32.1, longitude: 34.8,
  });
});

for (const [address, expected] of [['10 Dizengoff Street, Tel Aviv', '10 Dizengoff, Tel Aviv'], ['1 Main Rd. Haifa', '1 Main Haifa'], ['2 Park Avenue Jerusalem', '2 Park Jerusalem'], ['דרך השלום 10', 'דרך השלום 10']]) {
  test(`simplifies address: ${address}`, () => assert.equal(simplifyAddress(address), expected));
}

test('rejects non-GET methods', async () => {
  const res = responseRecorder();
  await handler({ method: 'POST', query: {} }, res);
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.Allow, 'GET');
});

test('rejects coordinates outside Israel without calling fetch', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('fetch should not run'); };
  try {
    const res = responseRecorder();
    await handler({ method: 'GET', query: { lat: '48.85', lon: '2.35' } }, res);
    assert.equal(res.statusCode, 400);
    assert.match(res.body.erreur, /Israel/);
  } finally { globalThis.fetch = originalFetch; }
});

test('reverse geocoding returns a normalized location', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ display_name: 'Tel Aviv', lat: '32.08', lon: '34.78', address: { city: 'Tel Aviv' } }) });
  try {
    const res = responseRecorder();
    await handler({ method: 'GET', query: { lat: '32.08', lon: '34.78', lang: 'en' } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.city, 'Tel Aviv');
  } finally { globalThis.fetch = originalFetch; }
});

test('forward geocoding retries with a simplified address', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return { ok: true, json: async () => calls.length === 1 ? [] : [{ display_name: 'Tel Aviv', lat: '32.08', lon: '34.78', address: { town: 'Tel Aviv' } }] };
  };
  try {
    const res = responseRecorder();
    await handler({ method: 'GET', query: { q: '10 Main Street Tel Aviv', lang: 'en' } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(calls.length, 2);
    assert.ok(calls[1].includes('10+Main+Tel+Aviv'));
  } finally { globalThis.fetch = originalFetch; }
});

test('forward geocoding rejects an empty result', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => [] });
  try {
    const res = responseRecorder();
    await handler({ method: 'GET', query: { q: 'Unknown address' } }, res);
    assert.equal(res.statusCode, 404);
  } finally { globalThis.fetch = originalFetch; }
});

test('geocoding provider failures become a 502 response', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('offline'); };
  try {
    const res = responseRecorder();
    await handler({ method: 'GET', query: { lat: '32', lon: '35' } }, res);
    assert.equal(res.statusCode, 502);
    assert.equal(res.body.erreur, 'offline');
  } finally { globalThis.fetch = originalFetch; }
});
