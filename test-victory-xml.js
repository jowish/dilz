const fs = require('fs');
const zlib = require('zlib');

const buffer = fs.readFileSync('victory-test.gz');

zlib.gunzip(buffer, (err, result) => {
  if (err) { console.log('Erreur:', err.message); return; }
  
  const xml = result.toString('utf8');
  console.log('Apercu XML:', xml.substring(0, 500));
  
  // Parser les produits
  const regex = /<Item>([\s\S]*?)<\/Item>/g;
  let match;
  let count = 0;
  const produits = [];
  
  while ((match = regex.exec(xml)) !== null) {
    const item = match[1];
    const get = (tag) => {
      const m = item.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`));
      return m ? m[1].trim() : '';
    };
    produits.push({
      barcode: get('ItemCode'),
      nom: get('ItemName'),
      prix: parseFloat(get('ItemPrice')) || 0
    });
    count++;
  }
  
  console.log(`\nTotal produits: ${count}`);
  console.log('Exemple:', JSON.stringify(produits.slice(0, 3), null, 2));
});