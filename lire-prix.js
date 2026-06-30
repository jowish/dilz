const zlib = require('zlib');
const fs = require('fs');
const xml2js = require('xml2js');

const fichier = fs.readFileSync('prix-shufersal.gz');
const DEBUG = process.env.DEBUG_LIRE_PRIX === '1';
const log = (...args) => { if (DEBUG) console.log(...args); };

zlib.gunzip(fichier, async (err, result) => {
  if (err) {
    log('❌ Erreur:', err.message);
    return;
  }
  
  try {
    const parser = new xml2js.Parser();
    const data = await parser.parseStringPromise(result.toString('utf8'));
    
    // La vraie structure Shufersal
    const produits = data?.Root?.Items?.[0]?.Item || [];
    
    log(`✅ ${produits.length} produits trouvés dans ce magasin Shufersal !\n`);
    
    log('📦 Les 5 premiers produits :');
    log('─'.repeat(50));
    
    produits.slice(0, 5).forEach(p => {
      log(`📌 ${p.ItemName?.[0]}`);
      log(`   💰 Prix : ${p.ItemPrice?.[0]} ₪`);
      log(`   📏 Quantité : ${p.Quantity?.[0]} ${p.UnitQty?.[0]}`);
      log('─'.repeat(50));
    });
    
    // Recherche d'un produit
    const recherche = 'נוטלה';
    const resultats = produits.filter(p => 
      p.ItemName?.[0]?.includes(recherche)
    );
    
    if (resultats.length > 0) {
      log(`\n🔍 Résultats pour "${recherche}" :`);
      resultats.forEach(p => {
        log(`  • ${p.ItemName?.[0]} — ${p.ItemPrice?.[0]} ₪`);
      });
    } else {
      log(`\n🔍 "${recherche}" pas dans ce magasin`);
    }
    
  } catch(e) {
    log('❌ Erreur parse:', e.message);
  }
});
