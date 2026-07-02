import { createClient } from '@supabase/supabase-js';

const { normalizeFollowSuggestions } = require('../../lib/userFollows');

function validUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || '');
}

export default async function handler(req, res) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !serviceKey) return res.status(500).json({ erreur: 'Server authentication is not configured.' });

  const admin = createClient(url, serviceKey);
  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ erreur: 'Session expired. Please sign in again.' });

  if (req.method === 'GET') {
    const [{ data: follows, error: followError }, { data: deals, error: dealError }] = await Promise.all([
      admin.from('user_follows').select('followed_user_id,followed_name,created_at').eq('follower_id', user.id),
      admin.from('bons_plans').select('auteur_id,auteur_nom,created_at').not('auteur_id', 'is', null).order('created_at', { ascending: false }).limit(120),
    ]);
    if (followError) return res.status(503).json({ erreur: followError.message, migration_required: true });
    if (dealError) return res.status(500).json({ erreur: dealError.message });
    return res.status(200).json({ users: normalizeFollowSuggestions(deals, follows, user.id) });
  }

  if (req.method === 'POST') {
    const followedUserId = String(req.body?.followed_user_id || '');
    const followedName = String(req.body?.followed_name || '').trim().slice(0, 120) || null;
    if (!validUuid(followedUserId) || followedUserId === user.id) return res.status(400).json({ erreur: 'Invalid user.' });

    const { data: existing, error: lookupError } = await admin
      .from('user_follows')
      .select('followed_user_id')
      .eq('follower_id', user.id)
      .eq('followed_user_id', followedUserId)
      .maybeSingle();
    if (lookupError) return res.status(503).json({ erreur: lookupError.message, migration_required: true });

    if (existing) {
      const { error } = await admin.from('user_follows').delete().eq('follower_id', user.id).eq('followed_user_id', followedUserId);
      if (error) return res.status(500).json({ erreur: error.message });
      return res.status(200).json({ following: false });
    }

    const { error } = await admin.from('user_follows').insert({ follower_id: user.id, followed_user_id: followedUserId, followed_name: followedName });
    if (error) return res.status(500).json({ erreur: error.message });
    return res.status(200).json({ following: true });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ erreur: 'Method not allowed.' });
}
