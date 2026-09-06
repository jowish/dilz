export function getDiscount(deal) {
  const original = Number(deal.prix_original);
  const current = Number(deal.prix);
  if (!original || !Number.isFinite(current) || current < 0 || original <= current) return null;
  return Math.round(((original - current) / original) * 100);
}

export function formatPrice(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return n % 1 === 0
    ? n.toLocaleString('en-US')
    : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function timeRemaining(dateFin, lang) {
  if (!dateFin) return null;
  const end = new Date(String(dateFin).slice(0, 10) + 'T23:59:59');
  const days = Math.ceil((end.getTime() - Date.now()) / 86400000);
  if (days < 0) return lang === 'he' ? 'פג תוקף' : 'Expired';
  if (days === 0) return lang === 'he' ? 'מסתיים היום' : 'Ends today';
  if (days <= 3) return lang === 'he' ? `מסתיים בעוד ${days} ימים` : `Ends in ${days}d`;
  return lang === 'he'
    ? `מסתיים ב-${end.toLocaleDateString('he-IL', { day: '2-digit', month: 'short' })}`
    : `Ends ${end.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`;
}

export function timeAgo(date, lang) {
  const diff = Date.now() - new Date(date).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return lang === 'he' ? 'עכשיו' : 'Just now';
  if (h < 24) return lang === 'he' ? `לפני ${h} שעות` : `${h}h ago`;
  return lang === 'he' ? `לפני ${Math.floor(h / 24)} ימים` : `${Math.floor(h / 24)}d ago`;
}

/**
 * The spelled-out version of timeAgo, for the byline under a deal:
 * "Shared by Dana 2 days ago" rather than "2d ago".
 *
 * Hebrew is not a matter of appending a number: one day is יום, two days is
 * יומיים, and only from three does the plural form take a count. The short
 * timeAgo above gets this wrong ("לפני 1 ימים"); this one does not.
 */
export function timeAgoLong(date, lang) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  const minutes = Math.max(0, Math.floor((Date.now() - parsed.getTime()) / 60000));
  const hebrew = lang === 'he';

  if (minutes < 1) return hebrew ? 'עכשיו' : 'just now';
  if (minutes < 60) {
    if (hebrew) return minutes === 1 ? 'לפני דקה' : `לפני ${minutes} דקות`;
    return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    if (hebrew) return hours === 1 ? 'לפני שעה' : hours === 2 ? 'לפני שעתיים' : `לפני ${hours} שעות`;
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 30) {
    if (hebrew) return days === 1 ? 'לפני יום' : days === 2 ? 'לפני יומיים' : `לפני ${days} ימים`;
    return days === 1 ? '1 day ago' : `${days} days ago`;
  }

  const months = Math.floor(days / 30);
  if (hebrew) return months === 1 ? 'לפני חודש' : months === 2 ? 'לפני חודשיים' : `לפני ${months} חודשים`;
  return months === 1 ? '1 month ago' : `${months} months ago`;
}
