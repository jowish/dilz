import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Service role client for writes (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { ville, categorie, limit = 50, tri = 'hot' } = req.query;
    let query = supabase
      .from('bons_plans')
      .select('*, commentaires(count)')
      .eq('statut', 'actif');

    if (tri === 'oldest') query = query.order('created_at', { ascending: true });
    else if (tri === 'latest') query = query.order('created_at', { ascending: false });
    else query = query.order('votes_chaud', { ascending: false });

    query = query.limit(Number(limit));

    if (ville) query = query.eq('ville', ville);
    if (categorie && categorie !== 'all') query = query.eq('categorie', categorie);

    const { data, error } = await query;
    if (error) return res.status(500).json({ erreur: error.message });
    return res.status(200).json({ bons_plans: data });
  }

  if (req.method === 'POST') {
    const { titre, description, prix, prix_original, magasin, ville, auteur_nom, auteur_id, categorie, url_source, image_url, date_debut, date_fin } = req.body;

    if (!titre || !prix || !magasin) {
      return res.status(400).json({ erreur: 'titre, prix et magasin sont requis' });
    }

    const insertData = {
      titre, description: description || null,
      prix, prix_original: prix_original || null,
      magasin, ville: ville || null,
      auteur_nom: auteur_nom || 'Anonyme',
      auteur_id: auteur_id || null,
      categorie: categorie || 'Food',
      url_source: url_source || null,
      image_url: image_url || null,
      statut: 'actif',
      votes_chaud: 0,
      votes_froid: 0,
    };
    if (date_debut) insertData.date_debut = date_debut;
    if (date_fin) insertData.date_fin = date_fin;

    const { data, error } = await supabaseAdmin
      .from('bons_plans')
      .insert([insertData])
      .select()
      .single();

    if (error) return res.status(500).json({ erreur: error.message });
    return res.status(201).json({ bon_plan: data });
  }

  if (req.method === 'PATCH') {
    const { id, vote } = req.body;
    const champ = vote === 'chaud' ? 'votes_chaud' : 'votes_froid';

    const { data: current } = await supabaseAdmin
      .from('bons_plans')
      .select(champ)
      .eq('id', id)
      .single();

    const { error } = await supabaseAdmin
      .from('bons_plans')
      .update({ [champ]: (current?.[champ] || 0) + 1 })
      .eq('id', id);

    if (error) return res.status(500).json({ erreur: error.message });
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}