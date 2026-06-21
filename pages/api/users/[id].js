import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).end(); }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return res.status(500).json({ erreur: 'Server profile access is not configured.' });
  const admin = createClient(url, key);
  const id = String(req.query.id || '');

  const [{ data: authData, error: authError }, { data: deals, error: dealError }, { count: followerCount }] = await Promise.all([
    admin.auth.admin.getUserById(id),
    admin.from('bons_plans').select('id,titre,image_url,prix,votes_chaud,votes_froid,created_at,auteur_nom').eq('auteur_id', id).or('statut.eq.actif,statut.is.null').order('created_at', { ascending: false }).limit(100),
    admin.from('user_follows').select('*', { count: 'exact', head: true }).eq('followed_user_id', id),
  ]);
  if (authError || !authData?.user) return res.status(404).json({ erreur: 'User not found.' });
  if (dealError) return res.status(500).json({ erreur: dealError.message });
  const metadata = authData.user.user_metadata || {};
  return res.status(200).json({
    profile: {
      id,
      name: metadata.display_name || metadata.full_name || deals?.[0]?.auteur_nom || 'Dilz member',
      avatar_url: metadata.avatar_url || metadata.picture || null,
      created_at: authData.user.created_at,
      deals_count: deals?.length || 0,
      followers_count: followerCount || 0,
      hot_votes: (deals || []).reduce((sum, deal) => sum + Number(deal.votes_chaud || 0), 0),
    },
    deals: deals || [],
  });
}
