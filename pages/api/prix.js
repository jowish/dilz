import zlib from 'zlib';
import { promisify } from 'util';

const gunzip = promisify(zlib.gunzip);

// Récupère et parse le fichier XML d'une enseigne
async function recupererPrix(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
  
  const buffer = await response.arrayBuffer();
  const data = Buffer.from(buffer);
  
  try {
    const decompressed = await gunzip(data);
    return decompressed.toString('utf8');
  } catch {
    return data.toString('utf8');
  }
}

// Parse le XML en liste de produits
function parseXML(xml) {
  const produits = [];
  const regex = /<Item>([\s\S]*?)<\/Item>/g;
  let match;
  
  while ((match = regex.exec(xml)) !== null) {
    const item = match[1];
    const get = (tag) => {
      const m = item.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`));
      return m ? m[1].trim() : '';
    };
    
    produits.push({
      code: get('ItemCode'),
      nom: get('ItemName'),
      prix: parseFloat(get('ItemPrice')) || 0,
      quantite: get('Quantity'),
      unite: get('UnitQty'),
    });
  }
  
  return produits;
}

// Cache en mémoire pour ne pas re-télécharger à chaque requête
let cache = null;
let derniereMaj = null;

export default async function handler(req, res) {
  const { q } = req.query;
  
  if (!q) {
    return res.status(400).json({ erreur: 'Paramètre q requis' });
  }

  try {
    // Rafraîchir le cache toutes les heures
    const maintenant = Date.now();
    if (!cache || !derniereMaj || (maintenant - derniereMaj) > 3600000) {
      console.log('🔄 Chargement des prix Shufersal...');
      
      // On récupère la liste des fichiers disponibles
      const listePage = await fetch(
        'https://prices.shufersal.co.il/FileObject/UpdateCategory?catID=2&storeId=1'
      );
      const listeHtml = await listePage.text();
      
      // On extrait l'URL du fichier le plus récent
      const urlMatch = listeHtml.match(
        /href="(https:\/\/pricesprodpublic[^"]+\.gz[^"]*)"/
      );
      
      if (!urlMatch) throw new Error('URL fichier prix introuvable');
      
      const urlFichier = urlMatch[1].replace(/&amp;/g, '&');
      console.log('📥 Téléchargement:', urlFichier.substring(0, 80) + '...');
      
      const xml = await recupererPrix(urlFichier);
      cache = parseXML(xml);
      derniereMaj = maintenant;
      
      console.log(`✅ ${cache.length} produits chargés`);
    }
    
    // Recherche dans le cache
    const recherche = decodeURIComponent(q).toLowerCase();
    const resultats = cache.filter(p =>
      p.nom.toLowerCase().includes(recherche) ||
      p.nom.includes(q)
    ).slice(0, 20);
    
    res.status(200).json({
      source: 'Shufersal',
      total: resultats.length,
      produits: resultats,
      derniereMaj: new Date(derniereMaj).toISOString()
    });
    
  } catch (err) {
    console.error('Erreur API prix:', err.message);
    res.status(500).json({ erreur: err.message });
  }
}