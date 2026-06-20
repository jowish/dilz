import { createClient } from '@supabase/supabase-js';
import { ISRAEL_CITIES } from '../../lib/israelCities';

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

  if (error) return res.status(200).json({ villes: ISRAEL_CITIES.map((city) => city.value), source: 'catalog' });

  const villes = [...new Set([...ISRAEL_CITIES.map((city) => city.value), ...data.map(m => m.ville_normalisee)])].sort((a, b) => a.localeCompare(b, 'he'));

  res.status(200).json({ villes });
}
