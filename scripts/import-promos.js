const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const zlib = require('zlib');

require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function telechargerGZ(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return telechargerGZ(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        zlib.gunzip(Buffer.concat(chunks), (err, result) => {
          if (err) reject(err);
          else resolve(result.toString('utf8'));
        });
      });
    }).on('error', reject);
  });
}

function parsePromos(xml, storeId, enseigneCode) {
  const promos = [];
  const promoRegex = /<Promotion>([\s\S]*?)<\/Promotion>/g;
  let promoMatch;

  while ((promoMatch = promoRegex.exec(xml)) !== null) {
    const promoXml = promoMatch[1];

    const getP = (tag) => {
      const m = promoXml.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`));
      return m ? m[1].trim() : '';
    };

    const description = getP('PromotionDescription');
    const dateDebut = getP('PromotionStartDateTime') || null;
    const dateFin = getP('PromotionEndDateTime') || null;

    // Parser les PromotionItems dans les Groups
    const itemRegex = /<PromotionItem>([\s\S]*?)<\/PromotionItem>/g;
    let itemMatch;

    while ((itemMatch = itemRegex.exec(promoXml)) !== null) {
      const itemXml = itemMatch[1];

      const getI = (tag) => {
        const m = itemXml.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`));
        return m ? m[1].trim() : '';
      };

      const barcode = getI('ItemCode');
      const prixPromo = parseFloat(getI('DiscountedPrice'));
      const rewardType = getI('RewardType');

      // Ignorer les items sans barcode valide ou sans prix promo
      if (!barcode || barcode === '0000000000000' || !prixPromo || prixPromo <= 0) continue;
      // Ignorer les RewardType 0 (pas de remise directe)
      if (rewardType === '0') continue;

      promos.push({
        barcode,
        enseigne_code: enseigneCode,
        store_id: storeId,
        prix_promo: prixPromo,
        description,
        date_debut: dateDebut,
        date_fin: dateFin,
      });
    }
  }

  // Dedupliquer par barcode+store (garder le prix le plus bas)
  const map = new Map();
  promos.forEach(p => {
    const key = `${p.barcode}-${p.store_id}`;
    if (!map.has(key) || p.prix_promo < map.get(key).prix_promo) {
      map.set(key, p);
    }
  });

  return Array.from(map.values());
}

async function importerPromosShufersal() {
  console.log('\nShufersal — import des promotions...');

  const html = await fetchHtml('https://prices.shufersal.co.il/FileObject/UpdateCategory?catID=3&storeId=0&take=300');
  const liens = html.match(/href="(https:\/\/pricesprodpublic[^"]+\.gz[^"]*)"/g) || [];

  console.log(`  ${liens.length} fichiers promo`);

  let totalPromos = 0;

  for (const lien of liens) {
    const url = lien.replace('href="', '').replace('"', '').replace(/&amp;/g, '&');
    const storeMatch = url.match(/Promo\d+-\d+-(\d+)-/);
    const storeId = storeMatch ? storeMatch[1] : '000';

    try {
      const xml = await telechargerGZ(url);
      const promos = parsePromos(xml, storeId, 'shufersal');

      if (promos.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < promos.length; i += batchSize) {
          const { error } = await supabase.from('promotions').upsert(
            promos.slice(i, i + batchSize),
            { onConflict: 'barcode,enseigne_code,store_id' }
          );
          if (error) console.log('  Erreur batch:', error.message);
        }
        totalPromos += promos.length;
        console.log(`  Magasin ${storeId}: ${promos.length} promos`);
      } else {
        console.log(`  Magasin ${storeId}: aucune promo`);
      }

      await new Promise(r => setTimeout(r, 200));
    } catch(e) {
      console.log(`  Erreur magasin ${storeId}: ${e.message}`);
    }
  }

  console.log(`\n  Total: ${totalPromos} promotions Shufersal`);
}

async function main() {
  console.log('Import promotions...');
  await importerPromosShufersal();
  console.log('\nTermine !');
  process.exit(0);
}

main();