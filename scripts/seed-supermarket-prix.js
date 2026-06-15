// Seeds prix for יוחננוף, אושר עד, כרפור so each appears as cheapest store for ~1/3 of products
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const STORES = ['yohananof', 'osher_ad', 'carrefour'];

async function main() {
  console.log('Fetching existing products with multi-store prices...');

  const { data: produits, error } = await supabase
    .from('produits')
    .select('barcode, prix(prix, enseigne_code)')
    .limit(600);

  if (error) { console.error('Fetch error:', error.message); process.exit(1); }

  const eligible = produits
    .filter(p => p.prix && p.prix.length >= 2)
    .slice(0, 90);

  console.log(`Found ${eligible.length} eligible products`);

  const newPrix = [];

  for (let i = 0; i < eligible.length; i++) {
    const produit = eligible[i];
    const existingCodes = produit.prix.map(p => p.enseigne_code);
    const existingPrices = produit.prix.map(p => p.prix).filter(p => p > 0);
    if (existingPrices.length === 0) continue;

    const minExisting = Math.min(...existingPrices);
    const avgExisting = existingPrices.reduce((s, p) => s + p, 0) / existingPrices.length;

    // Round-robin: each store is "champion" (cheapest of all) for 1/3 of products
    const champion = STORES[i % STORES.length];

    for (const store of STORES) {
      let prix;
      if (store === champion) {
        // Beat cheapest existing price by 8-14% — this store wins
        prix = Math.round(minExisting * 0.87 * 100) / 100;
      } else if (STORES.indexOf(store) === (STORES.indexOf(champion) + 1) % 3) {
        // Second cheapest — slightly above champion
        prix = Math.round(avgExisting * 0.94 * 100) / 100;
      } else {
        // Third — slightly above average
        prix = Math.round(avgExisting * 1.05 * 100) / 100;
      }
      if (prix <= 0) continue;
      newPrix.push({ barcode: produit.barcode, enseigne_code: store, prix });
    }
  }

  console.log(`Upserting ${newPrix.length} price records...`);

  let total = 0;
  for (let i = 0; i < newPrix.length; i += 200) {
    const batch = newPrix.slice(i, i + 200);
    const { data, error: insErr } = await supabase
      .from('prix')
      .upsert(batch, { onConflict: 'barcode,enseigne_code' })
      .select();
    if (insErr) {
      console.error(`Batch error:`, insErr.message);
      const { data: d2, error: e2 } = await supabase.from('prix').insert(batch).select();
      if (e2) { console.error('Insert also failed:', e2.message); continue; }
      total += d2?.length || 0;
    } else {
      total += data?.length || 0;
    }
  }

  console.log(`✓ Upserted ${total} price records`);
  console.log(`  יוחננוף cheapest for ~${Math.ceil(eligible.length / 3)} products`);
  console.log(`  אושר עד cheapest for ~${Math.ceil(eligible.length / 3)} products`);
  console.log(`  כרפור cheapest for ~${Math.ceil(eligible.length / 3)} products`);
  process.exit(0);
}

main();
