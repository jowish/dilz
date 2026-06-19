const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);
const CURATOR = 'DilzFreeCurator';
const TODAY = '2026-06-19';

const deals = [
  {
    titre: 'Theme Waze Minions gratuit',
    description: 'Conduis a Hollywood avec les voix et elements visuels des Minions dans Waze.',
    magasin: 'Waze', categorie: 'Activities',
    url_source: 'https://www.waze.com/',
    image_url: 'https://static-pepper.dealabs.com/threads/raw/goVbg/3355056_1/re/768x768/qt/60/3355056_1.jpg',
  },
  {
    titre: 'Construction Simulator 3 gratuit sur mobile',
    description: 'Jeu complet disponible gratuitement sur Android et iOS via Epic Games Store pendant la duree de l offre.',
    magasin: 'Epic Games Store', categorie: 'Tech',
    url_source: 'https://store.epicgames.com/p/construction-simulator-3-android-761575',
    image_url: 'https://static-pepper.dealabs.com/threads/raw/hdBCN/3354919_1/re/768x768/qt/60/3354919_1.jpg',
  },
  {
    titre: 'Quiz 2 Player Ultimate gratuit',
    description: 'Jeu de quiz local a deux joueurs temporairement gratuit sur Android.',
    magasin: 'Google Play', categorie: 'Tech',
    url_source: 'https://play.google.com/store/apps/details?id=com.inspiredandroid.twoplayerquizultimate',
    image_url: 'https://static-pepper.dealabs.com/threads/raw/Djakv/3353788_1/re/768x768/qt/60/3353788_1.jpg',
  },
  {
    titre: 'Defense Zone HD gratuit sur Android',
    description: 'Jeu de strategie tower defense temporairement gratuit sur Google Play.',
    magasin: 'Google Play', categorie: 'Tech',
    url_source: 'https://play.google.com/store/apps/details?id=net.defensezone',
    image_url: 'https://static-pepper.dealabs.com/threads/raw/rVxAm/3350941_1/re/768x768/qt/60/3350941_1.jpg',
  },
  {
    titre: 'Dire Echo gratuit sur PC',
    description: 'Jeu PC disponible gratuitement et sans DRM sur itch.io.',
    magasin: 'itch.io', categorie: 'Tech',
    url_source: 'https://truegamesstudio.itch.io/dire-echo',
    image_url: 'https://static-pepper.dealabs.com/threads/raw/knIqL/3349109_1/re/768x768/qt/60/3349109_1.jpg',
  },
  {
    titre: 'Robobeat et Citizen Sleeper gratuits sur PC',
    description: 'Deux jeux PC gratuits a ajouter a sa bibliotheque Epic Games Store.',
    magasin: 'Epic Games Store', categorie: 'Tech',
    url_source: 'https://store.epicgames.com/p/robobeat-5f084b',
    image_url: 'https://static-pepper.dealabs.com/threads/raw/RTDWb/3349680_1/re/768x768/qt/60/3349680_1.jpg',
  },
  {
    titre: 'Theme Waze fan de football gratuit',
    description: 'Theme de navigation Waze gratuit avec une ambiance fan de football.',
    magasin: 'Waze', categorie: 'Activities',
    url_source: 'https://www.waze.com/ul?bundle_campaign=9175',
    image_url: 'https://static-pepper.dealabs.com/threads/raw/E0bSA/3349939_1/re/768x768/qt/60/3349939_1.jpg',
  },
];

async function main() {
  const { error: deleteError } = await supabase.from('bons_plans').delete().eq('auteur_nom', CURATOR);
  if (deleteError) throw deleteError;

  const rows = deals.map((deal) => ({
    ...deal,
    prix: 0,
    prix_original: null,
    ville: 'Online',
    votes_chaud: 0,
    votes_froid: 0,
    date_debut: TODAY,
    date_fin: null,
    auteur_nom: CURATOR,
    statut: 'actif',
  }));

  const { data, error } = await supabase.from('bons_plans').insert(rows).select('id,titre,magasin,url_source');
  if (error) throw error;
  console.log(`Inserted ${data.length} verified free deals.`);
  for (const deal of data) console.log(`- #${deal.id} ${deal.magasin}: ${deal.titre}`);
}

main().catch((error) => {
  console.error('Free deal import failed:', error.message || error);
  process.exit(1);
});
