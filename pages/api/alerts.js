import { createClient } from '@supabase/supabase-js';

const { MAX_ALERTS_PER_USER, hasReachedAlertLimit, normalizeAlertInput } = require('../../lib/alertValidation');

export default async function handler(req, res) {
  const {
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
    SUPABASE_SERVICE_KEY: serviceKey,
  } = process.env;

  if (!url || !anonKey || !serviceKey) return res.status(500).json({ erreur: 'Missing Supabase configuration' });

  const supabase = createClient(url, anonKey);
  const supabaseAdmin = createClient(url, serviceKey);

  async function verifyUser() {
    const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
    if (!token) return { user: null, error: 'Sign in to continue.' };
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return { user: null, error: 'Session expired. Please sign in again.' };
    return { user, error: null };
  }

  try {
    // ─── GET — list user's alerts ─────────────────────────────────────────────
    if (req.method === 'GET') {
      const { user, error: authErr } = await verifyUser();
      if (!user) return res.status(401).json({ erreur: authErr });

      const { data, error } = await supabaseAdmin
        .from('alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) return res.status(500).json({ erreur: error.message });
      return res.status(200).json({ alerts: data || [] });
    }

    // ─── POST — create alert ──────────────────────────────────────────────────
    if (req.method === 'POST') {
      const { user, error: authErr } = await verifyUser();
      if (!user) return res.status(401).json({ erreur: authErr });

      const normalized = normalizeAlertInput(req.body);
      if (normalized.errors.length) return res.status(400).json({ erreur: normalized.errors[0] });
      const { city, online_only, min_discount_percent, keyword } = normalized.value;

      // Rate limit per user
      const { count, error: countError } = await supabaseAdmin
        .from('alerts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (countError) return res.status(500).json({ erreur: countError.message });
      if (hasReachedAlertLimit(count)) {
        return res.status(400).json({ erreur: `Maximum ${MAX_ALERTS_PER_USER} alerts per user.` });
      }

      // Prevent exact duplicate
      let duplicateQuery = supabaseAdmin
        .from('alerts')
        .select('id')
        .eq('user_id', user.id)
        .eq('online_only', online_only);

      duplicateQuery = city == null ? duplicateQuery.is('city', null) : duplicateQuery.eq('city', city);
      duplicateQuery = keyword == null ? duplicateQuery.is('keyword', null) : duplicateQuery.eq('keyword', keyword);
      duplicateQuery = min_discount_percent == null
        ? duplicateQuery.is('min_discount_percent', null)
        : duplicateQuery.eq('min_discount_percent', min_discount_percent);

      const { data: existing, error: dupeError } = await duplicateQuery.maybeSingle();
      if (dupeError) return res.status(500).json({ erreur: dupeError.message });

      if (existing) {
        return res.status(409).json({ erreur: 'An identical alert already exists.' });
      }

      const { data: rows, error } = await supabaseAdmin
        .from('alerts')
        .insert([{ user_id: user.id, city, online_only, min_discount_percent, keyword }])
        .select('*');

      if (error?.code === '23505') {
        return res.status(409).json({ erreur: 'An identical alert already exists.' });
      }
      if (error) return res.status(500).json({ erreur: error.message });
      return res.status(201).json({ alert: rows[0] });
    }

    // ─── PATCH — update alert (toggle is_active) ──────────────────────────────
    if (req.method === 'PATCH') {
      const { user, error: authErr } = await verifyUser();
      if (!user) return res.status(401).json({ erreur: authErr });

      const { id, is_active } = req.body;
      if (!id) return res.status(400).json({ erreur: 'Missing id.' });

      const { data: existing } = await supabaseAdmin
        .from('alerts').select('user_id').eq('id', id).maybeSingle();

      if (!existing || existing.user_id !== user.id) {
        return res.status(403).json({ erreur: 'Not your alert.' });
      }

      const updates = { updated_at: new Date().toISOString() };
      if (is_active !== undefined) updates.is_active = Boolean(is_active);

      const { error } = await supabaseAdmin.from('alerts').update(updates).eq('id', id);
      if (error) return res.status(500).json({ erreur: error.message });
      return res.status(200).json({ ok: true });
    }

    // ─── DELETE — remove alert ────────────────────────────────────────────────
    if (req.method === 'DELETE') {
      const { user, error: authErr } = await verifyUser();
      if (!user) return res.status(401).json({ erreur: authErr });

      const id = req.query.id;
      if (!id) return res.status(400).json({ erreur: 'Missing id query param.' });

      const { data: existing } = await supabaseAdmin
        .from('alerts').select('user_id').eq('id', id).maybeSingle();

      if (!existing || existing.user_id !== user.id) {
        return res.status(403).json({ erreur: 'Not your alert.' });
      }

      const { error } = await supabaseAdmin.from('alerts').delete().eq('id', id);
      if (error) return res.status(500).json({ erreur: error.message });
      return res.status(200).json({ ok: true });
    }

    res.status(405).end();
  } catch (e) {
    return res.status(500).json({ erreur: e.message || 'Internal server error' });
  }
}
