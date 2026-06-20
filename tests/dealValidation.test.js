const test = require('node:test');
const assert = require('node:assert/strict');

const {
  clampLimit,
  dateOnlyPart,
  dateOnlyInTimeZone,
  isDateOnly,
  normalizeDealInput,
  normalizeDealImageUrls,
  normalizeHttpUrl,
} = require('../lib/dealValidation');

test('normalizes a valid deal payload', () => {
  const result = normalizeDealInput({
    titre: '  Coffee deal  ',
    description: ' Half price ',
    prix: '12.50',
    prix_original: '25',
    magasin: ' Cafe ',
    ville: ' Tel Aviv ',
    categorie: 'Food',
    image_url: 'https://example.com/deal.jpg',
    url_source: 'https://example.com/deal',
    date_debut: '2026-06-15',
    date_fin: '2026-06-20',
    adresse: '10 Dizengoff St',
    latitude: 32.081,
    longitude: 34.775,
  });

  assert.deepEqual(result.errors, []);
  assert.equal(result.value.titre, 'Coffee deal');
  assert.equal(result.value.prix, 12.5);
  assert.equal(result.value.magasin, 'Cafe');
  assert.equal(result.value.categorie, 'Food');
  assert.equal(result.value.adresse, '10 Dizengoff St');
  assert.equal(result.value.latitude, 32.081);
});

test('rejects incomplete or out-of-country deal coordinates', () => {
  const incomplete = normalizeDealInput({ titre: 'Deal', prix: 10, magasin: 'Store', image_url: 'https://example.com/a.jpg', latitude: 32 });
  assert.ok(incomplete.errors.includes('Latitude and longitude must be provided together.'));

  const outsideIsrael = normalizeDealInput({ titre: 'Deal', prix: 10, magasin: 'Store', image_url: 'https://example.com/a.jpg', latitude: 48.85, longitude: 2.35 });
  assert.ok(outsideIsrael.errors.includes('Deal coordinates must be in Israel.'));
});

test('rejects invalid prices, protocols, and date ranges', () => {
  const result = normalizeDealInput({
    titre: 'Deal',
    prix: -1,
    magasin: 'Store',
    image_url: 'javascript:alert(1)',
    url_source: 'ftp://example.com',
    date_debut: '2026-06-20',
    date_fin: '2026-06-15',
  });

  assert.ok(result.errors.includes('Price must be zero or greater.'));
  assert.ok(result.errors.includes('A valid image_url is required.'));
  assert.ok(result.errors.includes('Source URL must use http or https.'));
  assert.ok(result.errors.includes('End date must be after start date.'));
});

test('allows an edit without replacing an existing image', () => {
  const result = normalizeDealInput(
    { titre: 'Deal', prix: 10, magasin: 'Store' },
    { requireImage: false }
  );

  assert.deepEqual(result.errors, []);
  assert.equal(result.value.image_url, null);
});

test('normalizes only http and https URLs', () => {
  assert.equal(normalizeHttpUrl('mailto:test@example.com', 100), null);
  assert.equal(normalizeHttpUrl('https://example.com/a', 100), 'https://example.com/a');
});

test('normalizes and limits deal galleries to three unique images', () => {
  assert.deepEqual(
    normalizeDealImageUrls(
      ['https://example.com/2.jpg', 'javascript:bad', 'https://example.com/1.jpg', 'https://example.com/3.jpg', 'https://example.com/4.jpg'],
      'https://example.com/1.jpg'
    ),
    ['https://example.com/1.jpg', 'https://example.com/2.jpg', 'https://example.com/3.jpg']
  );
});

test('clamps public API limits', () => {
  assert.equal(clampLimit('25'), 25);
  assert.equal(clampLimit('999'), 200);
  assert.equal(clampLimit('invalid'), 50);
  assert.equal(clampLimit('999', 200, 500), 500);
  assert.equal(clampLimit(undefined, 200, 500), 200);
});

test('handles date-only values without timestamp comparisons', () => {
  assert.equal(isDateOnly('2026-06-17'), true);
  assert.equal(isDateOnly('2026-06-17T00:00:00Z'), false);
  assert.equal(dateOnlyPart('2026-06-17T00:00:00+00:00'), '2026-06-17');
  assert.equal(dateOnlyPart('not-a-date'), null);
  assert.equal(dateOnlyInTimeZone(new Date('2026-06-17T21:30:00.000Z'), 'Asia/Jerusalem'), '2026-06-18');
});
