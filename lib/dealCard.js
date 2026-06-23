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
