export const APP_MESSAGE_TYPES = ['banner', 'yellow_note'];
export const APP_MESSAGE_TARGETS = ['all', 'web', 'ios'];

function cleanText(value, maxLength, required = false) {
  const text = String(value || '').trim().slice(0, maxLength);
  if (required && !text) throw new Error('English and Hebrew message text are required.');
  return text || null;
}

function cleanDate(value, field) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error(`Invalid ${field}.`);
  return date.toISOString();
}

function cleanCtaUrl(value) {
  const url = String(value || '').trim();
  if (!url) return null;
  if (url.startsWith('/') && !url.startsWith('//')) return url.slice(0, 2000);
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error();
    return parsed.toString().slice(0, 2000);
  } catch {
    throw new Error('CTA URL must be an http(s) URL or an internal path.');
  }
}

export function normalizeAppMessageInput(input = {}) {
  const type = APP_MESSAGE_TYPES.includes(input.type) ? input.type : 'banner';
  const target = APP_MESSAGE_TARGETS.includes(input.target) ? input.target : 'all';
  const startsAt = cleanDate(input.starts_at, 'start date');
  const endsAt = cleanDate(input.ends_at, 'end date');
  if (startsAt && endsAt && endsAt <= startsAt) throw new Error('End date must be after start date.');

  const priorityValue = Number(input.priority ?? 0);
  const priority = Number.isFinite(priorityValue)
    ? Math.max(-100, Math.min(100, Math.trunc(priorityValue)))
    : 0;

  return {
    type,
    target,
    title_en: cleanText(input.title_en, 120),
    title_he: cleanText(input.title_he, 120),
    body_en: cleanText(input.body_en, 500, true),
    body_he: cleanText(input.body_he, 500, true),
    cta_label_en: cleanText(input.cta_label_en, 80),
    cta_label_he: cleanText(input.cta_label_he, 80),
    cta_url: cleanCtaUrl(input.cta_url),
    is_active: input.is_active === true,
    dismissible: input.dismissible !== false,
    starts_at: startsAt,
    ends_at: endsAt,
    priority,
  };
}

export function isAppMessageLive(message, now = new Date()) {
  const timestamp = now instanceof Date ? now.getTime() : new Date(now).getTime();
  if (!message?.is_active || !Number.isFinite(timestamp)) return false;
  if (message.starts_at && new Date(message.starts_at).getTime() > timestamp) return false;
  if (message.ends_at && new Date(message.ends_at).getTime() <= timestamp) return false;
  return true;
}

export function localizeAppMessage(message, lang = 'en') {
  const locale = lang === 'he' ? 'he' : 'en';
  return {
    ...message,
    title: message?.[`title_${locale}`] || '',
    body: message?.[`body_${locale}`] || '',
    ctaLabel: message?.[`cta_label_${locale}`] || '',
  };
}

export function messageTargetsPlatform(message, platform = 'web') {
  return message?.target === 'all' || message?.target === platform;
}
