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

  try {
    const supabaseAdmin = (() => {
      try { return serviceKey ? createClient(url, serviceKey) : supabase; }
      catch { return supabase; }
    })();
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

      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const insertData = {
        titre, description: description || null,
        prix: Number(prix) || 0,
        prix_original: prix_original ? Number(prix_original) : null,
        magasin, ville: ville || null,
        auteur_nom: auteur_nom || 'Anonyme',
        image_url: image_url || null,
        votes_chaud: 0,
        votes_froid: 0,
        statut: 'actif',
      };
      if (auteur_id && UUID_RE.test(String(auteur_id))) insertData.auteur_id = auteur_id;
      if (categorie) insertData.categorie = categorie;
      if (url_source && url_source.startsWith('http')) insertData.url_source = url_source;
      if (date_debut && date_debut.trim()) insertData.date_debut = date_debut;
      if (date_fin && date_fin.trim()) insertData.date_fin = date_fin;

      const { error } = await supabaseAdmin
        .from('bons_plans')
        .insert([insertData]);

      if (error) return res.status(500).json({
        erreur: error.message,
        code: error.code || null,
        hint: error.hint || error.details || null,
      });
      return res.status(201).json({ bon_plan: { ...insertData, created_at: new Date().toISOString() } });
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
