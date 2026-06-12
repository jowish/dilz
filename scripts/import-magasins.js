const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const zlib = require('zlib');

require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Mapping codes postaux israeliens -> noms de villes
const VILLES = {
  '1000': 'ירושלים', '3000': 'ירושלים', '9000': 'ירושלים', '9100': 'ירושלים',
  '6100': 'תל אביב', '6200': 'תל אביב', '6400': 'תל אביב', '6700': 'תל אביב',
  '6900': 'תל אביב', '7100': 'תל אביב', '6800': 'תל אביב',
  '3200': 'חיפה', '3400': 'חיפה', '3500': 'חיפה', '4000': 'חיפה', '5000': 'חיפה',
  '2000': 'ב"ש', '8400': 'באר שבע', '8410': 'באר שבע', '8420': 'באר שבע',
  '5200': 'נתניה', '4200': 'נתניה', '4250': 'נתניה',
  '7400': 'רחובות', '7600': 'רחובות', '7900': 'רחובות',
  '4400': 'פתח תקווה', '4900': 'פתח תקווה',
  '5300': 'הרצליה', '4600': 'הרצליה',
  '4800': 'רעננה', '4310': 'כפר סבא',
  '6600': 'רמת גן', '5200': 'גבעתיים',
  '5600': 'חולון', '5800': 'בת ים',
  '7000': 'ראשל"צ', '7500': 'ראשון לציון',
  '8800': 'אשקלון', '8200': 'אשקלון',
  '7700': 'אשדוד', '7730': 'אשדוד',
  '1800': 'נצרת', '1700': 'עפולה',
  '2200': 'טבריה', '1400': 'טבריה',
  '2800': 'בית שאן', '2300': 'עכו',
  '2400': 'נהריה', '2500': 'כרמיאל',
  '3600': 'קריות', '3100': 'קריות',
  '4500': 'כפר יונה', '4300': 'רא"ש',
  '7200': 'נס ציונה', '7300': 'גדרה',
  '8300': 'קריית גת', '8600': 'קריית מלאכי',
  '7800': 'מודיעין', '7130': 'מודיעין',
  '9500': 'מעלה אדומים', '9700': 'בית שמש',
  '9900': 'אלעד', '5400': 'כפר שמריהו',
  '70': 'מרכז הארץ', '20': 'צפון',
  '40': 'שרון', '50': 'שפלה',
  '60': 'דרום', '80': 'נגב',
  '2530': 'באר יעקב', '5560': 'הוד השרון',
  '4370': 'רמת השרון', '6578': 'תל אביב',
  '4527': 'גן יבנה', '7670': 'גן יבנה',
};

function getCityName(code) {
  if (!code) return null;
  // Essai direct
  if (VILLES[code]) return VILLES[code];
  // Essai avec les 4 premiers chiffres
  const prefix4 = code.substring(0, 4);
  if (VILLES[prefix4]) return VILLES[prefix4];
  // Essai avec les 2 premiers chiffres
  const prefix2 = code.substring(0, 2);
  if (VILLES[prefix2]) return VILLES[prefix2];
  return null;
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

async function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseXMLStores(xml) {
  const magasins = [];
  const regex = /<Store>([\s\S]*?)<\/Store>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    const item = match[1];
    const get = (tag) => {
      const m = item.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`));
      return m ? m[1].trim() : '';
    };
    const codeVille = get('City');
    const nomVille = getCityName(codeVille);
    magasins.push({
      store_id: get('StoreID'),
      nom: get('StoreName'),
      adresse: get('Address'),
      ville: nomVille || get('StoreName').split(' ').slice(1).join(' ') || codeVille,
      code_ville: codeVille,
    });
  }
  return magasins;
}

async function importerMagasinsShufersal() {
  console.log('\nShufersal — import des magasins avec villes...');
  
  const html = await fetchHtml('https://prices.shufersal.co.il/FileObject/UpdateCategory?catID=5&storeId=0&take=5');
  const liens = html.match(/href="(https:\/\/pricesprodpublic[^"]+\.gz[^"]*)"/g) || [];
  
  if (liens.length === 0) { console.log('Aucun fichier trouvé'); return; }
  
  const url = liens[0].replace('href="', '').replace('"', '').replace(/&amp;/g, '&');
  const xml = await telechargerGZ(url);
  const magasins = parseXMLStores(xml);
  
  // Stats des villes
  const villesMap = {};
  magasins.forEach(m => {
    if (!villesMap[m.ville]) villesMap[m.ville] = 0;
    villesMap[m.ville]++;
  });
  console.log(`  ${magasins.length} magasins`);
  console.log('  Top villes:', Object.entries(villesMap).sort((a,b) => b[1]-a[1]).slice(0, 8).map(([v,c]) => `${v}(${c})`).join(', '));

  const { error } = await supabase.from('magasins').upsert(
    magasins.map(m => ({
      enseigne_code: 'shufersal',
      store_id: m.store_id,
      nom: m.nom,
      adresse: m.adresse,
      ville: m.ville,
    })),
    { onConflict: 'enseigne_code,store_id' }
  );

  if (error) console.error('Erreur:', error.message);
  else console.log('  OK !');
}

async function importerMagasinsVictory() {
  console.log('\nVictory — import des magasins...');
  
  return new Promise((resolve) => {
    https.get('https://laibcatalog.co.il/webapi/api/getbranches?edi=7290696200003',
    { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', async () => {
        try {
          const branches = JSON.parse(b);
          console.log(`  ${branches.length} magasins`);

          const { error } = await supabase.from('magasins').upsert(
            branches.map(m => ({
              enseigne_code: 'victory',
              store_id: String(m.number || m.Number),
              nom: m.name || m.Name,
              ville: m.name || m.Name,
            })),
            { onConflict: 'enseigne_code,store_id' }
          );

          if (error) console.error('Erreur:', error.message);
          else console.log('  OK !');
          resolve();
        } catch(e) {
          console.error(e.message);
          resolve();
        }
      });
    }).on('error', e => { console.error(e.message); resolve(); });
  });
}

async function main() {
  console.log('Import magasins...');
  await importerMagasinsShufersal();
  await importerMagasinsVictory();
  console.log('\nTermine !');
  process.exit(0);
}

main();