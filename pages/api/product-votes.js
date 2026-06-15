import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const {
    NEXT_PUBLIC_SUPABASE_URL: url,
    SUPABASE_SERVICE_KEY: serviceKey,
  } = process.env;

  res.setHeader('Allow', 'GET, PATCH');
  if (!['GET', 'PATCH'].includes(req.method)) return res.status(405).end();
  if (!url || !serviceKey) return res.status(500).json({ erreur: 'Missing Supabase configuration' });

  const supabaseAdmin = createClient(url, serviceKey);
  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ erreur: 'Sign in to continue.' });

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ erreur: 'Session expired. Please sign in again.' });

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('product_votes')
        .select('barcode,type')
        .eq('user_id', user.id);

      if (error) {
        const missing = error.code === 'PGRST205' || error.message?.includes('product_votes');
        return res.status(missing ? 503 : 500).json({
          erreur: missing ? 'Product voting is not configured. Run supabase-product-discovery-setup.sql.' : error.message,
        });
      }
      return res.status(200).json({ votes: data || [] });
    }

    const barcode = String(req.body?.barcode || '').trim().slice(0, 80);
    const type = req.body?.type;
    if (!barcode) return res.status(400).json({ erreur: 'Missing barcode.' });
    if (!['chaud', 'froid'].includes(type)) {
      return res.status(400).json({ erreur: 'type must be "chaud" or "froid".' });
    }

    const { data, error } = await supabaseAdmin.rpc('cast_product_vote', {
      p_barcode: barcode,
      p_user_id: user.id,
      p_type: type,
    });

    if (error) {
      const missing = error.code === 'PGRST202' || error.message?.includes('cast_product_vote');
      return res.status(missing ? 503 : 500).json({
        erreur: missing ? 'Product voting is not configured. Run supabase-product-discovery-setup.sql.' : error.message,
      });
    }

    const result = Array.isArray(data) ? data[0] : data;
    return res.status(200).json({
      ok: true,
      newType: result?.new_type || null,
      votes_chaud: result?.votes_chaud || 0,
      votes_froid: result?.votes_froid || 0,
    });
  } catch (error) {
    return res.status(500).json({ erreur: error.message || 'Internal server error' });
  }
}
