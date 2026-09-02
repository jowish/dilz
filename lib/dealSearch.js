// Search used to run entirely in the browser against whatever slice of the
// feed happened to be loaded (the first page, plus any pages the user had
// scrolled into). A deal further down the table simply could not be found,
// and `description` was never searched at all. These helpers build the
// server-side filter instead.

const SEARCH_COLUMNS = ['titre', 'description', 'magasin', 'ville'];
const SEARCH_MIN_LENGTH = 2;
const MAX_TERM_LENGTH = 80;

/**
 * PostgREST's `or=(...)` filter is a comma/parenthesis-delimited mini-syntax,
 * and `ilike` treats % and _ as wildcards. Raw user input can therefore break
 * the filter or widen it unintentionally, so strip the delimiters and the
 * wildcards rather than trusting the string.
 */
function sanitizeSearchTerm(value) {
  if (value == null) return '';
  return String(value)
    .trim()
    .slice(0, MAX_TERM_LENGTH)
    // Delimiters and quoting characters of the PostgREST filter grammar.
    .replace(/[(),."'\\*]/g, ' ')
    // ilike wildcards — typing % should not turn into "match anything".
    .replace(/[%_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isSearchableTerm(value) {
  return sanitizeSearchTerm(value).length >= SEARCH_MIN_LENGTH;
}

/**
 * Builds the PostgREST `or` expression matching the term against every
 * searchable column, case-insensitively and anywhere in the value.
 * Returns '' when the term is too short to be worth querying.
 */
function buildDealSearchFilter(value) {
  const term = sanitizeSearchTerm(value);
  if (term.length < SEARCH_MIN_LENGTH) return '';
  return SEARCH_COLUMNS.map((column) => `${column}.ilike.*${term}*`).join(',');
}

module.exports = {
  SEARCH_COLUMNS,
  SEARCH_MIN_LENGTH,
  sanitizeSearchTerm,
  isSearchableTerm,
  buildDealSearchFilter,
};
