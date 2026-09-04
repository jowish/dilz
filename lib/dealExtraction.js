// Reading deal details out of a page or a screenshot (P0.5).
//
// Everything here is pure: HTML in, candidate fields out. The network call and
// the vision call live in pages/api/deal-extract.js, so this file stays
// testable without either.
//
// The rule that governs the whole file: a field we are not confident about is
// left empty. An empty field costs the poster a few seconds of typing; a wrong
// one gets published and misleads people.

const LIMITS = { titre: 120, description: 900, magasin: 120 };

// Currencies we can recognise. Prices in anything other than shekels are not
// prefilled — the form has no currency field, so a "49.99" that was really
// dollars would be published as ₪49.99.
const CURRENCY_SYMBOLS = { '₪': 'ILS', $: 'USD', '€': 'EUR', '£': 'GBP' };
const CURRENCY_CODES = ['ILS', 'NIS', 'USD', 'EUR', 'GBP'];
const LOCAL_CURRENCY = 'ILS';

// Not the full HTML entity table — the ones product titles actually contain.
// Anything unrecognised is left as written rather than mangled.
const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', shy: '',
  ndash: '–', mdash: '—', hellip: '…', laquo: '«', raquo: '»',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
  deg: '°', trade: '™', reg: '®', copy: '©', middot: '·', bull: '•',
  eacute: 'é', egrave: 'è', ecirc: 'ê', agrave: 'à', acirc: 'â', ccedil: 'ç',
  uuml: 'ü', ouml: 'ö', auml: 'ä', szlig: 'ß', ntilde: 'ñ', oslash: 'ø',
  euro: '€', pound: '£', yen: '¥', cent: '¢',
};

function decodeEntities(text) {
  return String(text || '')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => safeCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => safeCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (match, name) => {
      const value = ENTITIES[name.toLowerCase()];
      return value === undefined ? match : value;
    });
}

function safeCodePoint(code) {
  if (!Number.isFinite(code) || code < 1 || code > 0x10ffff) return '';
  try { return String.fromCodePoint(code); } catch { return ''; }
}

function cleanText(value, limit) {
  const text = decodeEntities(String(value || '').replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
  return limit ? text.slice(0, limit) : text;
}

/**
 * Reads a price written any of the ways a shop might write one:
 * "₪1,299.00", "1 299,00 ₪", "ILS 1299", "$49.99", or a bare number.
 * Returns null rather than guessing when there is no number to read.
 */
function parsePrice(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) && raw >= 0 ? { amount: raw, currency: null } : null;

  const text = decodeEntities(String(raw)).trim();
  if (!text) return null;

  let currency = null;
  for (const [symbol, code] of Object.entries(CURRENCY_SYMBOLS)) {
    if (text.includes(symbol)) { currency = code; break; }
  }
  if (!currency) {
    const code = CURRENCY_CODES.find((candidate) => new RegExp(`\\b${candidate}\\b`, 'i').test(text));
    if (code) currency = code === 'NIS' ? 'ILS' : code;
  }

  // Keep digits and separators, then work out which separator is decimal.
  const numeric = text.replace(/[^\d.,\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const match = numeric.match(/\d[\d.,\s]*/);
  if (!match) return null;

  let digits = match[0].trim().replace(/\s/g, '');
  const lastComma = digits.lastIndexOf(',');
  const lastDot = digits.lastIndexOf('.');
  if (lastComma > -1 && lastDot > -1) {
    // Whichever comes last is the decimal separator.
    const decimal = lastComma > lastDot ? ',' : '.';
    const thousands = decimal === ',' ? '.' : ',';
    digits = digits.split(thousands).join('').replace(decimal, '.');
  } else if (lastComma > -1) {
    // "1,299" is thousands; "1,99" is decimal.
    digits = digits.length - lastComma === 3 && /,\d{2}$/.test(digits)
      ? digits.replace(',', '.')
      : digits.split(',').join('');
  } else if (lastDot > -1 && digits.length - lastDot > 3) {
    digits = digits.split('.').join('');
  }

  const amount = Number(digits);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return { amount, currency };
}

/** Every <script type="application/ld+json"> block, flattened through @graph. */
function collectJsonLd(html) {
  const nodes = [];
  const pattern = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    let parsed;
    try { parsed = JSON.parse(match[1].trim()); } catch { continue; }
    const queue = Array.isArray(parsed) ? [...parsed] : [parsed];
    while (queue.length) {
      const node = queue.shift();
      if (!node || typeof node !== 'object') continue;
      if (Array.isArray(node['@graph'])) queue.push(...node['@graph']);
      nodes.push(node);
    }
  }
  return nodes;
}

function nodeType(node) {
  const type = node['@type'];
  return (Array.isArray(type) ? type : [type]).filter(Boolean).map((value) => String(value).toLowerCase());
}

function firstOffer(node) {
  const offers = node.offers;
  if (!offers) return null;
  const list = Array.isArray(offers) ? offers : [offers];
  return list.find((offer) => offer && typeof offer === 'object') || null;
}

function textOf(value) {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return textOf(value[0]);
  if (value && typeof value === 'object') return textOf(value.name || value.value || value['@value']);
  return '';
}

/** All the <meta> content on the page, keyed by property/name/itemprop. */
function parseMetaTags(html) {
  const tags = {};
  const pattern = /<meta\s+([^>]+)>/gi;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    const attributes = match[1];
    const key = attributes.match(/(?:property|name|itemprop)\s*=\s*["']([^"']+)["']/i);
    const content = attributes.match(/content\s*=\s*["']([^"']*)["']/i);
    if (key && content) tags[key[1].toLowerCase()] = decodeEntities(content[1]);
  }
  return tags;
}

function absoluteUrl(value, base) {
  if (!value) return null;
  try { return new URL(value, base).toString(); } catch { return null; }
}

/** "Apple Watch SE | KSP" → "Apple Watch SE" */
function trimSiteSuffix(title, siteName) {
  if (!title) return title;
  const cleaned = title.replace(/\s*[|·—–-]\s*[^|·—–-]{2,40}$/, '').trim();
  if (siteName && title.toLowerCase().endsWith(siteName.toLowerCase()) && cleaned) return cleaned;
  return title;
}

/**
 * Pulls candidate deal fields out of a product page. Prefers structured data
 * (JSON-LD) over OpenGraph over the raw <title>, because that is the order of
 * how deliberately the shop meant each one.
 */
function extractFromHtml(html, sourceUrl) {
  const page = String(html || '');
  const meta = parseMetaTags(page);
  const nodes = collectJsonLd(page);
  const product = nodes.find((node) => nodeType(node).includes('product'))
    || nodes.find((node) => firstOffer(node))
    || null;
  const offer = product ? firstOffer(product) : null;

  const siteName = cleanText(meta['og:site_name'], LIMITS.magasin);
  const rawTitle = cleanText(product && textOf(product.name), LIMITS.titre)
    || cleanText(meta['og:title'] || meta['twitter:title'], LIMITS.titre)
    || cleanText((page.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1], LIMITS.titre);

  const priceSource = (offer && (offer.price ?? offer.lowPrice))
    ?? meta['product:price:amount']
    ?? meta['og:price:amount']
    ?? (product && textOf(product.price));
  const price = parsePrice(priceSource);

  const currencyHint = (offer && textOf(offer.priceCurrency))
    || meta['product:price:currency']
    || meta['og:price:currency']
    || null;

  const original = parsePrice(
    (offer && (offer.highPrice ?? textOf(offer.priceSpecification && offer.priceSpecification.price)))
    ?? meta['product:original_price:amount']
    ?? null
  );

  let host = '';
  try { host = new URL(sourceUrl).hostname.replace(/^www\./, ''); } catch { host = ''; }

  return {
    titre: trimSiteSuffix(rawTitle, siteName),
    description: cleanText(
      (product && textOf(product.description)) || meta['og:description'] || meta.description,
      LIMITS.description
    ),
    prix: price ? price.amount : null,
    prix_original: original ? original.amount : null,
    currency: normalizeCurrency((price && price.currency) || currencyHint),
    magasin: siteName
      || cleanText(product && textOf(product.brand), LIMITS.magasin)
      || host,
    image_url: absoluteUrl(meta['og:image'] || meta['twitter:image'] || (product && textOf(product.image)), sourceUrl),
    url_source: sourceUrl || null,
    host,
  };
}

function normalizeCurrency(value) {
  if (!value) return null;
  const text = String(value).trim().toUpperCase();
  if (CURRENCY_SYMBOLS[text]) return CURRENCY_SYMBOLS[text];
  if (text === 'NIS') return LOCAL_CURRENCY;
  return CURRENCY_CODES.includes(text) ? text : null;
}

/** Israeli shops routinely omit the currency; elsewhere, omitting it is a guess. */
function priceIsTrustworthy(currency, host) {
  if (currency === LOCAL_CURRENCY) return true;
  if (currency) return false;
  return /\.il$/i.test(String(host || ''));
}

/**
 * Turns raw candidates into the fields the form can actually take, dropping
 * anything we would only be guessing at, and reporting what was left out.
 */
function normalizeExtraction(raw = {}) {
  const fields = {};
  const warnings = [];

  const titre = cleanText(raw.titre, LIMITS.titre);
  if (titre.length >= 3) fields.titre = titre;

  const description = cleanText(raw.description, LIMITS.description);
  if (description.length >= 10) fields.description = description;

  const magasin = cleanText(raw.magasin, LIMITS.magasin);
  if (magasin) fields.magasin = magasin;

  const price = typeof raw.prix === 'number' ? raw.prix : null;
  if (price !== null && price >= 0) {
    if (priceIsTrustworthy(raw.currency, raw.host)) {
      fields.prix = price;
      const original = typeof raw.prix_original === 'number' ? raw.prix_original : null;
      // An "old price" at or below the current one is a misread, not a discount.
      if (original !== null && original > price) fields.prix_original = original;
    } else {
      warnings.push('price_currency');
    }
  }

  if (raw.url_source) {
    fields.url_source = raw.url_source;
    // A deal read off a shop's page is an online deal until the poster says
    // otherwise; they can flip it back on Review.
    fields.onlineMode = 'online';
  } else if (raw.online === true) {
    fields.onlineMode = 'online';
  }
  if (raw.image_url) fields.image_url = raw.image_url;

  return { fields, warnings };
}

/**
 * The page and the screenshot can each know things the other does not. The page
 * wins on conflicts: it is structured data straight from the shop, while the
 * screenshot has been through OCR.
 */
function mergeExtractions(fromUrl = {}, fromImage = {}) {
  const merged = { ...fromImage };
  for (const [key, value] of Object.entries(fromUrl)) {
    if (value !== null && value !== undefined && value !== '') merged[key] = value;
  }
  return merged;
}

/** Only fills blanks — anything the poster already typed is theirs. */
function applyExtraction(form = {}, fields = {}) {
  const next = { ...form };
  const filled = [];
  for (const [key, value] of Object.entries(fields)) {
    if (value === null || value === undefined || value === '') continue;
    if (!(key in next)) continue;
    const current = next[key];
    const isBlank = current === '' || current === null || current === undefined;
    // onlineMode always holds a value, so it is only overridden from its default.
    if (key === 'onlineMode' ? current === 'store' && value === 'online' : isBlank) {
      next[key] = typeof value === 'number' ? String(value) : value;
      filled.push(key);
    }
  }
  return { form: next, filled };
}

module.exports = {
  LIMITS,
  LOCAL_CURRENCY,
  decodeEntities,
  cleanText,
  parsePrice,
  collectJsonLd,
  parseMetaTags,
  extractFromHtml,
  normalizeCurrency,
  priceIsTrustworthy,
  normalizeExtraction,
  mergeExtractions,
  applyExtraction,
};
