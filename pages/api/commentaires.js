import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const {
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
    SUPABASE_SERVICE_KEY: serviceKey,
  } = process.env;

  if (!url || !anonKey) return res.status(500).json({ erreur: 'Missing config' });

  const supabase = createClient(url, anonKey);
  const supabaseAdmin = serviceKey ? createClient(url, serviceKey) : null;

  // ─── GET ────────────────────────────────────────────────────────────────────
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

  // ─── POST ───────────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    if (!supabaseAdmin) {
      return res.status(500).json({ erreur: 'SUPABASE_SERVICE_KEY is required for comments.' });
    }
    // Require authentication — get user from JWT
    const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
    if (!token) {
      return res.status(401).json({ erreur: 'Sign in to post a comment.' });
    }

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) {
      return res.status(401).json({ erreur: 'Session expired. Please sign in again.' });
    }

    const { bon_plan_id, contenu } = req.body;
    const normalizedContent = contenu?.trim();
    if (!bon_plan_id || !normalizedContent) {
      return res.status(400).json({ erreur: 'bon_plan_id and contenu are required.' });
    }
    if (normalizedContent.length > 2000) {
      return res.status(400).json({ erreur: 'Comment must be 2000 characters or fewer.' });
    }

    // Author name comes from verified JWT — not from client body
    const auteur_nom =
      user.user_metadata?.display_name ||
      user.user_metadata?.full_name ||
      user.email?.split('@')[0] ||
      'User';

    // Try inserting with auteur_id (if column exists in DB)
    const rowWithId = {
      bon_plan_id,
      auteur_nom,
      contenu: normalizedContent,
      auteur_id: user.id,
    };

    const { data: inserted, error } = await supabaseAdmin
      .from('commentaires')
      .insert([rowWithId])
      .select()
      .single();

    if (error) {
      // If auteur_id column doesn't exist yet, retry without it
      if (
        error.message?.includes('auteur_id') ||
        error.code === '42703' ||       // undefined_column
        error.code === 'PGRST204'
      ) {
        const rowWithoutId = { bon_plan_id, auteur_nom, contenu: normalizedContent };
        const { data: ins2, error: err2 } = await supabaseAdmin
          .from('commentaires')
          .insert([rowWithoutId])
          .select()
          .single();
        if (err2) return res.status(500).json({ erreur: err2.message, code: err2.code });
        return res.status(201).json({
          commentaire: ins2 || { ...rowWithoutId, created_at: new Date().toISOString() },
        });
      }
      return res.status(500).json({ erreur: error.message, code: error.code });
    }

    return res.status(201).json({
      commentaire: inserted || { ...rowWithId, created_at: new Date().toISOString() },
    });
  }

  res.status(405).end();
}
