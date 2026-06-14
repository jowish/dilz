import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const {
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
    SUPABASE_SERVICE_KEY: serviceKey,
  } = process.env;

  if (!url || !anonKey) {
    return res.status(500).json({ erreur: 'Missing Supabase configuration' });
  }

  const supabase = createClient(url, anonKey);
  const supabaseAdmin = serviceKey ? createClient(url, serviceKey) : supabase;

  try {
    if (req.method === 'GET') {
      const { ville, categorie, limit = 50, tri = 'hot' } = req.query;
      let query = supabase
        .from('bons_plans')
        .select('*, commentaires(count)');

      if (tri === 'oldest') query = query.order('created_at', { ascending: true });
      else if (tri === 'latest') query = query.order('created_at', { ascending: false });
      else query = query.order('votes_chaud', { ascending: false });

      query = query.limit(Number(limit));

      if (ville) query = query.eq('ville', ville);

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
        image_url: image_url || null,
        votes_chaud: 0,
        votes_froid: 0,
      };
      // Optional columns — added once the migration has run:
      // ALTER TABLE bons_plans ADD COLUMN statut TEXT DEFAULT 'actif';
      // ALTER TABLE bons_plans ADD COLUMN auteur_id UUID;
      // ALTER TABLE bons_plans ADD COLUMN categorie TEXT DEFAULT 'Food';
      // ALTER TABLE bons_plans ADD COLUMN url_source TEXT;
      // ALTER TABLE bons_plans ADD COLUMN date_debut TIMESTAMPTZ;
      // ALTER TABLE bons_plans ADD COLUMN date_fin TIMESTAMPTZ;
      if (auteur_id) insertData.auteur_id = auteur_id;
      if (categorie) insertData.categorie = categorie;
      if (url_source) insertData.url_source = url_source;
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
  } catch (e) {
    return res.status(500).json({ erreur: e.message || 'Internal server error' });
  }
}
