import { createServerSupabase, readBearerToken } from '../../lib/serverSupabase';
import {
  DEFAULT_MIN_POPULAR_SEARCHES,
  DEFAULT_POPULAR_LIMIT,
  MAX_POPULAR_LIMIT,
  normalizeSearchKey,
  popularSearchesFromRows,
  validSearchKeyword,
} from '../../lib/searchAnalytics';

const LOOKBACK_DAYS = 60;
const MAX_ROWS_TO_AGGREGATE = 5000;

export default async function handler(req, res) {
  const supabase = createServerSupabase();
  if (!supabase) return res.status(500).json({ erreur: 'Missing Supabase configuration' });

  if (req.method === 'GET') {
    const min = Math.max(1, Number(req.query.min || DEFAULT_MIN_POPULAR_SEARCHES));
    const limit = Math.min(MAX_POPULAR_LIMIT, Math.max(1, Number(req.query.limit || DEFAULT_POPULAR_LIMIT)));
    const since = new Date(Date.now() - LOOKBACK_DAYS * 86400000).toISOString();

    const { data, error } = await supabase
      .from('search_events')
      .select('query, normalized_query, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(MAX_ROWS_TO_AGGREGATE);

    if (error?.code === '42P01') return res.status(200).json({ keywords: [] });
    if (error) return res.status(500).json({ erreur: error.message });

    return res.status(200).json({ keywords: popularSearchesFromRows(data || [], { minCount: min, limit }) });
  }

  if (req.method === 'POST') {
    const keyword = validSearchKeyword(req.body?.query);
    if (!keyword) return res.status(200).json({ ok: true, tracked: false });

    let userId = null;
    const token = readBearerToken(req);
    if (token) {
      const { data } = await supabase.auth.getUser(token).catch(() => ({ data: null }));
      userId = data?.user?.id || null;
    }

    const { error } = await supabase.from('search_events').insert([{
      user_id: userId,
      query: keyword,
      normalized_query: normalizeSearchKey(keyword),
    }]);

    if (error?.code === '42P01') return res.status(200).json({ ok: true, tracked: false });
    if (error) return res.status(500).json({ erreur: error.message });

    return res.status(201).json({ ok: true, tracked: true });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).end();
}
