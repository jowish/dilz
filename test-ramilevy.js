const https = require('https');

const data = JSON.stringify({
  q: 'נוטלה',
  aggs: 1,
  store: '331'
});

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
    'referer': 'https://www.rami-levy.co.il/he',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(body);
      console.log('Status:', json.status);
      console.log('Total produits:', json.total);
      if (json.data && json.data.length > 0) {
        console.log('\n5 premiers produits Rami Levy:');
        console.log('─'.repeat(40));
        json.data.slice(0, 5).forEach(p => {
          console.log(`${p.name} — ${p.price?.price} NIS`);
        });
      } else {
        console.log('Réponse:', body.substring(0, 300));
      }
    } catch(e) {
      console.log('Réponse brute:', body.substring(0, 500));
    }
  });
});

req.on('error', e => console.error('Erreur:', e.message));
req.write(data);
req.end();