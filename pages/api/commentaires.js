import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  if (req.method === 'GET') {
    const { bon_plan_id } = req.query;
    const { data, error } = await supabase
      .from('commentaires')
      .select('*')
      .eq('bon_plan_id', bon_plan_id)
      .order('created_at', { ascending: true });

    if (error) return res.status(500).json({ erreur: error.message });
    return res.status(200).json({ commentaires: data });
  }

  if (req.method === 'POST') {
    const { bon_plan_id, auteur_nom, auteur_id, contenu } = req.body;
    if (!bon_plan_id || !contenu) return res.status(400).json({ erreur: 'Champs manquants' });

    const { data, error } = await supabase
      .from('commentaires')
      .insert([{ bon_plan_id, auteur_nom: auteur_nom || 'Anonyme', auteur_id: auteur_id || null, contenu }])
      .select()
      .single();

    if (error) return res.status(500).json({ erreur: error.message });
    return res.status(201).json({ commentaire: data });
  }

  res.status(405).end();
}