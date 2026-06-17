import { createClient } from '@supabase/supabase-js';

const { PRODUCT_CATEGORIES, inferProductCategory } = require('../../lib/productCategories');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const NOM_ENSEIGNE = {
  shufersal: 'שופרסל',
  rami_levy: 'רמי לוי',
  victory: 'ויקטורי',
  yohananof: 'יוחננוף',
  osher_ad: 'אושר עד',
  carrefour: 'כרפור',
};

NOM_ENSEIGNE.be = 'BE';
NOM_ENSEIGNE.super_pharm = 'Super-Pharm';
NOM_ENSEIGNE.good_pharm = 'Good Pharm';

const SORTS = new Set(['discount', 'liked', 'recent', 'price_asc']);
const PRICE_PAGE_SIZE = 1000;
const PRICE_PAGES_PER_STORE = 3;

async function fetchPriceRowsByStore(supabase, enseigneCode) {
  const rows = [];
  for (let page = 0; page < PRICE_PAGES_PER_STORE; page += 1) {
    const from = page * PRICE_PAGE_SIZE;
    const to = from + PRICE_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('prix')
      .select('barcode, prix, enseigne_code, produits!inner(barcode, nom, nom_en, image, image_source, categorie, votes_chaud, votes_froid, created_at)')
      .eq('enseigne_code', enseigneCode)
      .gt('prix', 0)
      .not('produits.image', 'is', null)
      .range(from, to);

    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PRICE_PAGE_SIZE) break;
  }
  return rows;
}

export default async function handler(req, res) {
  res.setHeader('Allow', 'GET');
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const category = PRODUCT_CATEGORIES.includes(req.query.category) ? req.query.category : 'all';
    const sort = SORTS.has(req.query.sort) ? req.query.sort : 'discount';

    const priceRows = (
      await Promise.all(Object.keys(NOM_ENSEIGNE).map(code => fetchPriceRowsByStore(supabase, code)))
    ).flat();

    const productsByBarcode = new Map();
    for (const row of priceRows) {
      const product = row.produits;
      if (!product?.image) continue;
      if (!productsByBarcode.has(row.barcode)) {
        productsByBarcode.set(row.barcode, { ...product, prix: [] });
      }
      productsByBarcode.get(row.barcode).prix.push({
        prix: row.prix,
        enseigne_code: row.enseigne_code,
      });
    }

    // Calculer la reduction pour chaque produit
    const promos = [];

    productsByBarcode.forEach(produit => {
      // Deduplicate: keep lowest price per store
      const byStore = {};
      for (const p of (produit.prix || [])) {
        if (p.prix <= 0) continue;
        if (!byStore[p.enseigne_code] || p.prix < byStore[p.enseigne_code]) {
          byStore[p.enseigne_code] = p.prix;
        }
      }
      const tousLesPrix = Object.entries(byStore).map(([enseigne_code, prix]) => ({ enseigne_code, prix }));
      if (tousLesPrix.length < 2) return;

      const prixMin = Math.min(...tousLesPrix.map(p => p.prix));
      const prixMax = Math.max(...tousLesPrix.map(p => p.prix));

      const reduction = ((prixMax - prixMin) / prixMax * 100);
      if (reduction < 5) return; // Ignorer les differences insignifiantes

      const meilleur = tousLesPrix.find(p => p.prix === prixMin);

      tousLesPrix.sort((a, b) => a.prix - b.prix);

      const productCategory = produit.categorie || inferProductCategory(`${produit.nom || ''} ${produit.nom_en || ''}`);
      if (category !== 'all' && productCategory !== category) return;
      if (!produit.image) return;

      promos.push({
        barcode: produit.barcode,
        nom: produit.nom,
        nom_en: produit.nom_en,
        image: produit.image,
        imageSource: produit.image_source || null,
        category: productCategory,
        votesChaud: produit.votes_chaud || 0,
        votesFroid: produit.votes_froid || 0,
        createdAt: produit.created_at || null,
        prixMin,
        prixMax,
        reduction: Math.round(reduction),
        meilleurEnseigne: NOM_ENSEIGNE[meilleur.enseigne_code] || meilleur.enseigne_code,
        tousLesPrix: tousLesPrix.map(p => ({
          enseigne: NOM_ENSEIGNE[p.enseigne_code] || p.enseigne_code,
          prix: p.prix,
        })),
      });
    });

    if (sort === 'liked') {
      promos.sort((a, b) =>
        ((b.votesChaud - b.votesFroid) - (a.votesChaud - a.votesFroid)) || b.reduction - a.reduction
      );
    } else if (sort === 'recent') {
      promos.sort((a, b) =>
        (new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()) || b.reduction - a.reduction
      );
    } else if (sort === 'price_asc') {
      promos.sort((a, b) => a.prixMin - b.prixMin || b.reduction - a.reduction);
    } else {
      promos.sort((a, b) => b.reduction - a.reduction);
    }

    res.status(200).json({
      total: promos.length,
      category,
      sort,
      promos: promos.slice(0, 200)
    });

  } catch(err) {
    console.error('Erreur promos:', err.message);
    res.status(500).json({ erreur: err.message });
  }
}
