import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const {
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
    SUPABASE_SERVICE_KEY: serviceKey,
  } = process.env;

  if (!url || !anonKey || !serviceKey) return res.status(500).json({ erreur: 'Missing Supabase configuration' });

  const supabase = createClient(url, anonKey);
  const supabaseAdmin = createClient(url, serviceKey);

  async function verifyUser() {
    const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
    if (!token) return { user: null, error: 'Sign in to continue.' };
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return { user: null, error: 'Session expired. Please sign in again.' };
    return { user, error: null };
  }

  try {
    // ─── GET — list notifications (newest 50) ─────────────────────────────────
    if (req.method === 'GET') {
      const { user, error: authErr } = await verifyUser();
      if (!user) return res.status(401).json({ erreur: authErr });

      const { data, error } = await supabaseAdmin
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) return res.status(500).json({ erreur: error.message });
      return res.status(200).json({ notifications: data || [] });
    }

    // ─── PATCH — mark notifications as read ───────────────────────────────────
    if (req.method === 'PATCH') {
      const { user, error: authErr } = await verifyUser();
      if (!user) return res.status(401).json({ erreur: authErr });

      const { id, markAllRead } = req.body;
      if (!markAllRead && !id) {
        return res.status(400).json({ erreur: 'Provide id or markAllRead=true.' });
      }

      let query = supabaseAdmin
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id);

      if (!markAllRead && id) {
        query = query.eq('id', id);
      }

      const { error } = await query;
      if (error) return res.status(500).json({ erreur: error.message });
      return res.status(200).json({ ok: true });
    }

    res.status(405).end();
  } catch (e) {
    return res.status(500).json({ erreur: e.message || 'Internal server error' });
  }
}
