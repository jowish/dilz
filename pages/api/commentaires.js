import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey, SUPABASE_SERVICE_KEY: serviceKey } = process.env;
  if (!url || !anonKey) return res.status(500).json({ erreur: 'Missing config' });

  const supabase = createClient(url, anonKey);
  const supabaseAdmin = (() => {
    try { return serviceKey ? createClient(url, serviceKey) : supabase; }
    catch { return supabase; }
  })();

  if (req.method === 'GET') {
    const { bon_plan_id } = req.query;
    if (!bon_plan_id) return res.status(400).json({ erreur: 'bon_plan_id required' });
    const { data, error } = await supabase
      .from('commentaires')
      .select('*')
      .eq('bon_plan_id', bon_plan_id)
      .order('created_at', { ascending: true });

    if (error) return res.status(500).json({ erreur: error.message });
    return res.status(200).json({ commentaires: data || [] });
  }

  if (req.method === 'POST') {
    const { bon_plan_id, auteur_nom, auteur_id, contenu } = req.body;
    if (!bon_plan_id || !contenu) return res.status(400).json({ erreur: 'Champs manquants' });

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const row = {
      bon_plan_id,
      auteur_nom: auteur_nom || 'Anonyme',
      contenu,
    };
    if (auteur_id && UUID_RE.test(String(auteur_id))) row.auteur_id = auteur_id;

    const { error } = await supabaseAdmin
      .from('commentaires')
      .insert([row]);

    if (error) return res.status(500).json({ erreur: error.message, code: error.code });
    return res.status(201).json({ commentaire: { ...row, created_at: new Date().toISOString() } });
  }

  res.status(405).end();
}