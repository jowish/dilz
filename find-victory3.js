const fs = require('fs');
const data = JSON.parse(fs.readFileSync('victory-files.json', 'utf8'));

console.log('Nombre de fichiers:', data.length);
console.log('Premier fichier:', JSON.stringify(data[0], null, 2));

// Chercher les fichiers PriceFull
const priceFull = data.filter(f => 
  f.fileType === 'pricefull' || 
  f.fileName?.toLowerCase().includes('pricefull')
);
console.log('\nFichiers PriceFull:', priceFull.length);
console.log('Premier PriceFull:', JSON.stringify(priceFull[0], null, 2));