const fs = require('fs');
const h = fs.readFileSync('victory3.html', 'utf8');

console.log('Apercu:', h.substring(0, 500));
console.log('\n--- Liens gz ---');
const gz = h.match(/https?:\/\/[^\s'"<>]+\.gz[^\s'"<>]*/g);
console.log(gz ? gz.slice(0, 5) : 'aucun');

console.log('\n--- Liens PriceFull ---');
const price = h.match(/PriceFull[^\s'"<>]*/g);
console.log(price ? price.slice(0, 5) : 'aucun');

console.log('\n--- Tous les href ---');
const hrefs = h.match(/href="([^"]+)"/g);
if (hrefs) hrefs.forEach(l => console.log(l));