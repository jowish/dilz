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
    if (prix > 0) {
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
    mod.get(url, (res) => {
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

async function sauvegarderEnBase(produits, enseigneCode, storeId) {
  console.log(`  Sauvegarde ${produits.length} produits...`);
  const batchSize = 100;
  for (let i = 0; i < produits.length; i += batchSize) {
    const batch = produits.slice(i, i + batchSize);
    await supabase.from('produits').upsert(
      batch.map(p => ({ barcode: p.barcode, nom: p.nom })),
      { onConflict: 'barcode' }
    );
    const { error } = await supabase.from('prix').upsert(
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
    if (error) console.error('Erreur:', error.message);
    if (i % 2000 === 0 && i > 0) console.log(`  ${i}/${produits.length}...`);
  }
}

async function importerShufersal() {
  console.log('\nShufersal...');
  const listePage = await new Promise((resolve, reject) => {
    https.get('https://prices.shufersal.co.il/FileObject/UpdateCategory?catID=2&storeId=1', (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
  const urlMatch = listePage.match(/href="(https:\/\/pricesprodpublic[^"]+\.gz[^"]*)"/);
  if (!urlMatch) throw new Error('URL Shufersal introuvable');
  const url = urlMatch[1].replace(/&amp;/g, '&');
  const xml = await telechargerGZ(url);
  const produits = parseXMLPrix(xml);
  console.log(`  ${produits.length} produits`);
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
  console.log('\nRami Levy...');
  const tousLesProduits = new Map();
  const first = await postRL({ store: '331', q: '', from: 0, size: 30 });
  const total = first.total || 0;
  console.log(`  Total catalogue: ${total}`);
  (first.data || []).forEach(p => {
    if (p.price?.price > 0 && p.name) {
      tousLesProduits.set(String(p.barcode || p.id), {
        barcode: String(p.barcode || p.id),
        nom: p.name, prix: p.price.price, quantite: '', unite: ''
      });
    }
  });
  for (let from = 30; from < total; from += 30) {
    const res = await postRL({ store: '331', q: '', from, size: 30 });
    let nouveaux = 0;
    (res.data || []).forEach(p => {
      if (p.price?.price > 0 && p.name) {
        const key = String(p.barcode || p.id);
        if (!tousLesProduits.has(key)) nouveaux++;
        tousLesProduits.set(key, { barcode: key, nom: p.name, prix: p.price.price, quantite: '', unite: '' });
      }
    });
    if (from % 600 === 0) console.log(`  ${from}/${total} — ${tousLesProduits.size} uniques`);
    if (nouveaux === 0 && from > 300) { console.log('  Arret pagination'); break; }
    await new Promise(r => setTimeout(r, 150));
  }
  const produits = Array.from(tousLesProduits.values());
  console.log(`  ${produits.length} produits uniques`);
  await sauvegarderEnBase(produits, 'rami_levy', '331');
  console.log('  Rami Levy OK !');
}

async function importerVictory() {
  console.log('\nVictory...');
  const EDI = '7290696200003';
  
  // Recuperer la liste des fichiers PriceFull
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
  console.log(`  ${fichiersPriceFull.length} fichiers PriceFull trouves`);

  const tousLesProduits = new Map();

  // Prendre les 5 premiers magasins pour avoir une bonne couverture
  for (const fichier of fichiersPriceFull.slice(0, 5)) {
    const url = `https://laibcatalog.co.il/webapi/${EDI}/${fichier.fileName}`;
    console.log(`  Telechargement magasin ${fichier.branchNumber}...`);
    
    try {
      const xml = await telechargerGZ(url);
      const produits = parseXMLPrix(xml);
      produits.forEach(p => {
        if (!tousLesProduits.has(p.barcode)) {
          tousLesProduits.set(p.barcode, p);
        }
      });
      console.log(`  Magasin ${fichier.branchNumber}: ${produits.length} produits (total: ${tousLesProduits.size})`);
    } catch(e) {
      console.log(`  Erreur magasin ${fichier.branchNumber}:`, e.message);
    }
    
    await new Promise(r => setTimeout(r, 500));
  }

  const produits = Array.from(tousLesProduits.values());
  console.log(`  ${produits.length} produits Victory uniques`);
  await sauvegarderEnBase(produits, 'victory', '001');
  console.log('  Victory OK !');
}

async function main() {
  console.log('Demarrage import...');
  try {
    await importerShufersal();
    await importerRamiLevy();
    await importerVictory();
    console.log('\nImport termine !');
  } catch(e) {
    console.error('Erreur:', e.message);
  }
  process.exit(0);
}

main();