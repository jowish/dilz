import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  const { id, token } = req.query;

  if (!token || token !== process.env.ADMIN_BOT_TOKEN) {
    return res.status(403).json({ erreur: 'Token invalide' });
  }

  if (!id) return res.status(400).json({ erreur: 'id requis' });

  const { data, error } = await supabase
    .from('bons_plans')
    .update({ statut: 'rejete' })
    .eq('id', id)
    .select('id, titre, statut')
    .single();

  if (error) return res.status(500).json({ erreur: error.message });

  return res.status(200).json({ ok: true, deal: data });
}
