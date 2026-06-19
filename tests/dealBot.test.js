const test = require('node:test');
const assert = require('node:assert/strict');

const {
  candidateFromPost,
  extractPrices,
  isDirectDealUrl,
  normalizeUrl,
  parseTelegramPage,
  scoreDeal,
  selectQualityDeals,
} = require('../scripts/deal-bot');

test('normalizes merchant URLs and removes tracking parameters', () => {
  assert.equal(normalizeUrl('https://store.example.co.il/item/42?utm_source=telegram&sku=8#buy'), 'https://store.example.co.il/item/42?sku=8');
  assert.equal(normalizeUrl('javascript:alert(1)'), null);
});

test('rejects aggregator and technical asset URLs', () => {
  assert.equal(isDirectDealUrl('https://www.dealabs.com/bons-plans/example'), false);
  assert.equal(isDirectDealUrl('https://cdnjs.cloudflare.com/library.js'), false);
  assert.equal(isDirectDealUrl('https://store.example.co.il/product/42'), true);
});

test('extracts current and original shekel prices', () => {
  assert.deepEqual(extractPrices('מחיר מבצע 79.90 ₪ במקום ₪ 129.90'), { prix: 79.9, prix_original: 129.9 });
  assert.deepEqual(extractPrices('Free today'), { prix: 0, prix_original: null });
});

test('parses public Telegram posts with direct merchant links', () => {
  const html = `
    <div class="tgme_widget_message_wrap">
      <div class="tgme_widget_message" data-post="israeldeals/123">
        <a class="tgme_widget_message_photo_wrap" style="background-image:url('https://cdn.example.com/deal.jpg')"></a>
        <div class="tgme_widget_message_text">מבצע מסך גיימינג 499 ₪ במקום 799 ₪ <a href="https://ksp.co.il/item/123?utm_source=tg">לקניה</a></div>
      </div>
    </div>`;
  const deals = parseTelegramPage(html, 'israeldeals');
  assert.equal(deals.length, 1);
  assert.equal(deals[0].prix, 499);
  assert.equal(deals[0].prix_original, 799);
  assert.equal(deals[0].url_source, 'https://ksp.co.il/item/123');
  assert.equal(deals[0].magasin, 'KSP');
  assert.equal(deals[0].image_url, 'https://cdn.example.com/deal.jpg');
});

test('rejects incomplete social posts and keeps complete high-quality deals', () => {
  const complete = candidateFromPost({
    text: 'מבצע אוזניות 99 ₪ במקום 199 ₪',
    links: ['https://www.bug.co.il/product/9'],
    image: 'https://cdn.example.com/headphones.jpg',
    sourceName: 'Telegram test',
    sourceUrl: 'https://t.me/test/9',
  });
  const incomplete = candidateFromPost({ text: 'מבצע מעולה', sourceName: 'Telegram test' });
  assert.ok(scoreDeal(complete) >= 65);
  assert.equal(selectQualityDeals([complete, complete, incomplete]).length, 1);
});
