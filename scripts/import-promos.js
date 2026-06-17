const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const http = require('http');
const zlib = require('zlib');

require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchHtml(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function telechargerGZ(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return telechargerGZ(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        zlib.gunzip(buf, (err, result) => {
          if (err) {
            // Essayer sans décompression (certains fichiers ne sont pas gzippés)
            resolve(buf.toString('utf8'));
          } else {
            resolve(result.toString('utf8'));
          }
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
      const m = promoXml.match(new RegExp(`<${tag}[^>]*>(.*?)<\/${tag}>`, 'i'));
      return m ? m[1].trim() : '';
    };

    const description = getP('PromotionDescription');
    const dateDebut = getP('PromotionStartDateTime') || getP('PromotionStartDate') || null;
    const dateFin = getP('PromotionEndDateTime') || getP('PromotionEndDate') || null;
    const rewardType = getP('RewardType');
    const discountRate = parseFloat(getP('DiscountRate') || '0');

    if (!description) continue;

    const itemRegex = /<(?:GroupItem|PromotionItem)>([\s\S]*?)<\/(?:GroupItem|PromotionItem)>/g;
    let itemMatch;

    while ((itemMatch = itemRegex.exec(promoXml)) !== null) {
      const itemXml = itemMatch[1];

      const getI = (tag) => {
        const m = itemXml.match(new RegExp(`<${tag}[^>]*>(.*?)<\/${tag}>`, 'i'));
        return m ? m[1].trim() : '';
      };

      const barcode = getI('ItemCode');
      if (!barcode || barcode === '0000000000000' || barcode === '0') continue;

      let prixPromo = parseFloat(getI('DiscountedPrice') || getI('ItemPrice') || '0');

      // Pour les remises en pourcentage (RewardType 1)
      if (rewardType === '1' && discountRate > 0 && prixPromo <= 0) {
        // On stocke le taux, prix sera calculé à l'affichage
        prixPromo = discountRate; // On stocke le pourcentage temporairement
      }

      // RewardType 0 = produit offert (buy X get Y) — inclure même sans prix
      if (rewardType === '0') {
        prixPromo = 0;
      }

      // RewardType 10 = prix fixe promo — exiger un prix valide
      if (rewardType === '10' && prixPromo <= 0) continue;

      // Filtrer les articles vraiment sans info utile
      if (prixPromo <= 0 && rewardType !== '0') continue;

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

  // Dedupliquer par barcode+store (garder le prix le plus bas non-zéro, sinon 0)
  const map = new Map();
  promos.forEach(p => {
    const key = `${p.barcode}-${p.store_id}`;
    if (!map.has(key)) {
      map.set(key, p);
    } else {
      const existing = map.get(key);
      if (p.prix_promo > 0 && (existing.prix_promo === 0 || p.prix_promo < existing.prix_promo)) {
        map.set(key, p);
      }
    }
  });

  return Array.from(map.values());
}

async function upsertPromos(promos) {
  const batchSize = 200;
  for (let i = 0; i < promos.length; i += batchSize) {
    const batch = promos.slice(i, i + batchSize);
    const barcodes = [...new Set(batch.map(p => p.barcode))];
    const { data: existingProducts, error: productError } = await supabase
      .from('produits')
      .select('barcode')
      .in('barcode', barcodes);
    if (productError) {
      console.log('  Erreur verification produits:', productError.message);
      continue;
    }

    const existing = new Set((existingProducts || []).map(product => product.barcode));
    const validPromos = batch.filter(p => existing.has(p.barcode));
    if (validPromos.length === 0) continue;

    const { error } = await supabase.from('promotions').upsert(
      validPromos,
      { onConflict: 'barcode,enseigne_code,store_id' }
    );
    if (error) console.log('  Erreur batch:', error.message);
  }
}

async function importerShufersal() {
  console.log('\n=== Shufersal — import promotions ===');

  const html = await fetchHtml('https://prices.shufersal.co.il/FileObject/UpdateCategory?catID=3&storeId=0&take=300');
  const liens = html.match(/href="(https:\/\/pricesprodpublic[^"]+\.gz[^"]*)"/g) || [];
  const urls = [...new Set(liens.map(l => l.replace('href="', '').replace('"', '').replace(/&amp;/g, '&')))];

  console.log(`  ${urls.length} fichiers promo trouvés`);

  let totalPromos = 0;

  for (const url of urls) {
    const storeMatch = url.match(/Promo\d+-\d+-(\d+)-/);
    const storeId = storeMatch ? storeMatch[1] : '000';

    try {
      const xml = await telechargerGZ(url);
      const promos = parsePromos(xml, storeId, 'shufersal');

      if (promos.length > 0) {
        await upsertPromos(promos);
        totalPromos += promos.length;
        process.stdout.write(`  Magasin ${storeId}: ${promos.length} promos\n`);
      }

      await new Promise(r => setTimeout(r, 150));
    } catch(e) {
      process.stdout.write(`  Erreur magasin ${storeId}: ${e.message}\n`);
    }
  }

  console.log(`\n  ✓ Shufersal: ${totalPromos} promotions`);
  return totalPromos;
}

async function importerVictory() {
  console.log('\n=== Victory — import promotions ===');

  try {
    const html = await fetchHtml('https://victory.co.il/FileObject/UpdateCategory?catID=3&storeId=0&take=300');
    const liens = html.match(/href="([^"]+Promo[^"]+\.gz[^"]*)"/g) || [];
    const urls = [...new Set(liens.map(l => l.replace('href="', '').replace('"', '').replace(/&amp;/g, '&')))];

    if (urls.length === 0) {
      console.log('  Aucun fichier trouvé');
      return 0;
    }

    console.log(`  ${urls.length} fichiers promo`);
    let totalPromos = 0;

    for (const url of urls) {
      const storeMatch = url.match(/Promo\d+-\d+-(\d+)-/);
      const storeId = storeMatch ? storeMatch[1] : '000';

      try {
        const xml = await telechargerGZ(url);
        const promos = parsePromos(xml, storeId, 'victory');
        if (promos.length > 0) {
          await upsertPromos(promos);
          totalPromos += promos.length;
          process.stdout.write(`  Magasin ${storeId}: ${promos.length} promos\n`);
        }
        await new Promise(r => setTimeout(r, 150));
      } catch(e) {
        process.stdout.write(`  Erreur magasin ${storeId}: ${e.message}\n`);
      }
    }

    console.log(`\n  ✓ Victory: ${totalPromos} promotions`);
    return totalPromos;
  } catch(e) {
    console.log(`  Victory non disponible: ${e.message}`);
    return 0;
  }
}

async function fetchHtml2(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      }
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchHtml2(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function importerCerberusPromos(chainId, enseigneCode, enseigneNom) {
  console.log(`\n=== ${enseigneNom} (Cerberus promos) ===`);

  try {
    const html = await fetchHtml2(`https://publishedprices.co.il/file/d/${chainId}`);
    const liens = [...(html.matchAll(/href="([^"]*Promo[^"]*\.gz[^"]*)"/gi))];
    const urls = [...new Set(liens.map(m => {
      const path = m[1];
      return path.startsWith('http') ? path : `https://publishedprices.co.il${path}`;
    }))];

    if (urls.length === 0) {
      console.log('  Aucun fichier promo trouve');
      return 0;
    }

    console.log(`  ${urls.length} fichiers promo`);
    let totalPromos = 0;

    for (const url of urls) {
      try {
        const storeMatch = url.match(/Promo[^-]*-[^-]*-(\d+)-/);
        const storeId = storeMatch ? storeMatch[1] : '000';
        const xml = await telechargerGZ(url);
        const promos = parsePromos(xml, storeId, enseigneCode);
        if (promos.length > 0) {
          await upsertPromos(promos);
          totalPromos += promos.length;
        }
        await new Promise(r => setTimeout(r, 150));
      } catch(e) {
        // skip failed files silently
      }
    }

    console.log(`\n  ✓ ${enseigneNom}: ${totalPromos} promotions`);
    return totalPromos;
  } catch(e) {
    console.log(`  ${enseigneNom} non disponible: ${e.message}`);
    return 0;
  }
}

function parseStaticPriceFiles(html, kind) {
  const path = html.match(/const\s+path\s*=\s*['"]([^'"]+)['"]/)?.[1];
  const filesJson = html.match(/const\s+files\s*=\s*(\[[\s\S]*?\]);/)?.[1];
  if (!path || !filesJson) return [];

  let files = [];
  try {
    files = JSON.parse(filesJson);
  } catch {
    return [];
  }

  const byStore = new Map();
  const prefix = kind === 'promo' ? 'PromoFull' : 'PriceFull';

  for (const file of files) {
    const name = file.name || '';
    if (!name.startsWith(prefix) || !name.endsWith('.gz')) continue;
    const parts = name
      .replace(new RegExp(`^${prefix}\\d+-`), '')
      .replace(/-\d{8}.*\.gz$/, '')
      .split('-')
      .filter(Boolean);
    const storeId = parts[0] === '001' && parts[1] ? parts[1] : parts[0];
    if (!storeId) continue;

    const current = byStore.get(storeId);
    if (!current || name > current.name) {
      byStore.set(storeId, {
        storeId,
        name,
        url: `https://prices.carrefour.co.il/${path}/${name}`,
      });
    }
  }

  return [...byStore.values()];
}

async function importerCarrefourPromos() {
  console.log('\n=== Carrefour — import promotions officiel ===');
  const html = await fetchHtml('https://prices.carrefour.co.il/');
  const links = parseStaticPriceFiles(html, 'promo');
  console.log(`  ${links.length} magasins avec PromoFull recent`);

  let totalPromos = 0;
  for (const { storeId, url } of links) {
    try {
      const xml = await telechargerGZ(url);
      const promos = parsePromos(xml, storeId, 'carrefour');
      if (promos.length > 0) {
        await upsertPromos(promos);
        totalPromos += promos.length;
        process.stdout.write(`  Magasin ${storeId}: ${promos.length} promos\n`);
      }
      await new Promise(r => setTimeout(r, 150));
    } catch(e) {
      process.stdout.write(`  Erreur magasin ${storeId}: ${e.message}\n`);
    }
  }

  console.log(`\n  ✓ Carrefour: ${totalPromos} promotions`);
  return totalPromos;
}

async function main() {
  console.log('=== Import promotions ===');
  const t0 = Date.now();

  const [shuf, vic, yoh, car] = await Promise.allSettled([
    importerShufersal(),
    importerVictory(),
    importerCerberusPromos('7290058179503', 'yohananof', 'Yohananof'),
    importerCarrefourPromos(),
  ]);

  const total = [shuf, vic, yoh, car]
    .filter(r => r.status === 'fulfilled')
    .reduce((sum, r) => sum + (r.value || 0), 0);

  console.log(`\n✓ Total: ${total} promotions en ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  process.exit(0);
}

main();
