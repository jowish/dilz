import { createClient } from '@supabase/supabase-js';

const { getAdminToken, secretsMatch } = require('../../../lib/adminAuth');

export default async function handler(req, res) {
  res.setHeader('Allow', 'POST');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ erreur: 'Method not allowed' });

  const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_KEY: serviceKey, ADMIN_BOT_TOKEN } = process.env;
  if (!url || !serviceKey || !ADMIN_BOT_TOKEN) {
    return res.status(500).json({ erreur: 'Admin moderation is not configured.' });
  }

  if (!secretsMatch(getAdminToken(req), ADMIN_BOT_TOKEN)) {
    return res.status(403).json({ erreur: 'Invalid admin token' });
  }

  const id = Number(req.body?.id);
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ erreur: 'Valid id required' });

  const supabaseAdmin = createClient(url, serviceKey);
  const { data, error } = await supabaseAdmin
    .from('bons_plans')
    .update({ statut: 'actif' })
    .eq('id', id)
    .select('id, titre, statut')
    .single();

  if (error) return res.status(500).json({ erreur: error.message });
  return res.status(200).json({ ok: true, deal: data });
}
