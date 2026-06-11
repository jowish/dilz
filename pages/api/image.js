export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).end();

  const imageUrl = decodeURIComponent(url);
  if (!imageUrl.includes('rami-levy.co.il')) return res.status(403).end();

  try {
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.rami-levy.co.il/',
        'Accept': 'image/webp,image/apng,image/*,*/*',
      }
    });

    console.log('Image status:', response.status, imageUrl);

    if (!response.ok) {
      return res.status(404).end();
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));

  } catch(e) {
    console.error('Image error:', e.message);
    res.status(500).end();
  }
}