const https = require('https');

function post(body) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
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
        'Content-Length': Buffer.byteLength(data)
      }
    };
    const req = https.request(options, (res) => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try { resolve(JSON.parse(b)); }
        catch(e) { resolve({}); }
      });
    });
    req.on('error', () => resolve({}));
    req.write(data);
    req.end();
  });
}

async function main() {
  // Récupérer la liste des départements via aggs
  const res = await post({ store: '331', q: 'א', aggs: 1 });
  
  console.log('Filtres disponibles:', Object.keys(res.filters || {}));
  console.log('Departements:', JSON.stringify(res.filters?.department || []));
  
  // Tester la pagination
  console.log('\nTest pagination dept 50:');
  const page1 = await post({ store: '331', dept: 50, offset: 0 });
  const page2 = await post({ store: '331', dept: 50, offset: 30 });
  console.log('Page 1:', page1.data?.length, 'produits, premier:', page1.data?.[0]?.name);
  console.log('Page 2:', page2.data?.length, 'produits, premier:', page2.data?.[0]?.name);
  console.log('Total:', page1.total);
}

main();