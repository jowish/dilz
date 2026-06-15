const test = require('node:test');
const assert = require('node:assert/strict');

const {
  extractOpenFoodFactsImages,
  extractShufersalImage,
  isGlobalTradeItemNumber,
} = require('../lib/productImages');

test('recognizes global trade item numbers and rejects internal produce codes', () => {
  assert.equal(isGlobalTradeItemNumber('7290110116323'), true);
  assert.equal(isGlobalTradeItemNumber('2023'), false);
  assert.equal(isGlobalTradeItemNumber('abc'), false);
});

test('extracts a real Shufersal product image', () => {
  const html = '<meta property="og:image" content="https://res.cloudinary.com/shufersal/image/upload/product.png">';
  assert.equal(
    extractShufersalImage(html, '7290110116323', 'https://www.shufersal.co.il/online/he/item/p/P_7290110116323'),
    'https://res.cloudinary.com/shufersal/image/upload/product.png'
  );
});

test('rejects Shufersal default and mismatched pages', () => {
  const html = '<meta property="og:image" content="https://media.shufersal.co.il/product_images/default/M_P_default.png">';
  assert.equal(extractShufersalImage(html, '12345678', 'https://www.shufersal.co.il/online/he/p/P_12345678'), null);
  assert.equal(extractShufersalImage(html, '12345678', 'https://www.shufersal.co.il/online/he/'), null);
});

test('maps Open Food Facts images by exact barcode', () => {
  const images = extractOpenFoodFactsImages({
    products: [
      { code: '12345678', image_front_url: 'https://images.openfoodfacts.org/front.jpg' },
      { code: '87654321' },
    ],
  });
  assert.equal(images.get('12345678'), 'https://images.openfoodfacts.org/front.jpg');
  assert.equal(images.has('87654321'), false);
});
