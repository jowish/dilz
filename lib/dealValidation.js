const { DEAL_CATEGORIES: DEAL_CATEGORY_LIST } = require('./dealCategories');

const DEAL_CATEGORIES = new Set(DEAL_CATEGORY_LIST);

const LIMITS = {
  title: 160,
  description: 2000,
  store: 120,
  city: 120,
  address: 300,
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

function normalizeDealImageUrls(values, primaryUrl = null) {
  const candidates = Array.isArray(values) ? values : [];
  const normalized = [primaryUrl, ...candidates]
    .map((value) => normalizeHttpUrl(value, LIMITS.imageUrl))
    .filter(Boolean);
  return [...new Set(normalized)].slice(0, 3);
}

function normalizePrice(value) {
  if (value === '' || value == null) return null;
  const price = Number(value);
  return Number.isFinite(price) ? price : null;
}

function normalizeCoordinate(value) {
  if (value === '' || value == null) return null;
  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate : null;
}

function dateOnlyPart(value) {
  const text = cleanText(value, 32);
  const match = text.match(/^(\d{4}-\d{2}-\d{2})(?:$|[T\s])/);
  return match ? match[1] : null;
}

function isDateOnly(value) {
  return typeof value === 'string' && dateOnlyPart(value) === value;
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
  const adresse = cleanText(input.adresse, LIMITS.address) || null;
  const latitude = normalizeCoordinate(input.latitude);
  const longitude = normalizeCoordinate(input.longitude);
  const hasLatitude = input.latitude !== '' && input.latitude != null;
  const hasLongitude = input.longitude !== '' && input.longitude != null;
  const prix = normalizePrice(input.prix);
  const prixOriginal = normalizePrice(input.prix_original);
  const hasPrixOriginal = input.prix_original !== '' && input.prix_original != null;
  const imageUrl = normalizeHttpUrl(input.image_url, LIMITS.imageUrl);
  const sourceUrl = normalizeHttpUrl(input.url_source, LIMITS.sourceUrl);
  const categorie = DEAL_CATEGORIES.has(input.categorie) ? input.categorie : null;
  const rawDateDebut = cleanText(input.date_debut, 32);
  const rawDateFin = cleanText(input.date_fin, 32);
  const dateDebut = dateOnlyPart(rawDateDebut);
  const dateFin = dateOnlyPart(rawDateFin);
  const errors = [];

  if (!titre) errors.push('Title is required.');
  if (!magasin) errors.push('Store / place is required.');
  if (prix == null || prix < 0 || prix > 10000000) errors.push('Price must be zero or greater.');
  if (hasPrixOriginal && (prixOriginal == null || prixOriginal < 0 || prixOriginal > 10000000)) {
    errors.push('Original price is invalid.');
  }
  if (hasPrixOriginal && prixOriginal != null && prix != null && prixOriginal < prix) {
    errors.push('Original price must be equal to or greater than current price.');
  }
  if (requireImage && !imageUrl) errors.push('A valid image_url is required.');
  if (input.url_source && !sourceUrl) errors.push('Source URL must use http or https.');
  if (input.image_url && !imageUrl) errors.push('Image URL must use http or https.');
  if (rawDateDebut && !dateDebut) errors.push('Start date is invalid.');
  if (rawDateFin && !dateFin) errors.push('End date is invalid.');
  if (dateDebut && dateFin && dateDebut > dateFin) errors.push('End date must be after start date.');
  if ((latitude == null) !== (longitude == null)) errors.push('Latitude and longitude must be provided together.');
  if ((hasLatitude && latitude == null) || (hasLongitude && longitude == null)) errors.push('Deal coordinates must be numeric.');
  if (latitude != null && (latitude < 29.3 || latitude > 33.6 || longitude < 34.1 || longitude > 35.95)) {
    errors.push('Deal coordinates must be in Israel.');
  }

  return {
    errors,
    value: {
      titre,
      description,
      prix,
      prix_original: prixOriginal,
      magasin,
      ville,
      adresse,
      latitude,
      longitude,
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
  dateOnlyPart,
  dateOnlyInTimeZone,
  isDateOnly,
  normalizeDealInput,
  normalizeDealImageUrls,
  normalizeHttpUrl,
};
