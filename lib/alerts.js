import { createClient } from '@supabase/supabase-js';

// ─── Pure helpers ─────────────────────────────────────────────────────────────

export function computeDiscountPct(deal) {
  const orig = Number(deal.prix_original);
  const cur  = Number(deal.prix);
  if (!orig || !cur || orig <= cur) return 0;
  return Math.round((orig - cur) / orig * 100);
}

// Returns true when all non-null alert criteria match the deal.
export function matchDealToAlert(deal, alert) {
  if (alert.city) {
    if ((deal.ville || '').toLowerCase() !== alert.city.toLowerCase()) return false;
  }
  if (alert.online_only) {
    const isOnline = deal.ville === 'אונליין' || deal.categorie === 'Online';
    if (!isOnline) return false;
  }
  if (alert.min_discount_percent != null) {
    if (computeDiscountPct(deal) < Number(alert.min_discount_percent)) return false;
  }
  if (alert.keyword) {
    const kw = alert.keyword.toLowerCase().trim();
    const text = [deal.titre, deal.description, deal.magasin, deal.categorie]
      .filter(Boolean).join(' ').toLowerCase();
    if (!text.includes(kw)) return false;
  }
  return true;
}

// ─── Server-side processing ──────────────────────────────────────────────────

// Called after a new deal is created. Matches active alerts, creates in-app
// notifications, and sends push notifications when VAPID keys are configured.
export async function processNewDeal(deal, supabaseAdmin) {
  const { data: activeAlerts, error } = await supabaseAdmin
    .from('alerts')
    .select('*')
    .eq('is_active', true);

  if (error || !activeAlerts?.length) return;

  const matching = activeAlerts.filter(a => matchDealToAlert(deal, a));
  if (!matching.length) return;

  const title = deal.titre?.length > 50 ? deal.titre.slice(0, 47) + '…' : (deal.titre || 'New deal');
  const price = deal.prix ? `₪${deal.prix}` : '';
  const store = deal.magasin || '';
  const message = [price, store].filter(Boolean).join(' · ') || 'Check it out';

  const notifications = matching.map(a => ({
    alert_id: a.id,
    deal_id:  deal.id,
    user_id:  a.user_id,
    title,
    message,
  }));

  // Upsert: UNIQUE(alert_id, deal_id) prevents duplicates
  await supabaseAdmin
    .from('notifications')
    .upsert(notifications, { onConflict: 'alert_id,deal_id', ignoreDuplicates: true });

  // Push notifications (only when VAPID keys are configured)
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;

  try {
    const webpush = (await import('web-push')).default;
    webpush.setVapidDetails(
      `mailto:${process.env.VAPID_SUBJECT || 'noreply@dilz.app'}`,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    const userIds = [...new Set(matching.map(a => a.user_id))];
    const { data: subs } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .in('user_id', userIds);

    if (!subs?.length) return;

    const payload = JSON.stringify({ title, body: message, url: `/deal/${deal.id}` });

    await Promise.allSettled(
      subs.map(sub =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        ).catch(() => {}) // silently ignore expired subscriptions
      )
    );
  } catch {
    // web-push errors must never crash deal creation
  }
}
