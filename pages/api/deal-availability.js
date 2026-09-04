import { createClient } from '@supabase/supabase-js';

// "Still available? Yes / No" on a deal (P0.2).
//
// One answer per person per deal — answering again updates that same row, so a
// single user cannot stack reports. The denormalised counters and timestamps on
// bons_plans are refreshed by a trigger (see supabase-deal-lifecycle-setup.sql),
// which keeps the feed query free of joins.

export default async function handler(req, res) {
  const {
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
    SUPABASE_SERVICE_KEY: serviceKey,
  } = process.env;

  if (!url || !anonKey) return res.status(500).json({ erreur: 'Missing Supabase configuration' });

  const supabase = createClient(url, anonKey);
  const supabaseAdmin = serviceKey ? createClient(url, serviceKey) : null;

  const dealId = Number(req.query.deal_id ?? req.body?.deal_id);
  if (!Number.isSafeInteger(dealId) || dealId <= 0) {
    return res.status(400).json({ erreur: 'Invalid deal id.' });
  }

  // ── GET: the current tally, plus this viewer's own answer if signed in ────
  if (req.method === 'GET') {
    // The public tally comes from the denormalised counters on the deal, which
    // anyone can already read. Nobody gets to enumerate the confirmations
    // table and see *who* reported a deal as gone — RLS only lets a signed-in
    // user read their own row.
    const { data: deal, error } = await supabase
      .from('bons_plans')
      .select('availability_yes_count,availability_no_count')
      .eq('id', dealId)
      .maybeSingle();
    if (error) return res.status(500).json({ erreur: error.message });

    let myAnswer = null;
    const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
    if (token && supabaseAdmin) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) {
        const { data: mine } = await supabaseAdmin
          .from('deal_availability_confirmations')
          .select('is_available')
          .eq('bon_plan_id', dealId)
          .eq('user_id', user.id)
          .maybeSingle();
        if (mine) myAnswer = mine.is_available;
      }
    }

    return res.status(200).json({
      available_count: deal?.availability_yes_count || 0,
      unavailable_count: deal?.availability_no_count || 0,
      my_answer: myAnswer,
    });
  }

  // ── POST: record this user's answer ──────────────────────────────────────
  if (req.method === 'POST') {
    // Auth first: an anonymous caller gets 401 rather than a 500 that would
    // tell them something about how the server is configured.
    const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
    if (!token) return res.status(401).json({ erreur: 'Sign in to confirm availability.' });

    if (!supabaseAdmin) {
      return res.status(500).json({ erreur: 'SUPABASE_SERVICE_KEY is required to record availability.' });
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ erreur: 'Session expired. Please sign in again.' });

    const { available } = req.body || {};
    if (typeof available !== 'boolean') {
      return res.status(400).json({ erreur: 'available must be true or false.' });
    }

    const { error } = await supabaseAdmin
      .from('deal_availability_confirmations')
      .upsert(
        { bon_plan_id: dealId, user_id: user.id, is_available: available, updated_at: new Date().toISOString() },
        { onConflict: 'bon_plan_id,user_id' },
      );
    if (error) return res.status(500).json({ erreur: error.message });

    // Read the refreshed deal so the client can re-derive the lifecycle state
    // from the same values the feed will use.
    const { data: deal } = await supabaseAdmin
      .from('bons_plans')
      .select('id,date_fin,last_verified_at,last_reported_unavailable_at,availability_yes_count,availability_no_count,lifecycle_override')
      .eq('id', dealId)
      .maybeSingle();

    return res.status(200).json({ ok: true, deal: deal || null });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).end();
}
