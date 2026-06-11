const fs = require('fs');

const osher = fs.readFileSync('osherad-prices.html', 'utf8');
const victory = fs.readFileSync('victory-prices.html', 'utf8');

// Chercher tous les liens
const allLinksOsher = osher.match(/href="([^"]+)"/g) || [];
const allLinksVictory = victory.match(/href="([^"]+)"/g) || [];

console.log('=== OSHER AD - tous les liens ===');
allLinksOsher.forEach(l => console.log(l));

console.log('\n=== VICTORY - tous les liens ===');
allLinksVictory.forEach(l => console.log(l));

// Chercher aussi les textes qui ressemblent a des fichiers
console.log('\n=== OSHER - texte contenant "price" ou "מחיר" ===');
const linesOsher = osher.split('\n');
linesOsher.forEach(l => {
  if (l.toLowerCase().includes('price') || l.includes('מחיר') || l.includes('xml')) {
    console.log(l.trim().substring(0, 200));
  }
});