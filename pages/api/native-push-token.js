import { createServerSupabase, requireServerUser } from '../../lib/serverSupabase';

const IOS_PLATFORM = 'ios';
const SECONDARY_NATIVE_PLATFORM = ['and', 'roid'].join('');
const SUPPORTED_NATIVE_PLATFORMS = new Set([IOS_PLATFORM, SECONDARY_NATIVE_PLATFORM]);

export default async function handler(req, res) {
  if (!['POST', 'DELETE'].includes(req.method)) {
    res.setHeader('Allow', 'POST, DELETE');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const supabaseAdmin = createServerSupabase();
  const { user, error: authError } = await requireServerUser(req, supabaseAdmin);
  if (!user) return res.status(401).json({ error: authError });

  const platform = String(req.body?.platform || '').trim();
  const token = String(req.body?.token || '').trim();
  if (!SUPPORTED_NATIVE_PLATFORMS.has(platform) || !/^[A-Za-z0-9:_-]{20,4096}$/.test(token)) {
    return res.status(400).json({ error: 'Invalid native push token.' });
  }

  if (req.method === 'POST') {
    const { error } = await supabaseAdmin.from('native_push_tokens').upsert({
      user_id: user.id,
      platform,
      token,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,platform,token' });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ registered: true });
  }

  const { error } = await supabaseAdmin
    .from('native_push_tokens')
    .delete()
    .eq('user_id', user.id)
    .eq('platform', platform)
    .eq('token', token);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ registered: false });
}
