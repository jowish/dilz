const MIN_QUERY_LENGTH = 2;
const DEFAULT_MIN_POPULAR_SEARCHES = 20;
const DEFAULT_POPULAR_LIMIT = 8;
const MAX_POPULAR_LIMIT = 20;

export function normalizeSearchKeyword(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 80);
}

export function normalizeSearchKey(value) {
  return normalizeSearchKeyword(value).toLocaleLowerCase();
}

export function validSearchKeyword(value) {
  const keyword = normalizeSearchKeyword(value);
  return keyword.length >= MIN_QUERY_LENGTH ? keyword : '';
}

export function popularSearchesFromRows(rows = [], { minCount = DEFAULT_MIN_POPULAR_SEARCHES, limit = DEFAULT_POPULAR_LIMIT } = {}) {
  const minimum = Math.max(1, Number.isFinite(Number(minCount)) ? Number(minCount) : DEFAULT_MIN_POPULAR_SEARCHES);
  const max = Math.min(MAX_POPULAR_LIMIT, Math.max(1, Number.isFinite(Number(limit)) ? Number(limit) : DEFAULT_POPULAR_LIMIT));
  const grouped = new Map();

  for (const row of rows) {
    const key = normalizeSearchKey(row?.normalized_query || row?.query);
    const keyword = normalizeSearchKeyword(row?.query || row?.normalized_query);
    if (!key || !keyword) continue;
    const current = grouped.get(key) || { keyword, count: 0, latest_at: null };
    current.count += Number(row?.count || 1);
    if (row?.created_at && (!current.latest_at || row.created_at > current.latest_at)) current.latest_at = row.created_at;
    grouped.set(key, current);
  }

  return [...grouped.values()]
    .filter((item) => item.count >= minimum)
    .sort((a, b) => b.count - a.count || String(b.latest_at || '').localeCompare(String(a.latest_at || '')) || a.keyword.localeCompare(b.keyword))
    .slice(0, max);
}

export {
  DEFAULT_MIN_POPULAR_SEARCHES,
  DEFAULT_POPULAR_LIMIT,
  MAX_POPULAR_LIMIT,
};
