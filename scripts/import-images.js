const { createClient } = require('@supabase/supabase-js');

const {
  extractOpenFoodFactsImages,
  extractShufersalImage,
  isGlobalTradeItemNumber,
} = require('../lib/productImages');

require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

function getArg(name, fallback) {
  const prefix = `--${name}=`;
  const value = process.argv.find(arg => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

const options = {
  statsOnly: process.argv.includes('--stats'),
  source: getArg('source', 'all'),
  limit: Math.max(1, Number.parseInt(getArg('limit', '500'), 10) || 500),
  retryDays: Math.max(1, Number.parseInt(getArg('retry-days', '30'), 10) || 30),
  shufersalDelay: Math.max(250, Number.parseInt(getArg('shufersal-delay', '500'), 10) || 500),
  offDelay: Math.max(6500, Number.parseInt(getArg('off-delay', '7000'), 10) || 7000),
};

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let metadataAvailable = true;

async function verifySchema() {
  const { error } = await supabase
    .from('produits')
    .select('barcode,image_source,image_status,image_checked_at')
    .limit(1);

  if (error) {
    metadataAvailable = false;
    console.warn('Image metadata is not installed yet. The import will work, but failed lookups cannot be cached.');
    console.warn('Run supabase-product-images-setup.sql before scheduling recurring imports.');
  }
}

async function countProducts(configure) {
  let query = supabase.from('produits').select('barcode', { count: 'exact', head: true });
  if (configure) query = configure(query);
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

async function printStats() {
  const [total, withImage, missing] = await Promise.all([
    countProducts(),
    countProducts(query => query.not('image', 'is', null).neq('image', '')),
    countProducts(query => query.is('image', null)),
  ]);

  const sources = {};
  if (metadataAvailable) {
    for (const source of ['rami_levy', 'shufersal', 'open_food_facts', 'cached', 'existing']) {
      sources[source] = await countProducts(query => query.eq('image_source', source));
    }
    sources.unknown = await countProducts(query => query.not('image', 'is', null).is('image_source', null));
  }

  console.log(JSON.stringify({
    total,
    withImage,
    missing,
    coveragePct: total ? Number((withImage / total * 100).toFixed(2)) : 0,
    sources,
  }, null, 2));
}

function retryCutoff() {
  return new Date(Date.now() - options.retryDays * 86400000).toISOString();
}

async function markProduct(barcode, values) {
  const update = metadataAvailable
    ? { ...values, image_checked_at: new Date().toISOString() }
    : (values.image ? { image: values.image } : null);
  if (!update) return;
  const { error } = await supabase
    .from('produits')
    .update(update)
    .eq('barcode', barcode);
  if (error) throw error;
}

async function readHtmlHead(response, maxBytes = 300000) {
  if (!response.body) return response.text();
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let html = '';

  while (html.length < maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    html += decoder.decode(value, { stream: true });
    if (html.toLowerCase().includes('</head>')) break;
  }

  await reader.cancel().catch(() => {});
  return html;
}

async function getShufersalCandidates() {
  let query = supabase
    .from('produits')
    .select(metadataAvailable
      ? 'barcode,nom,image_status,image_checked_at,prix!inner(enseigne_code)'
      : 'barcode,nom,prix!inner(enseigne_code)')
    .is('image', null)
    .eq('prix.enseigne_code', 'shufersal');

  if (metadataAvailable) {
    query = query.or(`image_checked_at.is.null,image_checked_at.lt.${retryCutoff()},image_status.eq.pending`);
  }
  const { data, error } = await query.limit(options.limit);

  if (error) throw error;
  return data || [];
}

async function importShufersalImages() {
  const products = await getShufersalCandidates();
  const stats = { checked: 0, found: 0, missing: 0, errors: 0 };
  console.log(`Shufersal: checking ${products.length} products...`);

  for (const product of products) {
    stats.checked += 1;
    try {
      const response = await fetch(
        `https://www.shufersal.co.il/online/he/p/P_${encodeURIComponent(product.barcode)}`,
        {
          redirect: 'follow',
          signal: AbortSignal.timeout(15000),
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Dilz/1.0; +https://dilz.app)',
            Accept: 'text/html',
          },
        }
      );

      const html = response.ok ? await readHtmlHead(response) : '';
      const image = response.ok
        ? extractShufersalImage(html, product.barcode, response.url)
        : null;

      if (image) {
        await markProduct(product.barcode, {
          image,
          image_source: 'shufersal',
          image_status: 'found',
        });
        stats.found += 1;
        console.log(`[Shufersal ${stats.checked}/${products.length}] found ${product.barcode}`);
      } else {
        await markProduct(product.barcode, {
          image_source: null,
          image_status: 'shufersal_missing',
        });
        stats.missing += 1;
      }
    } catch (error) {
      await markProduct(product.barcode, { image_status: 'error' }).catch(() => {});
      stats.errors += 1;
      console.warn(`[Shufersal] ${product.barcode}: ${error.message}`);
    }

    await pause(options.shufersalDelay);
  }

  return stats;
}

async function getOpenFoodFactsCandidates() {
  let query = supabase
    .from('produits')
    .select(metadataAvailable ? 'barcode,nom,image_status,image_checked_at' : 'barcode,nom')
    .is('image', null);

  if (metadataAvailable) {
    query = query.or(`image_checked_at.is.null,image_checked_at.lt.${retryCutoff()},image_status.eq.pending,image_status.eq.shufersal_missing`);
  }
  const { data, error } = await query.limit(options.limit * 2);

  if (error) throw error;
  return (data || []).filter(product => isGlobalTradeItemNumber(product.barcode)).slice(0, options.limit);
}

async function fetchOpenFoodFactsBatch(products, attempt = 1) {
  const params = new URLSearchParams({
    code: products.map(product => product.barcode).join(','),
    fields: 'code,product_name,image_front_url,image_url',
    page_size: String(products.length),
  });
  const contact = process.env.OPENFOODFACTS_CONTACT || 'contact@dilz.app';
  const response = await fetch(`https://world.openfoodfacts.org/api/v2/search?${params}`, {
    signal: AbortSignal.timeout(30000),
    headers: {
      'User-Agent': `Dilz/1.0 (${contact})`,
      Accept: 'application/json',
    },
  });

  if ((response.status === 429 || response.status === 503) && attempt < 4) {
    const backoff = options.offDelay * attempt * 2;
    console.warn(`Open Food Facts returned ${response.status}; retrying in ${Math.round(backoff / 1000)}s`);
    await pause(backoff);
    return fetchOpenFoodFactsBatch(products, attempt + 1);
  }

  if (!response.ok) throw new Error(`Open Food Facts HTTP ${response.status}`);
  return response.json();
}

async function importOpenFoodFactsImages() {
  const products = await getOpenFoodFactsCandidates();
  const stats = { checked: 0, found: 0, missing: 0, errors: 0 };
  const batchSize = 20;
  console.log(`Open Food Facts: checking ${products.length} products in exact-barcode batches...`);

  for (let index = 0; index < products.length; index += batchSize) {
    const batch = products.slice(index, index + batchSize);
    try {
      const payload = await fetchOpenFoodFactsBatch(batch);
      const images = extractOpenFoodFactsImages(payload);

      for (const product of batch) {
        const image = images.get(product.barcode);
        if (image) {
          await markProduct(product.barcode, {
            image,
            image_source: 'open_food_facts',
            image_status: 'found',
          });
          stats.found += 1;
        } else {
          await markProduct(product.barcode, {
            image_source: null,
            image_status: 'not_found',
          });
          stats.missing += 1;
        }
        stats.checked += 1;
      }
      console.log(`[Open Food Facts ${stats.checked}/${products.length}] ${stats.found} found`);
    } catch (error) {
      stats.errors += batch.length;
      console.warn(`[Open Food Facts] batch failed: ${error.message}`);
      for (const product of batch) {
        await markProduct(product.barcode, { image_status: 'error' }).catch(() => {});
      }
    }

    if (index + batchSize < products.length) await pause(options.offDelay);
  }

  return stats;
}

async function main() {
  await verifySchema();
  if (options.statsOnly) return printStats();

  if (!['all', 'shufersal', 'open-food-facts'].includes(options.source)) {
    throw new Error('source must be all, shufersal, or open-food-facts');
  }

  const results = {};
  if (options.source === 'all' || options.source === 'shufersal') {
    results.shufersal = await importShufersalImages();
  }
  if (options.source === 'all' || options.source === 'open-food-facts') {
    results.openFoodFacts = await importOpenFoodFactsImages();
  }

  console.log('\nImport complete');
  console.log(JSON.stringify(results, null, 2));
  await printStats();
}

main().catch(error => {
  console.error(error.message || error);
  process.exit(1);
});
