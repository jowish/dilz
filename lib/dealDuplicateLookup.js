// Shared candidate lookup for duplicate detection (P0.3), used by both the
// pre-publish check endpoint and the publish handler that enforces it — so the
// warning a user sees and the rule the server applies can never drift apart.

const { RECENT_WINDOW_DAYS, normalizeUrl } = require('./dealDuplicates');

const CANDIDATE_LIMIT = 60;

/** PostgREST filter values are comma/paren delimited; keep user text out of that grammar. */
function sanitizeFilterValue(value) {
  return String(value || '')
    .replace(/[(),."'\\*%_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

/**
 * Pulls a bounded set of plausible matches rather than scanning the table:
 * deals from the same store, plus anything sharing the source URL's path.
 * Scoring then happens in JS (see lib/dealDuplicates.js).
 */
async function fetchDuplicateCandidates(supabase, incoming, { windowDays = RECENT_WINDOW_DAYS } = {}) {
  const since = new Date(Date.now() - windowDays * 86400000).toISOString();
  const filters = [];

  const store = sanitizeFilterValue(incoming?.magasin);
  if (store) filters.push(`magasin.ilike.*${store}*`);

  // Match on the URL's stable part so tracking parameters don't hide a twin.
  const normalized = normalizeUrl(incoming?.url_source);
  if (normalized) {
    const urlKey = sanitizeFilterValue(normalized.split('?')[0]);
    if (urlKey) filters.push(`url_source.ilike.*${urlKey}*`);
  }

  if (!filters.length) return [];

  const { data, error } = await supabase
    .from('bons_plans')
    .select('id,titre,magasin,prix,prix_original,url_source,image_url,ville,created_at,statut,is_ad')
    .or('statut.eq.actif,statut.is.null')
    .eq('is_ad', false)
    .gte('created_at', since)
    .or(filters.join(','))
    .order('created_at', { ascending: false })
    .limit(CANDIDATE_LIMIT);

  if (error) throw new Error(error.message);
  return data || [];
}

/** Only what the duplicate prompt needs to show — never the whole row. */
function publicDuplicateShape(deal) {
  if (!deal) return null;
  return {
    id: deal.id,
    titre: deal.titre,
    magasin: deal.magasin,
    ville: deal.ville,
    prix: deal.prix,
    prix_original: deal.prix_original,
    image_url: deal.image_url,
    url_source: deal.url_source,
    created_at: deal.created_at,
  };
}

module.exports = {
  CANDIDATE_LIMIT,
  sanitizeFilterValue,
  fetchDuplicateCandidates,
  publicDuplicateShape,
};
