const https = require('https');

function httpsRequest(opts, postData) {
  return new Promise((resolve) => {
    const req = https.request({ ...opts, rejectUnauthorized: false }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', c => body += c);
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body
      }));
    });
    req.on('error', e => resolve({ status: 0, headers: {}, body: e.message }));
    req.setTimeout(15000, () => { req.destroy(); resolve({ status: 408, headers: {}, body: 'timeout' }); });
    if (postData) req.write(postData);
    req.end();
  });
}

async function main() {
  const host = 'url.retail.publishedprices.co.il';

  // Etape 1: GET la page login pour obtenir le cookie initial
  console.log('1. GET page login...');
  const getLogin = await httpsRequest({
    hostname: host,
    path: '/login',
    method: 'GET',
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  
  console.log('Status:', getLogin.status);
  const allCookies = getLogin.headers['set-cookie'] || [];
  console.log('Cookies recus:', allCookies);
  
  // Extraire tous les cookies
  const cookieStr = allCookies.map(c => c.split(';')[0]).join('; ');
  console.log('Cookie string:', cookieStr);

  // Chercher le csrftoken dans le body
  const csrfMatch = getLogin.body.match(/csrftoken['"]\s+content=['"]([^'"]+)/);
  const csrf = csrfMatch?.[1] || '';
  console.log('CSRF:', csrf);

  // Etape 2: POST login avec les cookies
  console.log('\n2. POST login...');
  const postData = `username=osheradd&password=&csrfmiddlewaretoken=${csrf}`;
  const postLogin = await httpsRequest({
    hostname: host,
    path: '/file/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData),
      'User-Agent': 'Mozilla/5.0',
      'Cookie': cookieStr,
      'Referer': `https://${host}/login`
    }
  }, postData);

  console.log('Status:', postLogin.status);
  const newCookies = postLogin.headers['set-cookie'] || [];
  console.log('Nouveaux cookies:', newCookies);
  
  // Combiner tous les cookies
  const allCookieStr = [...allCookies, ...newCookies]
    .map(c => c.split(';')[0])
    .join('; ');
  console.log('Cookies combines:', allCookieStr);

  // Etape 3: Acceder a la liste
  console.log('\n3. Acces liste fichiers...');
  const files = await httpsRequest({
    hostname: host,
    path: '/file/d/',
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Cookie': allCookieStr,
      'Referer': `https://${host}/`
    }
  });

  console.log('Status:', files.status);
  if (files.status === 302) {
    console.log('Redirect:', files.headers.location);
  }
  console.log('Body:', files.body.substring(0, 500));
}

main();