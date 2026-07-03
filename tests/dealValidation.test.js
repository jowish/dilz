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

function validDeal(overrides = {}) {
  return {
    titre: 'Valid deal', prix: 10, magasin: 'Store', categorie: 'Food',
    image_url: 'https://example.com/deal.jpg', ...overrides,
  };
}

for (const field of ['titre', 'magasin']) {
  test(`requires ${field}`, () => {
    const result = normalizeDealInput(validDeal({ [field]: '   ' }));
    assert.ok(result.errors.some((error) => error.toLowerCase().includes(field === 'titre' ? 'title' : 'store')));
  });
}

for (const price of [-1, 10000001, 'abc', Infinity, NaN]) {
  test(`rejects invalid current price ${String(price)}`, () => {
    assert.ok(normalizeDealInput(validDeal({ prix: price })).errors.some((error) => error.includes('Price')));
  });
}

for (const price of [0, 0.01, 9999999, '12.5']) {
  test(`accepts current price ${String(price)}`, () => {
    const result = normalizeDealInput(validDeal({ prix: price }));
    assert.deepEqual(result.errors, []);
    assert.equal(result.value.prix, Number(price));
  });
}

for (const price of [-1, 10000001, 'invalid']) {
  test(`rejects invalid original price ${String(price)}`, () => {
    assert.ok(normalizeDealInput(validDeal({ prix_original: price })).errors.includes('Original price is invalid.'));
  });
}

test('old price is optional and must not be below the current price', () => {
  assert.deepEqual(normalizeDealInput(validDeal({ prix: 20, prix_original: '' })).errors, []);
  assert.deepEqual(normalizeDealInput(validDeal({ prix: 20, prix_original: 20 })).errors, []);
  assert.deepEqual(normalizeDealInput(validDeal({ prix: 20, prix_original: 30 })).errors, []);
  assert.ok(normalizeDealInput(validDeal({ prix: 20, prix_original: 10 })).errors.includes('Original price must be equal to or greater than current price.'));
});

test('truncates user-controlled text to schema limits', () => {
  const result = normalizeDealInput(validDeal({ titre: 't'.repeat(200), description: 'd'.repeat(2500), magasin: 'm'.repeat(150), ville: 'v'.repeat(150), adresse: 'a'.repeat(350) }));
  assert.equal(result.value.titre.length, 160);
  assert.equal(result.value.description.length, 2000);
  assert.equal(result.value.magasin.length, 120);
  assert.equal(result.value.ville.length, 120);
  assert.equal(result.value.adresse.length, 300);
});

test('normalizes blank optional fields to null', () => {
  const result = normalizeDealInput(validDeal({ description: ' ', ville: '', adresse: ' ', prix_original: '', url_source: '' }));
  assert.equal(result.value.description, null);
  assert.equal(result.value.ville, null);
  assert.equal(result.value.adresse, null);
  assert.equal(result.value.prix_original, null);
  assert.equal(result.value.url_source, null);
});

for (const category of ['Food', 'Supermarket', 'Restaurants', 'Tech', 'Home', 'Beauty', 'Health', 'Baby', 'Fashion', 'Sports', 'Travel', 'Activities', 'Services', 'Online', 'Other']) {
  test(`accepts category ${category}`, () => assert.equal(normalizeDealInput(validDeal({ categorie: category })).value.categorie, category));
}

for (const category of ['food', '', null]) {
  test(`normalizes unsupported category ${String(category)} to null`, () => assert.equal(normalizeDealInput(validDeal({ categorie: category })).value.categorie, null));
}

test('normalizes timestamps to date-only values', () => {
  const result = normalizeDealInput(validDeal({ date_debut: '2026-06-20T12:30:00Z', date_fin: '2026-06-21 08:00:00' }));
  assert.equal(result.value.date_debut, '2026-06-20');
  assert.equal(result.value.date_fin, '2026-06-21');
});

for (const [field, value] of [['date_debut', '20/06/2026'], ['date_fin', 'tomorrow'], ['date_debut', '2026-6-1']]) {
  test(`rejects invalid ${field}: ${value}`, () => {
    assert.ok(normalizeDealInput(validDeal({ [field]: value })).errors.some((error) => error.toLowerCase().includes('date')));
  });
}

for (const [latitude, longitude] of [[29.3, 34.1], [33.6, 35.95], [32.0853, 34.7818], ['32.1', '34.8']]) {
  test(`accepts Israeli coordinates ${latitude},${longitude}`, () => {
    assert.deepEqual(normalizeDealInput(validDeal({ latitude, longitude })).errors, []);
  });
}

for (const [latitude, longitude] of [['north', 'east'], ['32', 'east'], [NaN, NaN]]) {
  test(`rejects non-numeric coordinates ${String(latitude)},${String(longitude)}`, () => {
    assert.ok(normalizeDealInput(validDeal({ latitude, longitude })).errors.includes('Deal coordinates must be numeric.'));
  });
}

for (const url of ['javascript:alert(1)', 'ftp://example.com/a', 'mailto:test@example.com', 'not a url']) {
  test(`rejects unsafe source URL ${url}`, () => {
    assert.ok(normalizeDealInput(validDeal({ url_source: url })).errors.includes('Source URL must use http or https.'));
  });
}

test('deduplicates a primary image repeated in the gallery', () => {
  assert.deepEqual(normalizeDealImageUrls(['https://example.com/a.jpg', 'https://example.com/b.jpg'], 'https://example.com/a.jpg'), ['https://example.com/a.jpg', 'https://example.com/b.jpg']);
});

test('clampLimit respects custom fallback and maximum', () => {
  assert.equal(clampLimit(undefined, 30, 75), 30);
  assert.equal(clampLimit(76, 30, 75), 75);
  assert.equal(clampLimit(1, 30, 75), 1);
});
