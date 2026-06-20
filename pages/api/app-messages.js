import { createClient } from '@supabase/supabase-js';
import { isAppMessageLive } from '../../lib/appMessages';

function isMissingTable(error) {
  return error?.code === 'PGRST205' || /not exist|schema cache|Could not find/i.test(error?.message || '');
}

export default async function handler(req, res) {
  res.setHeader('Allow', 'GET');
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  if (req.method !== 'GET') return res.status(405).json({ erreur: 'Method not allowed' });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return res.status(200).json({ messages: [] });

  const supabase = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase
    .from('app_messages')
    .select('*')
    .eq('is_active', true)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    if (isMissingTable(error)) return res.status(200).json({ messages: [] });
    return res.status(500).json({ erreur: error.message });
  }

  return res.status(200).json({ messages: (data || []).filter(message => isAppMessageLive(message)) });
}
