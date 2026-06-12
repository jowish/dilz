const { createClient } = require('@supabase/supabase-js');
const https = require('https');

require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function pause(ms) { return new Promise(r => setTimeout(r, ms)); }

async function chercherImageOpenFood(barcode) {
  return new Promise((resolve) => {
    https.get(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
    { headers: { 'User-Agent': 'Dilz/1.0' } }, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          const d = JSON.parse(b);
          resolve(d.product?.image_front_small_url || d.product?.image_url || null);
        } catch(e) { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

async function telechargerBuffer(url) {
  return new Promise((resolve) => {
    const mod = url.startsWith('https') ? https : require('http');
    mod.get(url, { headers: { 'User-Agent': 'Dilz/1.0' } }, (res) => {
      if (res.statusCode !== 200) { res.resume(); resolve(null); return; }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', () => resolve(null));
  });
}

async function main() {
  console.log('Import images via Open Food Facts...\n');

  // Produits sans image dans la base
  const { data: produits } = await supabase
    .from('produits')
    .select('barcode, nom, image')
    .is('image', null)
    .limit(500);

  console.log(`${produits?.length || 0} produits sans image\n`);

  let succes = 0;
  let echecs = 0;

  for (const produit of (produits || [])) {
    process.stdout.write(`[${succes + echecs + 1}] ${produit.nom?.substring(0, 35)}... `);

    const imageUrl = await chercherImageOpenFood(produit.barcode);

    if (!imageUrl) {
      process.stdout.write('pas trouvé\n');
      echecs++;
      await pause(200);
      continue;
    }

    // Télécharger l'image
    const buffer = await telechargerBuffer(imageUrl);
    if (!buffer || buffer.length < 500) {
      process.stdout.write('image vide\n');
      echecs++;
      await pause(200);
      continue;
    }

    // Uploader dans Supabase Storage
    const fileName = `${produit.barcode}.jpg`;
    const { error } = await supabase.storage
      .from('product-images')
      .upload(fileName, buffer, { contentType: 'image/jpeg', upsert: true });

    if (error) {
      process.stdout.write(`erreur upload: ${error.message}\n`);
      echecs++;
    } else {
      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      await supabase.from('produits')
        .update({ image: urlData.publicUrl })
        .eq('barcode', produit.barcode);

      process.stdout.write('✓\n');
      succes++;
    }

    await pause(300);
  }

  console.log(`\nTermine ! ${succes} images, ${echecs} non trouvés`);
  process.exit(0);
}

main();