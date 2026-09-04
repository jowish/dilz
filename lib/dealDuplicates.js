// Duplicate deal detection (P0.3).
//
// Deliberately no ML and no image hashing in this first version: the signals
// that actually separate a duplicate from a coincidence here are the source
// URL, the store, the title and the price. Everything is a pure function so it
// can be reasoned about and unit tested, and the same scoring runs on the
// server (which enforces it) and can be reused by the client (which explains
// it).

// Tracking parameters differ between shares of the very same page, so they
// must not stop two links from matching.
const TRACKING_PARAMS = /^(utm_|fbclid|gclid|mc_|ref|referrer|source|igshid|si$)/i;

// Words that carry no distinguishing signal in a deal title.
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'for', 'with', 'at', 'in', 'on', 'of', 'to',
  'deal', 'sale', 'offer', 'promo', 'discount', 'new',
  'ב', 'עם', 'של', 'על', 'מבצע', 'דיל', 'הנחה', 'חדש',
]);

const RECENT_WINDOW_DAYS = 60;
const PRICE_TOLERANCE = 0.1; // 10%
const TITLE_STRONG = 0.6;
const TITLE_WEAK = 0.4;

/** Comparable form of a URL: no scheme, no www, no tracking noise, no trailing slash. */
function normalizeUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  let parsed;
  try {
    parsed = new URL(value.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;

  const params = [...parsed.searchParams.entries()]
    .filter(([key]) => !TRACKING_PARAMS.test(key))
    .sort(([a], [b]) => a.localeCompare(b));
  const query = params.map(([k, v]) => `${k}=${v}`).join('&');
  const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
  const path = parsed.pathname.replace(/\/+$/, '');
  return `${host}${path}${query ? `?${query}` : ''}`;
}

function normalizeText(value) {
  if (typeof value !== 'string') return '';
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[֑-ׇ]/g, '')      // Hebrew niqqud
    .replace(/[̀-ͯ]/g, '')      // Latin diacritics
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')    // punctuation, ₪, quotes, geresh…
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeStore(value) {
  return normalizeText(value);
}

function titleTokens(value) {
  return new Set(
    normalizeText(value)
      .split(' ')
      .filter((token) => token.length >= 2 && !STOP_WORDS.has(token)),
  );
}

/** Dice coefficient over meaningful title tokens: 1 = same words, 0 = nothing shared. */
function titleSimilarity(a, b) {
  const left = titleTokens(a);
  const right = titleTokens(b);
  if (!left.size || !right.size) return 0;
  let shared = 0;
  for (const token of left) if (right.has(token)) shared += 1;
  return (2 * shared) / (left.size + right.size);
}

function toPrice(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || !value.trim()) return null;
  const n = Number(value.trim());
  return Number.isFinite(n) ? n : null;
}

/** Same price within a tolerance — two people rarely type the exact same typo. */
function priceMatches(a, b, tolerance = PRICE_TOLERANCE) {
  const left = toPrice(a);
  const right = toPrice(b);
  if (left === null || right === null) return false;
  if (left === right) return true;
  const largest = Math.max(Math.abs(left), Math.abs(right));
  if (largest === 0) return true;
  return Math.abs(left - right) / largest <= tolerance;
}

function isRecent(createdAt, { now = Date.now(), windowDays = RECENT_WINDOW_DAYS } = {}) {
  if (!createdAt) return true; // unknown age: don't exclude it on that basis alone
  const time = new Date(createdAt).getTime();
  if (Number.isNaN(time)) return true;
  return now - time <= windowDays * 86400000;
}

/**
 * Scores one existing deal against the one being posted.
 * Returns { confidence: 'high' | 'medium' | null, score, reasons[] }.
 */
function scoreCandidate(incoming, candidate, options = {}) {
  const reasons = [];
  let score = 0;

  const incomingUrl = normalizeUrl(incoming?.url_source);
  const candidateUrl = normalizeUrl(candidate?.url_source);
  const sameUrl = Boolean(incomingUrl && candidateUrl && incomingUrl === candidateUrl);
  if (sameUrl) {
    reasons.push('same_url');
    score += 1;
  }

  const sameStore = Boolean(
    normalizeStore(incoming?.magasin)
    && normalizeStore(incoming?.magasin) === normalizeStore(candidate?.magasin),
  );
  if (sameStore) {
    reasons.push('same_store');
    score += 0.25;
  }

  const similarity = titleSimilarity(incoming?.titre, candidate?.titre);
  if (similarity >= TITLE_STRONG) {
    reasons.push('similar_title');
    score += 0.4;
  } else if (similarity >= TITLE_WEAK) {
    reasons.push('somewhat_similar_title');
    score += 0.2;
  }

  const samePrice = priceMatches(incoming?.prix, candidate?.prix);
  if (samePrice) {
    reasons.push('same_price');
    score += 0.25;
  }

  const recent = isRecent(candidate?.created_at, options);
  if (!recent) reasons.push('old');

  // An identical source URL is the one signal strong enough on its own.
  let confidence = null;
  if (sameUrl) {
    confidence = 'high';
  } else if (sameStore && similarity >= TITLE_STRONG && samePrice && recent) {
    confidence = 'high';
  } else if (sameStore && similarity >= TITLE_STRONG && recent) {
    confidence = 'medium';
  } else if (sameStore && similarity >= TITLE_WEAK && samePrice && recent) {
    confidence = 'medium';
  }

  return { confidence, score: Number(score.toFixed(3)), similarity: Number(similarity.toFixed(3)), reasons };
}

/**
 * Ranks existing deals against the one being posted, strongest first.
 * Candidates with no meaningful signal are dropped entirely.
 */
function findDuplicates(incoming, candidates, options = {}) {
  if (!incoming || !Array.isArray(candidates)) return [];
  return candidates
    .map((candidate) => ({ deal: candidate, ...scoreCandidate(incoming, candidate, options) }))
    .filter((match) => match.confidence !== null)
    .sort((a, b) => b.score - a.score || (b.deal?.id || 0) - (a.deal?.id || 0));
}

module.exports = {
  RECENT_WINDOW_DAYS,
  PRICE_TOLERANCE,
  normalizeUrl,
  normalizeText,
  normalizeStore,
  titleSimilarity,
  priceMatches,
  isRecent,
  scoreCandidate,
  findDuplicates,
};
