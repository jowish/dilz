// Single source of truth for how a deal is presented, so every surface that
// renders a deal (feed card, map list, profile rows, deal detail) agrees on
// price, discount, availability and expiry instead of each re-deriving them.
//
// Before this existed, pages/profil.js computed its own discount with no
// validity guard, pages/map.js and pages/user/[id].js printed the raw price
// (so a free deal read "0 ₪"), and the feed card could render "Online · Online"
// because the city slot and the availability slot both resolved to "Online".

const { formatPrice } = require('./dealCard.js');

const CURRENCY = '₪';

// Deliberately strict: Number(null), Number('') and Number(false) are all 0,
// which would make a *missing* price look like a free deal.
function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

/** A deal is free when its price is a real, explicit zero — not a missing price. */
function isFreeDeal(deal) {
  const price = toNumber(deal?.prix);
  return price === 0;
}

function hasPrice(deal) {
  const price = toNumber(deal?.prix);
  return price !== null && price >= 0;
}

/**
 * The headline price. Free deals must never render as "0 ₪", and a deal with
 * no usable price renders nothing rather than "NaN ₪".
 */
function formatDealPrice(deal, lang = 'en') {
  if (isFreeDeal(deal)) return lang === 'he' ? 'חינם' : 'FREE';
  if (!hasPrice(deal)) return '';
  return `${formatPrice(deal.prix)} ${CURRENCY}`;
}

/**
 * The struck-through original price — only when it exists, is valid, and is
 * genuinely higher than what the deal costs now.
 */
function formatOriginalPrice(deal) {
  const original = toNumber(deal?.prix_original);
  const current = toNumber(deal?.prix);
  if (original === null || current === null) return '';
  if (original <= 0 || original <= current) return '';
  return `${formatPrice(original)} ${CURRENCY}`;
}

/**
 * Discount percentage, or null when it cannot be computed honestly.
 * Requires both prices valid, original strictly greater, and the result to
 * land in a sane 1-99% band so bad data can't render "-3400%" or "-0%".
 */
function getDealDiscount(deal) {
  const original = toNumber(deal?.prix_original);
  const current = toNumber(deal?.prix);
  if (original === null || current === null) return null;
  if (current < 0 || original <= 0 || original <= current) return null;
  const pct = Math.round(((original - current) / original) * 100);
  if (!Number.isFinite(pct) || pct <= 0 || pct >= 100) return null;
  return pct;
}

/** Whether the deal is an online deal rather than a physical-store one. */
function isOnlineDeal(deal) {
  if (!deal) return false;
  return deal.ville === 'Online'
    || deal.categorie === 'Online'
    || /online/i.test(String(deal.ville || ''));
}

function availabilityLabel(deal, lang = 'en') {
  if (isOnlineDeal(deal)) return lang === 'he' ? 'אונליין' : 'Online';
  return lang === 'he' ? 'בחנות' : 'In-store';
}

/**
 * The city to show next to the store name — null for online deals, because
 * the availability label already says "Online" and printing both produced
 * the "Online · Online" duplication.
 */
function locationLabel(deal, { translateCity, lang = 'en' } = {}) {
  if (!deal || isOnlineDeal(deal)) return null;
  if (!deal.ville) return null;
  return translateCity ? translateCity(deal.ville, lang === 'he' ? 'he' : 'en') : deal.ville;
}

/**
 * Builds the store row without duplicated segments — the caller can render
 * the result joined by "·" and trust that nothing repeats.
 */
function storeMetaSegments(deal, { translateCity, lang = 'en' } = {}) {
  const segments = [deal?.magasin, locationLabel(deal, { translateCity, lang }), availabilityLabel(deal, lang)]
    .map((segment) => (typeof segment === 'string' ? segment.trim() : segment))
    .filter(Boolean);
  const seen = new Set();
  return segments.filter((segment) => {
    const key = segment.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Date-only expiry check, independent of price and of moderation status. */
function isExpiredDeal(deal) {
  const value = typeof deal === 'string' ? deal : deal?.date_fin;
  const match = String(value || '').match(/^(\d{4}-\d{2}-\d{2})(?:$|[T\s])/);
  if (!match) return false;
  return match[1] < new Date().toISOString().slice(0, 10);
}

module.exports = {
  CURRENCY,
  isFreeDeal,
  hasPrice,
  formatDealPrice,
  formatOriginalPrice,
  getDealDiscount,
  isOnlineDeal,
  availabilityLabel,
  locationLabel,
  storeMetaSegments,
  isExpiredDeal,
};
