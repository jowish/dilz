const zlib = require('zlib');
const fs = require('fs');
const xml2js = require('xml2js');

const fichier = fs.readFileSync('prix-shufersal.gz');

zlib.gunzip(fichier, async (err, result) => {
  if (err) {
    console.log('❌ Erreur:', err.message);
    return;
  }
  
  try {
    const parser = new xml2js.Parser();
    const data = await parser.parseStringPromise(result.toString('utf8'));
    
    // La vraie structure Shufersal
    const produits = data?.Root?.Items?.[0]?.Item || [];
    
    console.log(`✅ ${produits.length} produits trouvés dans ce magasin Shufersal !\n`);
    
    console.log('📦 Les 5 premiers produits :');
    console.log('─'.repeat(50));
    
    produits.slice(0, 5).forEach(p => {
      console.log(`📌 ${p.ItemName?.[0]}`);
      console.log(`   💰 Prix : ${p.ItemPrice?.[0]} ₪`);
      console.log(`   📏 Quantité : ${p.Quantity?.[0]} ${p.UnitQty?.[0]}`);
      console.log('─'.repeat(50));
    });
    
    // Recherche d'un produit
    const recherche = 'נוטלה';
    const resultats = produits.filter(p => 
      p.ItemName?.[0]?.includes(recherche)
    );
    
    if (resultats.length > 0) {
      console.log(`\n🔍 Résultats pour "${recherche}" :`);
      resultats.forEach(p => {
        console.log(`  • ${p.ItemName?.[0]} — ${p.ItemPrice?.[0]} ₪`);
      });
    } else {
      console.log(`\n🔍 "${recherche}" pas dans ce magasin`);
    }
    
  } catch(e) {
    console.log('❌ Erreur parse:', e.message);
  }
});