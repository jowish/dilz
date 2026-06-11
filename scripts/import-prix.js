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
    https.get(url, (res) => {
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
  console.log(`💾 Sauvegarde ${produits.length} produits pour ${enseigneCode}...`);
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

    if (error) console.error('Erreur batch:', error.message);
    
    if (i % 1000 === 0) console.log(`  ${i}/${produits.length}...`);
  }
  console.log(`✅ ${enseigneCode} sauvegardé !`);
}

async function importerShufersal() {
  console.log('\n📥 Shufersal...');
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
  console.log('Téléchargement...');
  const xml = await telechargerGZ(url);
  const produits = parseXMLPrix(xml);
  console.log(`${produits.length} produits trouvés`);
  await sauvegarderEnBase(produits, 'shufersal', '001');
}

async function importerRamiLevy() {
  console.log('\n📥 Rami Levy...');
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ q: '', aggs: 0, store: '331' });
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
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', async () => {
        try {
          const json = JSON.parse(body);
          const produits = (json.data || [])
            .map(p => ({
              barcode: String(p.barcode || p.id),
              nom: p.name,
              prix: p.price?.price || 0,
              quantite: '',
              unite: '',
            }))
            .filter(p => p.prix > 0);
          console.log(`${produits.length} produits trouvés`);
          await sauvegarderEnBase(produits, 'rami_levy', '331');
          resolve();
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('🚀 Import des prix dans Supabase...\n');
  try {
    await importerShufersal();
    await importerRamiLevy();
    console.log('\n🎉 Import terminé !');
  } catch(e) {
    console.error('Erreur:', e.message);
  }
  process.exit(0);
}

main();