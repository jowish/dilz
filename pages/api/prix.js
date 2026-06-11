import { createClient } from '@supabase/supabase-js';
import https from 'https';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function rechercherRamiLevy(recherche) {
  return new Promise((resolve) => {
    const data = JSON.stringify({ q: recherche, aggs: 0, store: '331' });
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
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve((json.data || [])
            .filter(p => p.name && p.name.includes(recherche))
            .map(p => ({
              barcode: String(p.barcode || p.id),
              nom: p.name,
              prix: p.price?.price || 0,
              quantite: '',
              unite: '',
              enseigne: 'רמי לוי'
            }))
            .filter(p => p.prix > 0)
          );
        } catch(e) { resolve([]); }
      });
    });
    req.on('error', () => resolve([]));
    req.write(data);
    req.end();
  });
}

export default async function handler(req, res) {
  const { q } = req.query;
  if (!q) return res.status(400).json({ erreur: 'Paramètre q requis' });

  try {
    const recherche = decodeURIComponent(q);

    const [resultSupabase, produitsRL] = await Promise.all([
      supabase
        .from('produits')
        .select('barcode, nom, prix(prix, quantite, unite, enseigne_code)')
        .ilike('nom', `%${recherche}%`)
        .limit(20),
      rechercherRamiLevy(recherche)
    ]);

    // Formater Shufersal depuis Supabase
    const produitsShuf = (resultSupabase.data || [])
      .map(p => {
        const prixShuf = (p.prix || []).find(x => x.enseigne_code === 'shufersal');
        if (!prixShuf) return null;
        return {
          barcode: p.barcode,
          nom: p.nom,
          prix: parseFloat(prixShuf.prix),
          quantite: prixShuf.quantite || '',
          unite: prixShuf.unite || '',
          enseigne: 'שופרסל'
        };
      })
      .filter(Boolean);

    // Index par barcode
    const indexShuf = {};
    produitsShuf.forEach(p => { indexShuf[p.barcode] = p; });

    const indexRL = {};
    produitsRL.forEach(p => { indexRL[p.barcode] = p; });

    // Grouper par barcode
    const produitsGroupes = [];
    const barcodesTraites = new Set();

    [...produitsShuf, ...produitsRL].forEach(p => {
      if (barcodesTraites.has(p.barcode)) return;
      barcodesTraites.add(p.barcode);

      const shuf = indexShuf[p.barcode];
      const rl = indexRL[p.barcode];

      const tousLesPrix = [];
      if (shuf) tousLesPrix.push({ enseigne: 'שופרסל', prix: shuf.prix });
      if (rl) tousLesPrix.push({ enseigne: 'רמי לוי', prix: rl.prix });
      tousLesPrix.sort((a, b) => a.prix - b.prix);

      produitsGroupes.push({
        barcode: p.barcode,
        nom: shuf?.nom || rl?.nom,
        quantite: shuf?.quantite || '',
        unite: shuf?.unite || '',
        meilleurPrix: tousLesPrix[0],
        tousLesPrix,
        disponibleDans: tousLesPrix.length
      });
    });

    produitsGroupes.sort((a, b) => b.disponibleDans - a.disponibleDans);

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