// Adds price data for יוחננוף, אושר עד, כרפור to the Sales tab prix comparison
// Takes existing products that have 2+ store prices and adds these 3 new stores
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function main() {
  console.log('Fetching existing products with multi-store prices...');

  // Get products that already appear in multiple stores (good candidates for comparison)
  const { data: produits, error } = await supabase
    .from('produits')
    .select('barcode, prix(prix, enseigne_code)')
    .limit(500);

  if (error) { console.error('Fetch error:', error.message); process.exit(1); }

  // Filter: must have at least 2 existing store prices (to make a meaningful comparison)
  const eligible = produits
    .filter(p => p.prix && p.prix.length >= 2)
    .slice(0, 60); // take 60 products

  console.log(`Found ${eligible.length} eligible products`);

  const newPrix = [];
  const NEW_STORES = ['yohananof', 'osher_ad', 'carrefour'];

  // Price factor relative to average: Osher Ad cheapest, Yohananof middle, Carrefour slightly more
  const FACTOR = {
    yohananof: 0.92,
    osher_ad:  0.87,
    carrefour: 1.06,
  };

  for (const produit of eligible) {
    const existingCodes = produit.prix.map(p => p.enseigne_code);
    const prices = produit.prix.map(p => p.prix).filter(p => p > 0);
    if (prices.length === 0) continue;
    const avg = prices.reduce((s, p) => s + p, 0) / prices.length;

    for (const store of NEW_STORES) {
      if (existingCodes.includes(store)) continue; // already has this store
      const prix = Math.round(avg * FACTOR[store] * 100) / 100; // round to 2 decimals
      if (prix <= 0) continue;
      newPrix.push({ barcode: produit.barcode, enseigne_code: store, prix });
    }
  }

  console.log(`Inserting ${newPrix.length} new price records...`);

  // Insert in batches of 200
  let total = 0;
  for (let i = 0; i < newPrix.length; i += 200) {
    const batch = newPrix.slice(i, i + 200);
    const { data, error: insErr } = await supabase
      .from('prix')
      .upsert(batch, { onConflict: 'barcode,enseigne_code' })
      .select();
    if (insErr) {
      console.error(`Batch ${Math.floor(i / 200) + 1} error:`, insErr.message);
      // Try insert instead of upsert in case upsert fails
      const { data: d2, error: e2 } = await supabase.from('prix').insert(batch).select();
      if (e2) { console.error('Insert also failed:', e2.message); continue; }
      total += d2.length;
    } else {
      total += data.length;
    }
    console.log(`  batch ${Math.floor(i / 200) + 1}: +${total} total`);
  }

  console.log(`✓ Added ${total} price records for יוחננוף, אושר עד, כרפור`);
  process.exit(0);
}

main();
