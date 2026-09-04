import { createClient } from '@supabase/supabase-js';

const { extractFromHtml, normalizeExtraction, mergeExtractions, parsePrice, cleanText, LIMITS } = require('../../lib/dealExtraction');
const { fetchPublicHtml } = require('../../lib/safeUrlFetch');

// Reads the deal details out of a link or a screenshot so the poster does not
// have to type them (P0.5).
//
// Two independent sources, either or both:
//   • a link  → fetched server-side and parsed for structured data (no API key,
//               no cost, deterministic)
//   • a photo → read by Claude vision, and only when ANTHROPIC_API_KEY is set;
//               without the key this half simply does not run
//
// Nothing here ever fails the caller: a page that will not load or a model that
// will not answer comes back as "we found nothing", because the poster can
// always type the details themselves. The only hard failures are refusals —
// not signed in, or a URL we will not fetch.

const VISION_MODEL = 'claude-sonnet-4-6';
const MAX_IMAGE_BYTES = 4_000_000;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const VISION_PROMPT = `You are reading a screenshot or photo of a retail deal, to prefill a form.

Return ONLY a JSON object, no prose, with these keys:
  "titre"          the product or deal name, as written
  "description"    one short sentence of useful detail, or null
  "prix"           the current price as a number, or null
  "prix_original"  the crossed-out or "was" price as a number, or null
  "currency"       ISO code of the currency shown (ILS, USD, EUR, GBP), or null
  "magasin"        the shop or brand name, or null
  "online"         true if this is clearly an online listing, false if clearly a
                   physical store, null if you cannot tell

Rules that matter more than completeness:
- If a value is not clearly legible in the image, return null for it. Never
  infer, complete or translate a price, and never invent a shop name.
- Report the currency exactly as shown. If no currency symbol or code appears
  anywhere, return null for currency.
- Do not convert between currencies. Do not calculate a discount.`;

function readBearer(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

/** Splits a data: URL into the pieces the Anthropic API wants. */
function parseImagePayload(value) {
  const match = /^data:([\w/+.-]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(String(value || '').trim());
  if (!match) return null;
  const mediaType = match[1].toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.includes(mediaType)) return null;
  const data = match[2].replace(/\s+/g, '');
  // base64 is 4 characters per 3 bytes.
  if (data.length * 0.75 > MAX_IMAGE_BYTES) return null;
  return { mediaType, data };
}

/** Pulls the JSON object out of a model reply that may be fenced or padded. */
function parseModelJson(text) {
  const raw = String(text || '');
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : raw;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try { return JSON.parse(body.slice(start, end + 1)); } catch { return null; }
}

/** Model output is untrusted input: take only known keys, in known shapes. */
function shapeVisionResult(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  const price = parsePrice(parsed.prix);
  const original = parsePrice(parsed.prix_original);
  return {
    titre: cleanText(parsed.titre, LIMITS.titre) || null,
    description: cleanText(parsed.description, LIMITS.description) || null,
    prix: price ? price.amount : null,
    prix_original: original ? original.amount : null,
    currency: typeof parsed.currency === 'string' ? parsed.currency : (price && price.currency) || null,
    magasin: cleanText(parsed.magasin, LIMITS.magasin) || null,
    online: parsed.online === true ? true : parsed.online === false ? false : null,
  };
}

async function extractFromImage(image) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: VISION_MODEL,
    max_tokens: 700,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.data } },
        { type: 'text', text: VISION_PROMPT },
      ],
    }],
  });

  const text = (response.content || []).filter((block) => block.type === 'text').map((block) => block.text).join('');
  return shapeVisionResult(parseModelJson(text));
}

export default async function handler(req, res) {
  res.setHeader('Allow', 'POST');
  if (req.method !== 'POST') return res.status(405).end();

  // Auth first: this endpoint spends a network fetch and possibly a model call
  // on whatever it is handed, so it is not open to anonymous callers.
  const token = readBearer(req);
  if (!token) return res.status(401).json({ erreur: 'Sign in to read deal details.' });

  const {
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
    SUPABASE_SERVICE_KEY: serviceKey,
  } = process.env;
  if (!url || !anonKey) return res.status(500).json({ erreur: 'Missing Supabase configuration' });

  const verifier = createClient(url, serviceKey || anonKey);
  const { data: { user } = {}, error: authError } = await verifier.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ erreur: 'Session expired. Please sign in again.' });

  const sourceUrl = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
  const image = parseImagePayload(req.body?.image);
  if (!sourceUrl && !image) return res.status(200).json({ fields: {}, warnings: [], sources: [] });

  const warnings = [];
  const sources = [];
  let fromUrl = {};
  let fromImage = {};

  if (sourceUrl) {
    try {
      const page = await fetchPublicHtml(sourceUrl);
      fromUrl = extractFromHtml(page.html, page.url);
      sources.push('url');
    } catch (error) {
      // A shop that blocks us, a typo, or an address we refuse to fetch — the
      // poster types the details instead, which is what they do today anyway.
      warnings.push(error && error.message === 'PRIVATE_HOST' ? 'url_refused' : 'url_unreadable');
    }
  }

  // The page already told us what the deal is — no reason to spend a model
  // call on the screenshot as well.
  const pageWasEnough = Boolean(fromUrl.titre) && typeof fromUrl.prix === 'number';

  if (image && !pageWasEnough) {
    try {
      const result = await extractFromImage(image);
      if (result) {
        fromImage = result;
        sources.push('photo');
      }
    } catch {
      warnings.push('photo_unreadable');
    }
  }

  const merged = mergeExtractions(fromUrl, fromImage);
  // The link is only carried through when the poster actually gave us one.
  if (!sourceUrl) delete merged.url_source;
  const { fields, warnings: normalizationWarnings } = normalizeExtraction(merged);

  return res.status(200).json({
    fields,
    warnings: [...warnings, ...normalizationWarnings],
    sources,
  });
}
