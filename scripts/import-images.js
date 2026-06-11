const { createClient } = require('@supabase/supabase-js');
const https = require('https');

require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const GOOGLE_API_KEY = 'AIzaSyCQr8ZVMPRjIVt6at_ZKuvFn1IErfnawYk';
const SEARCH_ENGINE_ID = 'd4b13e0af63734b52';

function pause(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function chercherImage(nomProduit) {
  return new Promise((resolve) => {
    // On cherche avec des termes en anglais aussi pour plus de résultats
    const query = encodeURIComponent(nomProduit);
    const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${query}&searchType=image&num=3&imgSize=medium&safe=active&imgType=photo`;

    https.get(url, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          console.log('  API response:', json.searchInformation?.totalResults, 'results');
          if (json.error) console.log('  Error:', json.error.message);
          const image = json.items?.[0]?.link;
          resolve(image || null);
        } catch(e) {
          console.log('  Parse error:', e.message);
          resolve(null);
        }
      });
    }).on('error', e => { console.log('  Network error:', e.message); resolve(null); });
  });
}

async function main() {
  console.log('Recherche images...\n');

  const { data: produits } = await supabase
    .from('produits')
    .select('barcode, nom, image, prix(enseigne_code)')
    .is('image', null)
    .limit(20);

  const enPromo = (produits || []).filter(p => p.prix?.length >= 2);
  console.log(`${enPromo.length} produits en promo sans image\n`);

  for (let i = 0; i < Math.min(enPromo.length, 5); i++) {
    const produit = enPromo[i];
    console.log(`[${i+1}] ${produit.nom}`);
    const image = await chercherImage(produit.nom);
    if (image) {
      await supabase.from('produits').update({ image }).eq('barcode', produit.barcode);
      console.log(`  Sauvegarde: ${image.substring(0, 80)}`);
    }
    await pause(1200);
  }

  console.log('\nTermine!');
  process.exit(0);
}

main();