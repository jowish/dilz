const DEAL_CATEGORIES = new Set(['Food', 'Tech', 'Fashion', 'Activities', 'Online']);

const LIMITS = {
  title: 160,
  description: 2000,
  store: 120,
  city: 120,
  imageUrl: 2000,
  sourceUrl: 2000,
};

function cleanText(value, maxLength) {
  if (value == null) return '';
  return String(value).trim().slice(0, maxLength);
}

function normalizeHttpUrl(value, maxLength) {
  const text = cleanText(value, maxLength);
  if (!text) return null;

  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function normalizePrice(value) {
  if (value === '' || value == null) return null;
  const price = Number(value);
  return Number.isFinite(price) ? price : null;
}

function isDateOnly(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function dateOnlyInTimeZone(date = new Date(), timeZone = 'Asia/Jerusalem') {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function normalizeDealInput(input = {}, { requireImage = true } = {}) {
  const titre = cleanText(input.titre, LIMITS.title);
  const description = cleanText(input.description, LIMITS.description) || null;
  const magasin = cleanText(input.magasin, LIMITS.store);
  const ville = cleanText(input.ville, LIMITS.city) || null;
  const prix = normalizePrice(input.prix);
  const prixOriginal = normalizePrice(input.prix_original);
  const imageUrl = normalizeHttpUrl(input.image_url, LIMITS.imageUrl);
  const sourceUrl = normalizeHttpUrl(input.url_source, LIMITS.sourceUrl);
  const categorie = DEAL_CATEGORIES.has(input.categorie) ? input.categorie : null;
  const dateDebut = cleanText(input.date_debut, 10) || null;
  const dateFin = cleanText(input.date_fin, 10) || null;
  const errors = [];

  if (!titre) errors.push('Title is required.');
  if (!magasin) errors.push('Store / place is required.');
  if (prix == null || prix < 0 || prix > 10000000) errors.push('Price must be zero or greater.');
  if (prixOriginal != null && (prixOriginal < 0 || prixOriginal > 10000000)) {
    errors.push('Original price is invalid.');
  }
  if (requireImage && !imageUrl) errors.push('A valid image_url is required.');
  if (input.url_source && !sourceUrl) errors.push('Source URL must use http or https.');
  if (input.image_url && !imageUrl) errors.push('Image URL must use http or https.');
  if (dateDebut && !isDateOnly(dateDebut)) errors.push('Start date is invalid.');
  if (dateFin && !isDateOnly(dateFin)) errors.push('End date is invalid.');
  if (dateDebut && dateFin && dateDebut > dateFin) errors.push('End date must be after start date.');

  return {
    errors,
    value: {
      titre,
      description,
      prix,
      prix_original: prixOriginal,
      magasin,
      ville,
      categorie,
      url_source: sourceUrl,
      image_url: imageUrl,
      date_debut: dateDebut,
      date_fin: dateFin,
    },
  };
}

function clampLimit(value, fallback = 50, maximum = 200) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, maximum);
}

module.exports = {
  DEAL_CATEGORIES,
  LIMITS,
  clampLimit,
  dateOnlyInTimeZone,
  isDateOnly,
  normalizeDealInput,
  normalizeHttpUrl,
};
