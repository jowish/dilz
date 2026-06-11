const fs = require('fs');
const h = fs.readFileSync('victory.html', 'utf8');
console.log('Taille:', h.length);
console.log('Apercu:', h.substring(0, 300));

// Chercher les liens gz
const lignes = h.split('\n');
lignes.forEach(l => {
  if (l.includes('.gz') || l.includes('Price') || l.includes('price')) {
    console.log('>>>', l.trim().substring(0, 150));
  }
});