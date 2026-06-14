import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('bons_plans')
      .select('*, commentaires(count)')
      .eq('id', id)
      .single();

    if (error) return res.status(404).json({ erreur: 'Deal not found' });
    return res.status(200).json({ bon_plan: data });
  }

  res.status(405).end();
}
