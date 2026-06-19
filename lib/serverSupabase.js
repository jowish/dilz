import { createClient } from '@supabase/supabase-js';

export function createServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function readBearerToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

export async function requireServerUser(req, supabaseAdmin) {
  const token = readBearerToken(req);
  if (!token) return { user: null, error: 'Sign in to continue.' };
  if (!supabaseAdmin) return { user: null, error: 'Server authentication is not configured.' };

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return { user: null, error: 'Session expired. Please sign in again.' };
  return { user: data.user, error: null };
}
