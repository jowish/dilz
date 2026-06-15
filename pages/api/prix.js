import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  res.setHeader('Allow', 'GET');
  if (req.method !== 'GET') return res.status(405).end();

  const { q, barcode } = req.query;
  if (!q) return res.status(400).json({ erreur: 'Parametre q requis' });

  try {
    const recherche = decodeURIComponent(q);

    let query = supabase
      .from('produits')
      .select('barcode, nom, nom_en, image, prix(prix, quantite, unite, enseigne_code)');

    query = barcode === '1'
      ? query.eq('barcode', recherche)
      : query.ilike('nom', `%${recherche}%`);

    const { data, error } = await query.limit(barcode === '1' ? 1 : 30);

    if (error) throw error;

    const indexParBarcode = {};

    (data || []).forEach(p => {
      if (!indexParBarcode[p.barcode]) {
        indexParBarcode[p.barcode] = {
          barcode: p.barcode,
          nom: p.nom,
          nom_en: p.nom_en,
          image: p.image,
          quantite: '',
          unite: '',
          tousLesPrix: [],
          disponibleDans: 0
        };
      }

      (p.prix || []).forEach(px => {
        const nomEnseigne = px.enseigne_code === 'shufersal' ? 'שופרסל' :
                           px.enseigne_code === 'rami_levy' ? 'רמי לוי' :
                           px.enseigne_code === 'osher_ad' ? 'אושר עד' :
                           px.enseigne_code === 'victory' ? 'ויקטורי' :
                           px.enseigne_code === 'yohananof' ? 'יוחננוף' :
                           px.enseigne_code === 'carrefour' ? 'כרפור' :
                           px.enseigne_code;

        indexParBarcode[p.barcode].tousLesPrix.push({
          enseigne: nomEnseigne,
          prix: parseFloat(px.prix)
        });

        if (px.quantite) indexParBarcode[p.barcode].quantite = px.quantite;
        if (px.unite) indexParBarcode[p.barcode].unite = px.unite;
      });
    });

    const produitsGroupes = Object.values(indexParBarcode)
      .filter(p => p.tousLesPrix.length > 0)
      .map(p => {
        p.tousLesPrix.sort((a, b) => a.prix - b.prix);
        p.meilleurPrix = p.tousLesPrix[0];
        p.disponibleDans = p.tousLesPrix.length;
        return p;
      })
      .sort((a, b) => b.disponibleDans - a.disponibleDans);

    res.status(200).json({
      total: produitsGroupes.length,
      produits: produitsGroupes,
      derniereMaj: new Date().toISOString()
    });

  } catch (err) {
    console.error('Erreur:', err.message);
    res.status(500).json({ erreur: err.message });
  }
}
