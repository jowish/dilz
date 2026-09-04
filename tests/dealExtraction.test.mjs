import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  parsePrice,
  extractFromHtml,
  normalizeExtraction,
  mergeExtractions,
  applyExtraction,
  priceIsTrustworthy,
  parseMetaTags,
  collectJsonLd,
} = require('../lib/dealExtraction.js');

test('prices are read the way shops actually write them', () => {
  assert.deepEqual(parsePrice('₪1,299.00'), { amount: 1299, currency: 'ILS' });
  assert.deepEqual(parsePrice('1 299,00 ₪'), { amount: 1299, currency: 'ILS' });
  assert.deepEqual(parsePrice('ILS 1299'), { amount: 1299, currency: 'ILS' });
  assert.deepEqual(parsePrice('$49.99'), { amount: 49.99, currency: 'USD' });
  assert.deepEqual(parsePrice('19,90 €'), { amount: 19.9, currency: 'EUR' });
  assert.deepEqual(parsePrice('799'), { amount: 799, currency: null });
  assert.deepEqual(parsePrice(249.5), { amount: 249.5, currency: null });
});

test('a price that is not there is null, never zero', () => {
  assert.equal(parsePrice(''), null);
  assert.equal(parsePrice(null), null);
  assert.equal(parsePrice(undefined), null);
  assert.equal(parsePrice('call for price'), null);
  assert.equal(parsePrice('₪'), null);
});

test('structured product data is read out of a page', () => {
  const html = `<html><head>
    <meta property="og:site_name" content="KSP">
    <meta property="og:image" content="/img/watch.jpg">
    <title>Apple Watch SE 44mm | KSP</title>
    <script type="application/ld+json">
      {"@context":"https://schema.org","@type":"Product","name":"Apple Watch SE 44mm",
       "description":"GPS, aluminium case, midnight band.",
       "offers":{"@type":"Offer","price":"999.00","priceCurrency":"ILS","highPrice":"1299"}}
    </script></head><body></body></html>`;

  const raw = extractFromHtml(html, 'https://ksp.co.il/web/item/12345');
  assert.equal(raw.titre, 'Apple Watch SE 44mm');
  assert.equal(raw.prix, 999);
  assert.equal(raw.prix_original, 1299);
  assert.equal(raw.currency, 'ILS');
  assert.equal(raw.magasin, 'KSP');
  assert.equal(raw.image_url, 'https://ksp.co.il/img/watch.jpg');
  assert.match(raw.description, /aluminium case/);
});

test('a page with only OpenGraph still yields a deal', () => {
  const html = `<html><head>
    <meta property="og:title" content="Sneakers - 50% off">
    <meta property="og:description" content="Limited sizes remaining.">
    <meta property="product:price:amount" content="149.90">
    <meta property="product:price:currency" content="ILS">
  </head></html>`;
  const raw = extractFromHtml(html, 'https://terminalx.com/p/9');
  assert.equal(raw.titre, 'Sneakers - 50% off');
  assert.equal(raw.prix, 149.9);
  assert.equal(raw.magasin, 'terminalx.com');
});

test('@graph and arrays of JSON-LD are flattened', () => {
  const html = `<script type="application/ld+json">
    {"@graph":[{"@type":"WebPage"},{"@type":["Product"],"name":"Kettle","offers":{"price":89,"priceCurrency":"ILS"}}]}
  </script>`;
  assert.equal(collectJsonLd(html).length, 3);
  assert.equal(extractFromHtml(html, 'https://shop.co.il/x').titre, 'Kettle');
});

test('malformed JSON-LD and entities do not break the read', () => {
  const html = `<script type="application/ld+json">{ not json </script>
    <meta property="og:title" content="Caf&eacute; beans &amp; grinder">`;
  const raw = extractFromHtml(html, 'https://shop.co.il/x');
  assert.equal(raw.titre, 'Café beans & grinder');
});

test('meta tags are read regardless of attribute order', () => {
  const tags = parseMetaTags(`<meta content="hello" property="og:title"><meta name="description" content="x">`);
  assert.equal(tags['og:title'], 'hello');
  assert.equal(tags.description, 'x');
});

test('a price in a foreign currency is left empty rather than published as shekels', () => {
  const { fields, warnings } = normalizeExtraction({ titre: 'Headphones', prix: 49.99, currency: 'USD', host: 'amazon.com' });
  assert.equal(fields.titre, 'Headphones');
  assert.equal(fields.prix, undefined);
  assert.deepEqual(warnings, ['price_currency']);
});

test('an unlabelled price is trusted on an Israeli shop and not elsewhere', () => {
  assert.equal(priceIsTrustworthy(null, 'ksp.co.il'), true);
  assert.equal(priceIsTrustworthy(null, 'example.com'), false);
  assert.equal(priceIsTrustworthy('ILS', 'example.com'), true);
  assert.equal(priceIsTrustworthy('EUR', 'ksp.co.il'), false);

  assert.equal(normalizeExtraction({ prix: 99, currency: null, host: 'zap.co.il' }).fields.prix, 99);
  assert.equal(normalizeExtraction({ prix: 99, currency: null, host: 'example.com' }).fields.prix, undefined);
});

test('an old price that is not actually higher is dropped', () => {
  const cheaper = normalizeExtraction({ prix: 100, prix_original: 80, currency: 'ILS' }).fields;
  assert.equal(cheaper.prix_original, undefined);
  const real = normalizeExtraction({ prix: 100, prix_original: 150, currency: 'ILS' }).fields;
  assert.equal(real.prix_original, 150);
});

test('scraps too short to be a title or description are left out', () => {
  const { fields } = normalizeExtraction({ titre: 'a', description: 'short' });
  assert.equal(fields.titre, undefined);
  assert.equal(fields.description, undefined);
});

test('a deal read from a link is marked online, and a photo can say so too', () => {
  assert.equal(normalizeExtraction({ url_source: 'https://ksp.co.il/x' }).fields.onlineMode, 'online');
  assert.equal(normalizeExtraction({ online: true }).fields.onlineMode, 'online');
  assert.equal(normalizeExtraction({ online: null }).fields.onlineMode, undefined);
});

test('the page wins over the screenshot, but only where it knows something', () => {
  const merged = mergeExtractions(
    { titre: 'From page', prix: null, magasin: '' },
    { titre: 'From photo', prix: 250, magasin: 'Photo store' }
  );
  assert.equal(merged.titre, 'From page');
  assert.equal(merged.prix, 250);
  assert.equal(merged.magasin, 'Photo store');
});

test('extraction fills blanks and never overwrites what the poster typed', () => {
  const form = { titre: 'My own title', description: '', prix: '', magasin: '', onlineMode: 'store' };
  const { form: next, filled } = applyExtraction(form, {
    titre: 'Extracted title',
    description: 'Extracted description',
    prix: 999,
    magasin: 'KSP',
    onlineMode: 'online',
  });
  assert.equal(next.titre, 'My own title');
  assert.equal(next.description, 'Extracted description');
  assert.equal(next.prix, '999', 'numbers become strings for the text inputs');
  assert.equal(next.magasin, 'KSP');
  assert.equal(next.onlineMode, 'online');
  assert.deepEqual(filled.sort(), ['description', 'magasin', 'onlineMode', 'prix']);
});

test('extraction never invents form keys that do not exist', () => {
  const { form } = applyExtraction({ titre: '' }, { titre: 'x', image_url: 'https://x/y.jpg', bogus: 1 });
  assert.deepEqual(Object.keys(form), ['titre']);
});

test('a poster who chose In-store is not flipped to Online by the extractor', () => {
  const { form } = applyExtraction({ onlineMode: 'online' }, { onlineMode: 'store' });
  assert.equal(form.onlineMode, 'online');
});
