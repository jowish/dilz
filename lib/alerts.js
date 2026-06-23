import userFollowHelpers from './userFollows.js';

const { buildFollowerNotifications } = userFollowHelpers;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

export function computeDiscountPct(deal) {
  const orig = Number(deal.prix_original);
  const cur  = Number(deal.prix);
  if (!orig || !Number.isFinite(cur) || cur < 0 || orig <= cur) return 0;
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

    const results = await Promise.allSettled(
      subs.map(sub =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
      )
    );
    for (const r of results) {
      // 410 = expired, 404 = not found — expected; anything else is a config or server error worth logging
      if (r.status === 'rejected' && r.reason?.statusCode !== 410 && r.reason?.statusCode !== 404) {
        console.error('[push]', r.reason?.message || r.reason);
      }
    }
  } catch {
    // web-push errors must never crash deal creation
  }
}

export async function processFollowerNotifications(deal, supabaseAdmin) {
  if (!deal?.auteur_id) return;
  const { data: follows, error } = await supabaseAdmin
    .from('user_follows')
    .select('follower_id')
    .eq('followed_user_id', deal.auteur_id);
  if (error || !follows?.length) return;

  const notifications = buildFollowerNotifications(deal, follows);
  if (!notifications.length) return;
  await supabaseAdmin.from('notifications').upsert(notifications, {
    onConflict: 'user_id,followed_user_id,deal_id',
    ignoreDuplicates: true,
  });
}
