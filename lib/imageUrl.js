// Deal photos are uploaded at up to 1600px (see lib/uploadImage.js) but the
// feed renders them a few hundred pixels wide. Serving the full-size original
// to every card costs megabytes per feed load and, worse, forces the WebView
// to decode a 1600x1200 bitmap per card — which is what pushes a phone into
// memory pressure on a long feed.
//
// Next's built-in image optimizer (/_next/image) resizes and re-encodes to
// WebP/AVIF at the edge, so we route through it. It only accepts hosts listed
// in next.config.mjs's images.remotePatterns and widths from its configured
// size lists — anything else is a 400. So this helper rewrites ONLY known-good
// hosts and falls back to the original URL untouched for everything else
// (DilzBot pulls product photos from arbitrary retailer domains).

// Must stay in sync with images.remotePatterns in next.config.mjs.
const OPTIMIZABLE_HOSTS = new Set([
  'www.rami-levy.co.il',
  'wqkhetnkcocehekniwig.supabase.co',
  'images.openfoodfacts.org',
  'res.cloudinary.com',
  'media.shufersal.co.il',
]);

// Next only allows widths from deviceSizes/imageSizes; these are the defaults.
const ALLOWED_WIDTHS = new Set([16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840]);

export function canOptimizeImage(src) {
  if (typeof src !== 'string' || !src) return false;
  if (src.startsWith('/_next/image')) return false;
  let parsed;
  try {
    parsed = new URL(src);
  } catch {
    return false; // relative paths, data: URIs, malformed — leave alone
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
  return OPTIMIZABLE_HOSTS.has(parsed.hostname);
}

/**
 * Returns an optimizer URL for hosts we know Next will accept, or the original
 * string unchanged. Never throws — a bad input just comes back as-is.
 */
export function optimizedImageUrl(src, { width = 640, quality = 70 } = {}) {
  if (!canOptimizeImage(src)) return src;
  const w = ALLOWED_WIDTHS.has(width) ? width : 640;
  const q = Math.min(100, Math.max(1, Math.round(quality)));
  return `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=${q}`;
}
