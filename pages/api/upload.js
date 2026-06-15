import { createClient } from '@supabase/supabase-js';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024;
const EXTENSIONS = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const {
    NEXT_PUBLIC_SUPABASE_URL: url,
    SUPABASE_SERVICE_KEY: serviceKey,
  } = process.env;

  if (!url || !serviceKey) {
    return res.status(500).json({ erreur: 'Missing Supabase configuration' });
  }

  const supabaseAdmin = createClient(url, serviceKey);

  // Require authentication
  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) {
    return res.status(401).json({ erreur: 'Sign in to upload images.' });
  }
  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) {
    return res.status(401).json({ erreur: 'Session expired. Please sign in again.' });
  }

  const { image, filename, mimeType } = req.body;
  if (!image || !filename) {
    return res.status(400).json({ erreur: 'image and filename are required' });
  }

  const mime = (mimeType || '').toLowerCase();
  if (!ALLOWED_MIME.has(mime)) {
    return res.status(400).json({ erreur: 'Only JPEG, PNG, and WebP are accepted.' });
  }

  try {
    const buffer = Buffer.from(image, 'base64');
    if (!buffer.length || buffer.length > MAX_BYTES) {
      return res.status(400).json({ erreur: 'Image must be smaller than 5 MB.' });
    }
    const rand = Math.random().toString(36).slice(2, 9);
    // User-scoped path so storage RLS policies apply correctly
    const path = `${user.id}/${Date.now()}-${rand}.${EXTENSIONS[mime]}`;

    const { error } = await supabaseAdmin.storage
      .from('deal-images')
      .upload(path, buffer, {
        contentType: mime === 'image/jpg' ? 'image/jpeg' : mime,
        cacheControl: '86400',
        upsert: false,
      });

    if (error) return res.status(500).json({ erreur: error.message });

    const { data } = supabaseAdmin.storage.from('deal-images').getPublicUrl(path);
    return res.status(200).json({ url: data.publicUrl, path });
  } catch (err) {
    return res.status(500).json({ erreur: err.message });
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: '7mb' },
  },
};
