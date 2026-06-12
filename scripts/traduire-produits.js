const { createClient } = require('@supabase/supabase-js');
const https = require('https');

require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function pause(ms) { return new Promise(r => setTimeout(r, ms)); }

async function traduire(texte) {
  return new Promise((resolve) => {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(texte)}&langpair=he|en`;
    https.get(url, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          const d = JSON.parse(b);
          resolve(d.responseData?.translatedText || null);
        } catch(e) { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

async function main() {
  console.log('Traduction produits hébreu → anglais...\n');

  const { data: produits, error } = await supabase
    .from('produits')
    .select('barcode, nom')
    .is('nom_en', null)
    .not('nom', 'is', null)
    .limit(1000);

  if (error) { console.error(error.message); process.exit(1); }
  console.log(`${produits.length} produits à traduire\n`);

  let traduits = 0;
  let echecs = 0;

  for (let i = 0; i < produits.length; i++) {
    const p = produits[i];
    if (!p.nom) continue;

    const traduction = await traduire(p.nom);

    if (traduction && traduction !== p.nom) {
      await supabase.from('produits').update({ nom_en: traduction }).eq('barcode', p.barcode);
      traduits++;
      if (traduits % 50 === 0) console.log(`  ${traduits}/${produits.length} traduits... ex: "${p.nom}" → "${traduction}"`);
    } else {
      echecs++;
    }

    await pause(350); // Respecter la limite MyMemory
  }

  console.log(`\nTerminé ! ${traduits} traduits, ${echecs} échecs`);
  process.exit(0);
}

main();