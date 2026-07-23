import { createClient } from '@supabase/supabase-js';

// `next build` evaluates this module while prerendering pages, before any
// runtime environment is guaranteed. When NEXT_PUBLIC_SUPABASE_URL /
// _ANON_KEY are absent, createClient() throws "supabaseUrl is required" and
// fails the entire build. Fall back to an inert placeholder so prerendering
// always completes — a correctly-configured deployment still receives the
// real client from its own environment variables at build and runtime.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'public-anon-placeholder';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn(
    '[supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set. ' +
    'Using an inert placeholder client — set them in the deployment environment for the app to work.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
