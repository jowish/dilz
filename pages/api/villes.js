import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  res.setHeader('Allow', 'GET');
  if (req.method !== 'GET') return res.status(405).end();

  const { data, error } = await supabase
    .from('magasins')
    .select('ville_normalisee')
    .not('ville_normalisee', 'is', null)
    .order('ville_normalisee');

  if (error) return res.status(500).json({ erreur: error.message });

  const villes = [...new Set(data.map(m => m.ville_normalisee))].sort();

  res.status(200).json({ villes });
}
