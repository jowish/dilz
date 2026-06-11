const https = require('https');

https.get('https://prices.shufersal.co.il/FileObject/UpdateCategory?catID=2&storeId=1', (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const matches = data.match(/PriceFull[^"<\s]*/g);
    console.log('Fichiers PriceFull trouves:', matches ? matches.length : 0);
    console.log('Exemples:', matches ? matches.slice(0, 5) : []);
  });
}).on('error', e => console.log('Erreur:', e.message));