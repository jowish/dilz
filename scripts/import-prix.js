const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const zlib = require('zlib');

require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function parseXMLPrix(xml) {
  const produits = [];
  const regex = /<Item>([\s\S]*?)<\/Item>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    const item = match[1];
    const get = (tag) => {
      const m = item.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`));
      return m ? m[1].trim() : '';
    };
    const prix = parseFloat(get('ItemPrice'));
    if (prix > 0 && get('ItemCode')) {
      produits.push({
        barcode: get('ItemCode'),
        nom: get('ItemName'),
        prix,
        quantite: get('Quantity'),
        unite: get('UnitQty'),
      });
    }
  }
  return produits;
}

async function telechargerGZ(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : require('http');
    mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return telechargerGZ(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        zlib.gunzip(buffer, (err, result) => {
          if (err) reject(err);
          else resolve(result.toString('utf8'));
        });
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function sauvegarderEnBase(produits, enseigneCode, storeId) {
  const batchSize = 100;
  for (let i = 0; i < produits.length; i += batchSize) {
    const batch = produits.slice(i, i + batchSize);
    await supabase.from('produits').upsert(
      batch.map(p => ({ barcode: p.barcode, nom: p.nom, ...(p.image ? { image: p.image } : {}) })),
      { onConflict: 'barcode' }
    );
    await supabase.from('prix').upsert(
      batch.map(p => ({
        barcode: p.barcode,
        enseigne_code: enseigneCode,
        store_id: storeId,
        prix: p.prix,
        quantite: p.quantite || '',
        unite: p.unite || '',
        mis_a_jour: new Date().toISOString()
      })),
      { onConflict: 'barcode,enseigne_code,store_id' }
    );
  }
}

async function importerShufersal() {
  console.log('\nShufersal — import de tous les magasins...');

  // Recuperer la liste de tous les fichiers disponibles
  const html = await fetchHtml('https://prices.shufersal.co.il/FileObject/UpdateCategory?catID=2&storeId=0&take=300');

  // Extraire tous les liens gz
  const liens = html.match(/href="(https:\/\/pricesprodpublic[^"]+\.gz[^"]*)"/g) || [];
  const urls = [...new Set(liens.map(l => l.replace('href="', '').replace('"', '').replace(/&amp;/g, '&')))];

  console.log(`  ${urls.length} fichiers trouves`);

  const tousLesProduits = new Map();
  let magasinsTraites = 0;

  for (const url of urls) {
    try {
      const storeMatch = url.match(/PriceFull\d+-\d+-(\d+)-/);
      const storeId = storeMatch ? storeMatch[1] : '000';

      console.log(`  Magasin ${storeId}...`);
      const xml = await telechargerGZ(url);
      const produits = parseXMLPrix(xml);

      let nouveaux = 0;
      produits.forEach(p => {
        if (!tousLesProduits.has(p.barcode)) {
          tousLesProduits.set(p.barcode, { ...p, storeId });
          nouveaux++;
        }
      });

      console.log(`    ${produits.length} produits, ${nouveaux} nouveaux (total: ${tousLesProduits.size})`);
      magasinsTraites++;

      await new Promise(r => setTimeout(r, 300));
    } catch(e) {
      console.log(`    Erreur: ${e.message}`);
    }
  }

  console.log(`\n  Total Shufersal: ${tousLesProduits.size} produits uniques sur ${magasinsTraites} magasins`);

  // Sauvegarder par batch
  const produits = Array.from(tousLesProduits.values());
  await sauvegarderEnBase(produits, 'shufersal', '001');
  console.log('  Shufersal OK !');
}

async function postRL(body) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: 'www.rami-levy.co.il',
      path: '/api/catalog',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'accept': 'application/json',
        'locale': 'he',
        'user-agent': 'Mozilla/5.0',
        'origin': 'https://www.rami-levy.co.il',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    const req = https.request(options, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try { resolve(JSON.parse(b)); }
        catch(e) { resolve({ data: [], total: 0 }); }
      });
    });
    req.on('error', () => resolve({ data: [], total: 0 }));
    req.setTimeout(10000, () => { req.destroy(); resolve({ data: [], total: 0 }); });
    req.write(data);
    req.end();
  });
}

async function importerRamiLevy() {
  console.log('\nRami Levy — pagination complete...');
  const tousLesProduits = new Map();
  const first = await postRL({ store: '331', q: '', from: 0, size: 30 });
  const total = first.total || 0;
  console.log(`  Total catalogue: ${total}`);

  const traiter = (items) => {
    (items || []).forEach(p => {
      if (p.price?.price > 0 && p.name) {
        tousLesProduits.set(String(p.barcode || p.id), {
          barcode: String(p.barcode || p.id),
          nom: p.name,
          prix: p.price.price,
          quantite: '',
          unite: '',
          image: p.images?.small ? `https://www.rami-levy.co.il${p.images.small}` : null
        });
      }
    });
  };

  traiter(first.data);

  for (let from = 30; from < total; from += 30) {
    const res = await postRL({ store: '331', q: '', from, size: 30 });
    const avant = tousLesProduits.size;
    traiter(res.data);
    if (from % 600 === 0) console.log(`  ${from}/${total} — ${tousLesProduits.size} uniques`);
    if (tousLesProduits.size === avant && from > 300) { console.log('  Arret pagination'); break; }
    await new Promise(r => setTimeout(r, 150));
  }

  const produits = Array.from(tousLesProduits.values());
  console.log(`  ${produits.length} produits uniques`);
  await sauvegarderEnBase(produits, 'rami_levy', '331');
  console.log('  Rami Levy OK !');
}

async function importerVictory() {
  console.log('\nVictory — import de tous les magasins...');
  const EDI = '7290696200003';

  const filesRes = await new Promise((resolve, reject) => {
    https.get(`https://laibcatalog.co.il/webapi/api/getfiles?edi=${EDI}`, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { resolve([]); }
      });
    }).on('error', reject);
  });

  const fichiersPriceFull = filesRes.filter(f => f.fileType === 'pricefull');
  console.log(`  ${fichiersPriceFull.length} fichiers PriceFull`);

  const tousLesProduits = new Map();

  for (const fichier of fichiersPriceFull) {
    const url = `https://laibcatalog.co.il/webapi/${EDI}/${fichier.fileName}`;
    try {
      const xml = await telechargerGZ(url);
      const produits = parseXMLPrix(xml);
      let nouveaux = 0;
      produits.forEach(p => {
        if (!tousLesProduits.has(p.barcode)) {
          tousLesProduits.set(p.barcode, p);
          nouveaux++;
        }
      });
      console.log(`  Magasin ${fichier.branchNumber}: ${produits.length} produits, ${nouveaux} nouveaux (total: ${tousLesProduits.size})`);
    } catch(e) {
      console.log(`  Erreur magasin ${fichier.branchNumber}: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 300));
  }

  const produits = Array.from(tousLesProduits.values());
  console.log(`\n  Total Victory: ${produits.length} produits uniques`);
  await sauvegarderEnBase(produits, 'victory', '001');
  console.log('  Victory OK !');
}

async function fetchHtmlCerberus(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : require('http');
    mod.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
      }
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchHtmlCerberus(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function importerCerberus(chainId, enseigneCode, enseigneNom) {
  console.log(`\n${enseigneNom} (Cerberus ${chainId})...`);
  const listUrl = `https://publishedprices.co.il/file/d/${chainId}`;

  try {
    const html = await fetchHtmlCerberus(listUrl);
    const liens = [...(html.matchAll(/href="([^"]*PriceFull[^"]*\.gz[^"]*)"/gi))];
    const urls = [...new Set(liens.map(m => {
      const path = m[1];
      return path.startsWith('http') ? path : `https://publishedprices.co.il${path}`;
    }))];

    if (urls.length === 0) {
      console.log(`  Aucun fichier PriceFull trouve (${liens.length} liens trouves au total)`);
      return;
    }

    console.log(`  ${urls.length} fichiers PriceFull`);
    const tousLesProduits = new Map();

    for (const url of urls) {
      try {
        const xml = await telechargerGZ(url);
        const produits = parseXMLPrix(xml);
        produits.forEach(p => {
          if (!tousLesProduits.has(p.barcode)) tousLesProduits.set(p.barcode, p);
        });
        await new Promise(r => setTimeout(r, 300));
      } catch(e) {
        // skip failed files silently
      }
    }

    const produits = Array.from(tousLesProduits.values());
    console.log(`  ${produits.length} produits uniques`);
    if (produits.length > 0) await sauvegarderEnBase(produits, enseigneCode, '001');
    console.log(`  ${enseigneNom} OK !`);
  } catch(e) {
    console.log(`  ${enseigneNom} non disponible: ${e.message}`);
  }
}

async function main() {
  console.log('Demarrage import complet...\n');
  try {
    await importerShufersal();
    await importerRamiLevy();
    await importerVictory();
    await importerCerberus('7290058179503', 'yohananof', 'Yohananof');
    await importerCerberus('7290058140886', 'carrefour', 'Carrefour');
    console.log('\nImport termine !');
  } catch(e) {
    console.error('Erreur:', e.message);
  }
  process.exit(0);
}

main();