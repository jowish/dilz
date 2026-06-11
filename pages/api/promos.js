import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const NOM_ENSEIGNE = {
  shufersal: 'שופרסל',
  rami_levy: 'רמי לוי',
  victory: 'ויקטורי',
};

export default async function handler(req, res) {
  try {
    // Recuperer tous les prix groupes par barcode
    const { data, error } = await supabase
      .from('produits')
      .select('barcode, nom, image, prix(prix, enseigne_code)')
      .not('prix', 'is', null)
      .limit(500);

    if (error) throw error;

    // Calculer la reduction pour chaque produit
    const promos = [];

    (data || []).forEach(produit => {
      const tousLesPrix = (produit.prix || []).filter(p => p.prix > 0);
      if (tousLesPrix.length < 2) return;

      const prixMin = Math.min(...tousLesPrix.map(p => p.prix));
      const prixMax = Math.max(...tousLesPrix.map(p => p.prix));

      const reduction = ((prixMax - prixMin) / prixMax * 100);
      if (reduction < 5) return; // Ignorer les differences insignifiantes

      const meilleur = tousLesPrix.find(p => p.prix === prixMin);

      tousLesPrix.sort((a, b) => a.prix - b.prix);

      promos.push({
        barcode: produit.barcode,
        nom: produit.nom,
        image: produit.image,
        prixMin,
        prixMax,
        reduction: Math.round(reduction),
        meilleurEnseigne: NOM_ENSEIGNE[meilleur.enseigne_code] || meilleur.enseigne_code,
        tousLesPrix: tousLesPrix.map(p => ({
          enseigne: NOM_ENSEIGNE[p.enseigne_code] || p.enseigne_code,
          prix: p.prix
        }))
      });
    });

    // Trier par reduction decroissante
    promos.sort((a, b) => b.reduction - a.reduction);

    res.status(200).json({
      total: promos.length,
      promos: promos.slice(0, 20)
    });

  } catch(err) {
    console.error('Erreur promos:', err.message);
    res.status(500).json({ erreur: err.message });
  }
}