import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { image, filename, mimeType } = req.body;
  if (!image || !filename) {
    return res.status(400).json({ erreur: 'image and filename are required' });
  }

  try {
    const buffer = Buffer.from(image, 'base64');
    const ext = filename.split('.').pop() || 'jpg';
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage
      .from('deal-images')
      .upload(path, buffer, {
        contentType: mimeType || 'image/jpeg',
        upsert: false,
      });

    if (error) return res.status(500).json({ erreur: error.message });

    const { data } = supabase.storage.from('deal-images').getPublicUrl(path);
    return res.status(200).json({ url: data.publicUrl });
  } catch (err) {
    return res.status(500).json({ erreur: err.message });
  }
}
