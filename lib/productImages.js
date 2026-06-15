const SHUFERSAL_DEFAULT_IMAGE = '/product_images/default/';

function isGlobalTradeItemNumber(value) {
  return /^\d{8,14}$/.test(String(value || '').trim());
}

function parseMetaContent(html, property) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const propertyFirst = new RegExp(
    `<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["']`,
    'i'
  );
  const contentFirst = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escaped}["']`,
    'i'
  );
  return html.match(propertyFirst)?.[1] || html.match(contentFirst)?.[1] || null;
}

function extractShufersalImage(html, barcode, finalUrl = '') {
  if (!html || !String(finalUrl).includes(`/P_${barcode}`)) return null;
  const image = parseMetaContent(html, 'og:image');
  if (!image || image.includes(SHUFERSAL_DEFAULT_IMAGE)) return null;

  try {
    const url = new URL(image);
    const allowed = url.hostname === 'res.cloudinary.com'
      || url.hostname === 'media.shufersal.co.il'
      || url.hostname.endsWith('.shufersal.co.il');
    return url.protocol === 'https:' && allowed ? url.toString() : null;
  } catch {
    return null;
  }
}

function extractOpenFoodFactsImages(payload) {
  const products = Array.isArray(payload?.products) ? payload.products : [];
  return new Map(
    products
      .map(product => [
        String(product.code || ''),
        product.image_front_url || product.image_url || null,
      ])
      .filter(([, image]) => typeof image === 'string' && image.startsWith('https://'))
  );
}

module.exports = {
  extractOpenFoodFactsImages,
  extractShufersalImage,
  isGlobalTradeItemNumber,
};
