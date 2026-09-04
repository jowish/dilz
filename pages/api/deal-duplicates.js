import { createClient } from '@supabase/supabase-js';

const { findDuplicates, normalizeUrl } = require('../../lib/dealDuplicates');
const { fetchDuplicateCandidates, publicDuplicateShape } = require('../../lib/dealDuplicateLookup');

// Duplicate check for the posting flow (P0.3).
//
// The same lookup runs again inside POST /api/bons-plans, which is what
// actually enforces it — this endpoint exists so the flow can warn *before*
// publishing rather than failing afterwards.

export default async function handler(req, res) {
  res.setHeader('Allow', 'POST');
  if (req.method !== 'POST') return res.status(405).end();

  const { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey } = process.env;
  if (!url || !anonKey) return res.status(500).json({ erreur: 'Missing Supabase configuration' });

  const { titre, magasin, prix, prix_original, url_source } = req.body || {};
  if (!titre && !magasin && !normalizeUrl(url_source)) {
    // Nothing to match on yet — not an error, just no opinion.
    return res.status(200).json({ matches: [] });
  }

  const supabase = createClient(url, anonKey);
  const incoming = { titre, magasin, prix, prix_original, url_source };

  try {
    const candidates = await fetchDuplicateCandidates(supabase, incoming);
    const matches = findDuplicates(incoming, candidates).slice(0, 5);
    return res.status(200).json({
      matches: matches.map((match) => ({
        confidence: match.confidence,
        reasons: match.reasons,
        similarity: match.similarity,
        deal: publicDuplicateShape(match.deal),
      })),
    });
  } catch (error) {
    // A failing duplicate check must never block someone from posting.
    return res.status(200).json({ matches: [], erreur: error.message });
  }
}
