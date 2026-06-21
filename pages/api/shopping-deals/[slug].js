import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_KEY;
  const slug = String(req.query.slug || '').slice(0, 100);
  const client = createClient(url, service || anon);
  if (req.method === 'GET') {
    const [{ data: votes }, { data: comments }] = await Promise.all([
      client.from('shopping_deal_votes').select('type').eq('slug', slug),
      client.from('shopping_deal_comments').select('id,author_name,content,created_at').eq('slug', slug).order('created_at', { ascending: false }).limit(100),
    ]);
    return res.status(200).json({ hot: (votes || []).filter((v) => v.type === 'chaud').length, cold: (votes || []).filter((v) => v.type === 'froid').length, comments: comments || [] });
  }
  if (req.method !== 'POST' || !service) return res.status(405).end();
  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  const { data: { user } } = await client.auth.getUser(token);
  if (!user) return res.status(401).json({ erreur: 'Sign in to participate.' });
  if (req.body?.action === 'vote') {
    const type = req.body.type;
    if (!['chaud', 'froid'].includes(type)) return res.status(400).end();
    const { data: previous } = await client.from('shopping_deal_votes').select('type').eq('slug', slug).eq('user_id', user.id).maybeSingle();
    if (previous?.type === type) await client.from('shopping_deal_votes').delete().eq('slug', slug).eq('user_id', user.id);
    else await client.from('shopping_deal_votes').upsert({ slug, user_id: user.id, type });
    return res.status(200).json({ ok: true });
  }
  const content = String(req.body?.content || '').trim().slice(0, 1000);
  if (!content) return res.status(400).json({ erreur: 'Comment is required.' });
  const row = { slug, user_id: user.id, author_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Dilz member', content };
  const { data, error } = await client.from('shopping_deal_comments').insert(row).select('id,author_name,content,created_at').single();
  return error ? res.status(500).json({ erreur: error.message }) : res.status(201).json({ comment: data });
}
