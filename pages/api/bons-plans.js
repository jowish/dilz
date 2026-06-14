import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { ville, categorie, limit = 50 } = req.query;
    let query = supabase
      .from('bons_plans')
      .select('*, commentaires(count)')
      .eq('statut', 'actif')
      .order('votes_chaud', { ascending: false })
      .limit(Number(limit));

    if (ville) query = query.eq('ville', ville);
    if (categorie && categorie !== 'all') query = query.eq('categorie', categorie);

    const { data, error } = await query;
    if (error) return res.status(500).json({ erreur: error.message });
    return res.status(200).json({ bons_plans: data });
  }

  if (req.method === 'POST') {
    const { titre, description, prix, prix_original, magasin, ville, auteur_nom, image_url } = req.body;
    
    if (!titre || !prix || !magasin) {
      return res.status(400).json({ erreur: 'titre, prix et magasin sont requis' });
    }

    const { data, error } = await supabase
      .from('bons_plans')
      .insert([{ titre, description, prix, prix_original, magasin, ville, auteur_nom: auteur_nom || 'Anonyme', image_url }])
      .select()
      .single();

    if (error) return res.status(500).json({ erreur: error.message });
    return res.status(201).json({ bon_plan: data });
  }

  if (req.method === 'PATCH') {
    const { id, vote } = req.body;
    const champ = vote === 'chaud' ? 'votes_chaud' : 'votes_froid';

    const { data: current } = await supabase
      .from('bons_plans')
      .select(champ)
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('bons_plans')
      .update({ [champ]: (current?.[champ] || 0) + 1 })
      .eq('id', id);

    if (error) return res.status(500).json({ erreur: error.message });
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}