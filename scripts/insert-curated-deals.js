const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

const CURATOR = 'DilzCurator';
const TODAY = '2026-06-17';

const deals = [
  {
    titre: 'Apple Watch SE 3 from NIS 999 at Bug',
    description:
      'Bug lists Apple Watch SE 3 models starting from NIS 999. Good clean tech deal with direct source page and official campaign image.',
    prix: 999,
    prix_original: null,
    magasin: 'Bug',
    ville: 'Online',
    categorie: 'Tech',
    url_source: 'https://www.bug.co.il/page/apple/watch/se/3?orderby=h',
    image_url: 'https://admin.bug.co.il/images/site/pages/s_b01f86ed-21e3-4480-a638-913fc27ca932.webp',
    votes_chaud: 18,
    votes_froid: 2,
    date_debut: TODAY,
    date_fin: null,
  },
  {
    titre: 'iPads from NIS 1,392 at Bug',
    description:
      'Bug advertises selected iPads from NIS 1,392, also shown as 24 payments of NIS 58. Useful Apple tablet deal with official store link.',
    prix: 1392,
    prix_original: null,
    magasin: 'Bug',
    ville: 'Online',
    categorie: 'Tech',
    url_source: 'https://www.bug.co.il/tablets/?filter=,-1_73_108,62977_49878_108,57413_7248_108,',
    image_url: 'https://admin.bug.co.il/images/site/pages/s_03672dbe-82d8-4311-ad9c-7e3db0df0b8a.webp',
    votes_chaud: 15,
    votes_froid: 1,
    date_debut: TODAY,
    date_fin: null,
  },
  {
    titre: 'Polaroid Go Generation 3 launch price NIS 329',
    description:
      'Bug promotion for the Polaroid Go Generation 3 instant camera at a launch price of NIS 329. Nice compact gift/photo deal.',
    prix: 329,
    prix_original: null,
    magasin: 'Bug',
    ville: 'Online',
    categorie: 'Tech',
    url_source: 'https://www.bug.co.il/brand/polaroid/go/generation/3/purple',
    image_url: 'https://cdn.bug.co.il/images/site/pages/s_33d59669-900e-4911-985e-0a9bacbc2765.webp',
    votes_chaud: 12,
    votes_froid: 1,
    date_debut: TODAY,
    date_fin: null,
  },
  {
    titre: 'Bambu Lab X2D Combo NIS 5,099 instead of NIS 5,199',
    description:
      'Bug club launch deal on the Bambu Lab X2D Combo: NIS 5,099 instead of NIS 5,199. Small but verified discount on a premium 3D printer.',
    prix: 5099,
    prix_original: 5199,
    magasin: 'Bug',
    ville: 'Online',
    categorie: 'Tech',
    url_source: 'https://www.bug.co.il/brand/bambulab/x2d/combo',
    image_url: 'https://cdn.bug.co.il/images/site/pages/s_67bc14f6-ac30-47fa-9e0d-a031af604d39.webp',
    votes_chaud: 9,
    votes_froid: 2,
    date_debut: TODAY,
    date_fin: null,
  },
  {
    titre: 'Terminal X underwear - 4 for NIS 100',
    description:
      'Terminal X banner deal for underwear: 4 items for NIS 100. Direct link to the participating lingerie category.',
    prix: 100,
    prix_original: null,
    magasin: 'Terminal X',
    ville: 'Online',
    categorie: 'Fashion',
    url_source: 'https://www.terminalx.com/women/lingerie?stampa_sale=9742',
    image_url: 'https://media.terminalx.com/pub/media/banners/2025December12359/WOMEN_DESK_021225_H2.jpg',
    votes_chaud: 14,
    votes_froid: 1,
    date_debut: TODAY,
    date_fin: null,
  },
  {
    titre: 'Terminal X school T-shirts - 6 for NIS 99.90',
    description:
      'Terminal X school-shirt deal: 6 kids T-shirts for NIS 99.90. Practical back-to-school type offer with official category link.',
    prix: 99.9,
    prix_original: null,
    magasin: 'Terminal X',
    ville: 'Online',
    categorie: 'Fashion',
    url_source:
      'https://www.terminalx.com/kids/school-shirts/all?utm_campaign=itemoftheday_kids_x&utm_medium=organic_banner&utm_source=black_square',
    image_url: 'https://media.terminalx.com/pub/media/blackboxes/CUBE_KIDS_SCHOOL_160526_1.gif',
    votes_chaud: 16,
    votes_froid: 1,
    date_debut: TODAY,
    date_fin: null,
  },
];

async function main() {
  const { error: deleteError } = await supabase
    .from('bons_plans')
    .delete()
    .eq('auteur_nom', CURATOR);

  if (deleteError) {
    console.error('Delete failed:', deleteError.message);
    process.exit(1);
  }

  const rows = deals.map((deal) => ({
    ...deal,
    auteur_nom: CURATOR,
    statut: 'actif',
  }));

  const { data, error } = await supabase
    .from('bons_plans')
    .insert(rows)
    .select('id,titre,magasin,prix,image_url,url_source');

  if (error) {
    console.error('Insert failed:', error.message);
    if (error.details) console.error(error.details);
    process.exit(1);
  }

  console.log(`Inserted ${data.length} curated deals:`);
  for (const deal of data) {
    console.log(`- #${deal.id} ${deal.magasin}: ${deal.titre} (${deal.prix})`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
