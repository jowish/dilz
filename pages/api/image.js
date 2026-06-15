export default async function handler(req, res) {
  res.setHeader('Allow', 'GET');
  if (req.method !== 'GET') return res.status(405).end();

  const { url } = req.query;
  if (!url) return res.status(400).end();

  let imageUrl;
  try {
    imageUrl = new URL(decodeURIComponent(url));
  } catch {
    return res.status(400).end();
  }

  const allowedHost = imageUrl.hostname === 'rami-levy.co.il'
    || imageUrl.hostname.endsWith('.rami-levy.co.il');
  if (imageUrl.protocol !== 'https:' || !allowedHost) return res.status(403).end();

  try {
    const response = await fetch(imageUrl.toString(), {
      signal: AbortSignal.timeout(10000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.rami-levy.co.il/',
        'Accept': 'image/webp,image/apng,image/*,*/*',
      }
    });

    if (!response.ok) {
      return res.status(404).end();
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) return res.status(415).end();
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');

    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));

  } catch(e) {
    if (e.name === 'AbortError') return res.status(504).end();
    res.status(502).end();
  }
}
