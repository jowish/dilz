/**
 * Deal Bot — auto-découverte de deals depuis KSP.co.il et autres sources
 * Usage: node scripts/deal-bot.js
 * Insère les deals en statut='pending', admin approuve via /api/admin/approve?id=XXX&token=TOKEN
 */
const { createClient } = require('@supabase/supabase-js');
const https = require('https');

require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function fetchJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const opts = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/html, */*',
        'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8',
        ...options.headers,
      },
      ...options,
    };
    const req = https.get(url, opts, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchJson(res.headers.location, options).then(resolve).catch(reject);
      }
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body, json: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, body, json: null }); }
      });
    });
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.on('error', reject);
  });
}

// Extraire les données __NEXT_DATA__ depuis une page Next.js
function extractNextData(html) {
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

async function scrapeKSP() {
  console.log('\n=== KSP.co.il — recherche deals ===');
  const deals = [];

  try {
    // KSP a une API JSON pour leurs catégories
    const categories = [
      { id: '540', name: 'מחשבים ניידים' }, // Laptops
      { id: '541', name: 'מחשבים נייחים' }, // Desktop PCs
      { id: '549', name: 'טאבלטים' },        // Tablets
      { id: '543', name: 'סמארטפונים' },     // Smartphones
      { id: '547', name: 'אוזניות' },        // Headphones
    ];

    for (const cat of categories) {
      try {
        const url = `https://ksp.co.il/web/api/category/${cat.id}?from=0&size=20&sort=discount`;
        const { json } = await fetchJson(url);

        if (json && json.result) {
          (json.result || []).forEach(item => {
            const prix = item.price?.price || item.price || 0;
            const prixOriginal = item.oldPrice?.price || item.oldPrice || 0;
            if (!prix || !item.name) return;

            const reduction = prixOriginal > prix
              ? Math.round((prixOriginal - prix) / prixOriginal * 100)
              : 0;

            if (reduction < 10) return; // Ignorer les petites réductions

            deals.push({
              titre: item.name,
              description: item.description || `${reduction}% de réduction chez KSP`,
              prix,
              prix_original: prixOriginal || null,
              magasin: 'KSP',
              ville: null,
              categorie: 'Tech',
              url_source: item.url ? `https://ksp.co.il${item.url}` : 'https://ksp.co.il',
              image_url: item.img ? `https://ksp.co.il${item.img}` : null,
              auteur_nom: 'DilzBot',
              statut: 'pending',
            });
          });
        }

        await new Promise(r => setTimeout(r, 500));
      } catch(e) {
        console.log(`  Catégorie ${cat.id} erreur: ${e.message}`);
      }
    }

    // Essai alternatif via page HTML si l'API ne marche pas
    if (deals.length === 0) {
      console.log('  API KSP non disponible, essai via HTML...');
      const { body } = await fetchJson('https://ksp.co.il/web/cat/4'); // Clearance
      const nextData = extractNextData(body);
      if (nextData?.props?.pageProps?.products) {
        (nextData.props.pageProps.products || []).forEach(item => {
          const prix = item.price || 0;
          const prixOriginal = item.oldPrice || 0;
          if (!prix || !item.name) return;
          const reduction = prixOriginal > prix ? Math.round((prixOriginal - prix) / prixOriginal * 100) : 0;
          if (reduction < 10) return;
          deals.push({
            titre: item.name,
            description: `${reduction}% de réduction — ${item.description || ''}`.trim(),
            prix, prix_original: prixOriginal || null,
            magasin: 'KSP', ville: null, categorie: 'Tech',
            url_source: item.url ? `https://ksp.co.il${item.url}` : 'https://ksp.co.il',
            image_url: item.img ? `https://ksp.co.il${item.img}` : null,
            auteur_nom: 'DilzBot', statut: 'pending',
          });
        });
      }
    }

    console.log(`  ${deals.length} deals KSP trouvés`);
  } catch(e) {
    console.log(`  KSP erreur globale: ${e.message}`);
  }

  return deals;
}

async function scrapeIceCat() {
  console.log('\n=== iCE (ice.co.il) — recherche deals ===');
  const deals = [];

  try {
    // ICE est un site israélien de comparaison de prix tech
    const { json } = await fetchJson('https://www.ice.co.il/api/products?sort=discount&limit=20&category=1');
    if (json && Array.isArray(json.products)) {
      json.products.forEach(item => {
        const prix = item.minPrice || 0;
        const prixOriginal = item.maxPrice || 0;
        if (!prix || !item.name) return;
        const reduction = prixOriginal > prix ? Math.round((prixOriginal - prix) / prixOriginal * 100) : 0;
        if (reduction < 15) return;
        deals.push({
          titre: item.name,
          description: item.description || `Meilleur prix: ₪${prix}`,
          prix, prix_original: prixOriginal || null,
          magasin: 'ICE', ville: null, categorie: 'Tech',
          url_source: item.url ? `https://www.ice.co.il${item.url}` : 'https://www.ice.co.il',
          image_url: item.image || null,
          auteur_nom: 'DilzBot', statut: 'pending',
        });
      });
    }
    console.log(`  ${deals.length} deals ICE trouvés`);
  } catch(e) {
    console.log(`  ICE non disponible: ${e.message}`);
  }

  return deals;
}

async function eviterDoublons(deals) {
  // Vérifier les deals récents pour éviter les doublons (dernières 24h)
  const hier = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data } = await supabase
    .from('bons_plans')
    .select('titre, magasin')
    .eq('auteur_nom', 'DilzBot')
    .gte('created_at', hier);

  const existants = new Set((data || []).map(d => `${d.magasin}:${d.titre}`));

  return deals.filter(d => !existants.has(`${d.magasin}:${d.titre}`));
}

async function insererDeals(deals) {
  if (deals.length === 0) return 0;

  const { data, error } = await supabase
    .from('bons_plans')
    .insert(deals.map(d => ({
      ...d,
      votes_chaud: 0,
      votes_froid: 0,
    })))
    .select('id, titre');

  if (error) {
    console.log(`  Erreur insertion: ${error.message}`);
    return 0;
  }

  console.log(`\n  ✓ ${data?.length || 0} deals insérés en statut=pending`);
  if (data) {
    data.forEach(d => console.log(`    #${d.id} — ${d.titre}`));
  }
  return data?.length || 0;
}

async function main() {
  console.log('=== Deal Bot Dilz ===');
  const t0 = Date.now();

  const [kspDeals, iceDeals] = await Promise.allSettled([
    scrapeKSP(),
    scrapeIceCat(),
  ]);

  const tousLesDeals = [
    ...(kspDeals.status === 'fulfilled' ? kspDeals.value : []),
    ...(iceDeals.status === 'fulfilled' ? iceDeals.value : []),
  ];

  console.log(`\nTotal brut: ${tousLesDeals.length} deals`);

  const nouveaux = await eviterDoublons(tousLesDeals);
  console.log(`Après déduplication: ${nouveaux.length} nouveaux deals`);

  const inserted = await insererDeals(nouveaux);

  console.log(`\n✓ Bot terminé en ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log(`  ${inserted} deals en attente d'approbation`);
  console.log(`  Approuver: GET /api/admin/approve?id=XXX&token=ADMIN_BOT_TOKEN`);
  console.log(`  Rejeter:   GET /api/admin/reject?id=XXX&token=ADMIN_BOT_TOKEN`);

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
