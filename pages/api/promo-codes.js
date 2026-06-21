import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !anon) return res.status(500).json({ erreur: 'Supabase is not configured.' });
  const client = createClient(url, anon);
  if (req.method === 'GET') {
    const { data, error } = await client.from('promo_codes').select('*').order('created_at', { ascending: false }).limit(100);
    return error ? res.status(503).json({ codes: [], migration_required: true }) : res.status(200).json({ codes: data || [] });
  }
  if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return res.status(405).end(); }
  if (!service) return res.status(500).json({ erreur: 'Server authentication is not configured.' });
  const admin = createClient(url, service);
  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return res.status(401).json({ erreur: 'Sign in to add a promo code.' });
  const merchant = String(req.body?.merchant || '').trim().slice(0, 100);
  const code = String(req.body?.code || '').trim().slice(0, 80);
  const description = String(req.body?.description || '').trim().slice(0, 500) || null;
  let sourceUrl;
  try { sourceUrl = new URL(String(req.body?.url || '')); if (!['http:', 'https:'].includes(sourceUrl.protocol)) throw new Error(); } catch { return res.status(400).json({ erreur: 'A valid merchant URL is required.' }); }
  if (!merchant || !code) return res.status(400).json({ erreur: 'Merchant and code are required.' });
  const row = { user_id: user.id, author_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Dilz member', merchant, code, description, url: sourceUrl.toString(), expires_at: req.body?.expires_at || null };
  const { data, error } = await admin.from('promo_codes').insert(row).select('*').single();
  return error ? res.status(500).json({ erreur: error.message }) : res.status(201).json({ code: data });
}
