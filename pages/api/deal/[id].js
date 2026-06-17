import { createClient } from '@supabase/supabase-js';

const { dateOnlyPart } = require('../../../lib/dealValidation');

export default async function handler(req, res) {
  res.setHeader('Allow', 'GET');
  if (req.method !== 'GET') return res.status(405).end();

  const { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey } = process.env;
  if (!url || !anonKey) return res.status(500).json({ erreur: 'Missing config' });

  const supabase = createClient(url, anonKey);
  const { id } = req.query;

  const { data, error } = await supabase
    .from('bons_plans')
    .select('*')
    .eq('id', id)
    .or('statut.eq.actif,statut.is.null')
    .single();

  if (error) return res.status(404).json({ erreur: error.message });
  return res.status(200).json({
    bon_plan: {
      ...data,
      date_debut: dateOnlyPart(data.date_debut),
      date_fin: dateOnlyPart(data.date_fin),
    },
  });
}
