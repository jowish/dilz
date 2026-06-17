import { createClient } from '@supabase/supabase-js';

const STORE_NAMES = {
  shufersal: 'Shufersal',
  rami_levy: 'Rami Levy',
  victory: 'Victory',
  yohananof: 'Yohananof',
  osher_ad: 'Osher Ad',
  carrefour: 'Carrefour',
  be: 'BE',
  super_pharm: 'Super-Pharm',
  good_pharm: 'Good Pharm',
};

function productSnapshot(product) {
  const prices = (product.prix || []).filter(row => Number(row.prix) > 0);
  const best = prices.reduce((current, row) => (
    !current || Number(row.prix) < Number(current.prix) ? row : current
  ), null);

  return {
    title: product.nom_en || product.nom,
    title_original: product.nom,
    image: product.image || null,
    price: best ? Number(best.prix) : null,
    store: best ? (STORE_NAMES[best.enseigne_code] || best.enseigne_code) : null,
    category: product.categorie || null,
  };
}

async function buildSnapshot(supabaseAdmin, itemType, itemId) {
  if (itemType === 'deal') {
    const dealId = Number(itemId);
    if (!Number.isSafeInteger(dealId) || dealId <= 0) return null;
    const { data, error } = await supabaseAdmin
      .from('bons_plans')
      .select('id,titre,image_url,prix,prix_original,magasin,ville,date_fin,statut')
      .eq('id', dealId)
      .maybeSingle();
    if (error || !data || (data.statut && data.statut !== 'actif')) return null;
    return {
      title: data.titre,
      image: data.image_url || null,
      price: Number(data.prix),
      original_price: data.prix_original == null ? null : Number(data.prix_original),
      store: data.magasin,
      city: data.ville || null,
      end_date: data.date_fin || null,
    };
  }

  const barcode = String(itemId || '').trim().slice(0, 80);
  if (!barcode) return null;
  const { data, error } = await supabaseAdmin
    .from('produits')
    .select('barcode,nom,nom_en,image,categorie,prix(prix,enseigne_code)')
    .eq('barcode', barcode)
    .maybeSingle();
  if (error || !data) return null;
  return productSnapshot(data);
}

export default async function handler(req, res) {
  const {
    NEXT_PUBLIC_SUPABASE_URL: url,
    SUPABASE_SERVICE_KEY: serviceKey,
  } = process.env;

  res.setHeader('Allow', 'GET, PATCH');
  if (!['GET', 'PATCH'].includes(req.method)) return res.status(405).end();
  if (!url || !serviceKey) return res.status(500).json({ erreur: 'Missing Supabase configuration' });

  const supabaseAdmin = createClient(url, serviceKey);
  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ erreur: 'Sign in to continue.' });

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ erreur: 'Session expired. Please sign in again.' });

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('saved_items')
        .select('id,item_type,item_id,snapshot,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        const missing = error.code === 'PGRST205' || error.message?.includes('saved_items');
        return res.status(missing ? 503 : 500).json({
          erreur: missing ? 'Saved items are not configured. Run supabase-saved-items-setup.sql.' : error.message,
        });
      }
      return res.status(200).json({ saved_items: data || [] });
    }

    const itemType = req.body?.item_type;
    const itemId = String(req.body?.item_id || '').trim().slice(0, 100);
    if (!['product', 'deal'].includes(itemType) || !itemId) {
      return res.status(400).json({ erreur: 'A valid item_type and item_id are required.' });
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('saved_items')
      .select('id')
      .eq('user_id', user.id)
      .eq('item_type', itemType)
      .eq('item_id', itemId)
      .maybeSingle();

    if (existingError) {
      const missing = existingError.code === 'PGRST205' || existingError.message?.includes('saved_items');
      return res.status(missing ? 503 : 500).json({
        erreur: missing ? 'Saved items are not configured. Run supabase-saved-items-setup.sql.' : existingError.message,
      });
    }

    if (existing) {
      const { error } = await supabaseAdmin.from('saved_items').delete().eq('id', existing.id);
      if (error) return res.status(500).json({ erreur: error.message });
      return res.status(200).json({ saved: false, item_type: itemType, item_id: itemId });
    }

    const snapshot = await buildSnapshot(supabaseAdmin, itemType, itemId);
    if (!snapshot) return res.status(404).json({ erreur: 'Item not found.' });

    const { data, error } = await supabaseAdmin
      .from('saved_items')
      .insert([{ user_id: user.id, item_type: itemType, item_id: itemId, snapshot }])
      .select('id,item_type,item_id,snapshot,created_at')
      .single();
    if (error) return res.status(500).json({ erreur: error.message });
    return res.status(200).json({ saved: true, item: data });
  } catch (error) {
    return res.status(500).json({ erreur: error.message || 'Internal server error' });
  }
}
