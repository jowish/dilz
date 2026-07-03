const { DEAL_CATEGORIES } = require('./dealCategories');

const MAX_ALERTS_PER_USER = 20;
const MAX_CITY_LEN = 100;
const MAX_KEYWORD_LEN = 80;
const MAX_CATEGORY_LEN = 40;
const ALERT_CATEGORIES = new Set(DEAL_CATEGORIES);

function cleanOptionalText(value, maxLength) {
  if (value == null) return null;
  return String(value).trim().slice(0, maxLength) || null;
}

function normalizeAlertInput(input = {}) {
  const city = cleanOptionalText(input.city, MAX_CITY_LEN);
  const category = cleanOptionalText(input.category, MAX_CATEGORY_LEN);
  const onlineOnly = Boolean(input.online_only);
  const keyword = cleanOptionalText(input.keyword, MAX_KEYWORD_LEN);
  let minDiscountPercent = null;
  const errors = [];

  if (category && !ALERT_CATEGORIES.has(category)) {
    errors.push('category is not supported.');
  }

  const rawDiscount = typeof input.min_discount_percent === 'string'
    ? input.min_discount_percent.trim()
    : input.min_discount_percent;
  if (rawDiscount !== '' && rawDiscount != null) {
    minDiscountPercent = Number(rawDiscount);
    if (!Number.isFinite(minDiscountPercent) || minDiscountPercent < 0 || minDiscountPercent > 100) {
      errors.push('min_discount_percent must be between 0 and 100.');
    }
  }

  if (!city && !category && !onlineOnly && minDiscountPercent == null && !keyword) {
    errors.push('At least one alert criterion is required.');
  }

  return {
    errors,
    value: {
      city,
      category,
      online_only: onlineOnly,
      min_discount_percent: minDiscountPercent,
      keyword,
    },
  };
}

function hasReachedAlertLimit(count) {
  return Number(count) >= MAX_ALERTS_PER_USER;
}

module.exports = {
  MAX_ALERTS_PER_USER,
  MAX_CITY_LEN,
  MAX_CATEGORY_LEN,
  MAX_KEYWORD_LEN,
  cleanOptionalText,
  hasReachedAlertLimit,
  normalizeAlertInput,
};
