const { createClient } = require('@supabase/supabase-js');
const { inferProductCategory } = require('../lib/productCategories');

require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function main() {
  const reclassifyOther = process.argv.includes('--reclassify-other');
  const pageSize = 500;
  let lastBarcode = null;
  let updated = 0;

  while (true) {
    let query = supabase
      .from('produits')
      .select('barcode,nom,nom_en,categorie')
      .order('barcode', { ascending: true })
      .limit(pageSize);
    query = reclassifyOther ? query.eq('categorie', 'other') : query.is('categorie', null);
    if (lastBarcode) query = query.gt('barcode', lastBarcode);
    const { data, error } = await query;

    if (error) throw error;
    if (!data?.length) break;

    for (let i = 0; i < data.length; i += 100) {
      const batch = data.slice(i, i + 100).map(product => ({
        barcode: product.barcode,
        nom: product.nom,
        nom_en: product.nom_en,
        categorie: inferProductCategory(`${product.nom || ''} ${product.nom_en || ''}`),
      }));
      const { error: updateError } = await supabase
        .from('produits')
        .upsert(batch, { onConflict: 'barcode' });
      if (updateError) throw updateError;
      updated += batch.length;
    }

    console.log(`Classified ${updated} products...`);
    if (data.length < pageSize) break;
    lastBarcode = data[data.length - 1].barcode;
  }

  console.log(`Done. ${updated} products classified.`);
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
