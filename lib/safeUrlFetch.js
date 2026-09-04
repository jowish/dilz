// Fetching a URL that a user typed (P0.5).
//
// The extraction endpoint fetches an address supplied by whoever is posting,
// from our server, inside our network. Without a guard that is a request
// forgery hole: "http://localhost:8080/admin" or a link that redirects to
// 169.254.169.254 would be fetched with our credentials and its body handed
// back to the caller.
//
// So: only http(s), only public addresses, every redirect hop re-checked, a
// short timeout, and a hard cap on how much we will read.

const dns = require('dns').promises;

const MAX_REDIRECTS = 3;
const MAX_BYTES = 1_500_000;
const TIMEOUT_MS = 6000;

const BLOCKED_HOSTNAMES = new Set(['localhost', 'localhost.localdomain', 'ip6-localhost', 'ip6-loopback']);

/** Private, loopback, link-local and other non-routable space. */
function isPrivateIPv4(address) {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;            // link-local, incl. cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 192 && b === 0) return true;              // IETF protocol assignments
  if (a === 100 && b >= 64 && b <= 127) return true;  // carrier-grade NAT
  if (a >= 224) return true;                          // multicast and reserved
  return false;
}

function isPrivateIPv6(address) {
  const value = address.toLowerCase().split('%')[0];
  if (value === '::' || value === '::1') return true;
  if (value.startsWith('fe80') || value.startsWith('fc') || value.startsWith('fd')) return true;
  // IPv4-mapped addresses (::ffff:127.0.0.1) inherit the IPv4 rules.
  const mapped = value.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  return false;
}

function isPrivateAddress(address, family) {
  return family === 6 ? isPrivateIPv6(address) : isPrivateIPv4(address);
}

/** Parses and rejects anything that is not a plain public web address. */
function parsePublicUrl(value) {
  let url;
  try { url = new URL(String(value || '').trim()); } catch { return null; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (url.username || url.password) return null;
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!hostname || BLOCKED_HOSTNAMES.has(hostname)) return null;
  if (hostname.endsWith('.local') || hostname.endsWith('.internal')) return null;
  // Bare IP literals are checked here; hostnames are checked after resolution.
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname) && isPrivateIPv4(hostname)) return null;
  if (hostname.includes(':') && isPrivateIPv6(hostname)) return null;
  return url;
}

/** Resolves the host and refuses if it points anywhere private. */
async function assertPublicHost(url, { lookup = dns.lookup } = {}) {
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname) || hostname.includes(':')) return;
  let records;
  try {
    records = await lookup(hostname, { all: true });
  } catch {
    throw new Error('UNRESOLVABLE_HOST');
  }
  if (!records || !records.length) throw new Error('UNRESOLVABLE_HOST');
  if (records.some((record) => isPrivateAddress(record.address, record.family))) {
    throw new Error('PRIVATE_HOST');
  }
}

/** Reads at most MAX_BYTES of the body, so a huge page cannot exhaust memory. */
async function readCapped(response, maxBytes = MAX_BYTES) {
  if (!response.body || typeof response.body.getReader !== 'function') {
    const text = await response.text();
    return text.slice(0, maxBytes);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let text = '';
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    text += decoder.decode(value, { stream: true });
    if (total >= maxBytes) { try { await reader.cancel(); } catch { /* already closed */ } break; }
  }
  return text.slice(0, maxBytes);
}

/**
 * Fetches an HTML page safely: public hosts only, redirects followed by hand so
 * each hop is re-validated, and a timeout. Returns { url, html } — `url` is the
 * address actually landed on, which is what relative links resolve against.
 */
async function fetchPublicHtml(rawUrl, { fetchImpl = fetch, lookup = dns.lookup, maxRedirects = MAX_REDIRECTS } = {}) {
  let url = parsePublicUrl(rawUrl);
  if (!url) throw new Error('INVALID_URL');

  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    await assertPublicHost(url, { lookup });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let response;
    try {
      response = await fetchImpl(url.toString(), {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          // Shops serve very different markup to an unidentified client.
          'User-Agent': 'Mozilla/5.0 (compatible; DilzBot/1.0; +https://dilz.vercel.app)',
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'he,en;q=0.8',
        },
      });
    } catch (error) {
      throw new Error(error && error.name === 'AbortError' ? 'TIMEOUT' : 'FETCH_FAILED');
    } finally {
      clearTimeout(timer);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      const next = location ? parsePublicUrl(new URL(location, url).toString()) : null;
      if (!next) throw new Error('BAD_REDIRECT');
      url = next;
      continue;
    }

    if (!response.ok) throw new Error('HTTP_' + response.status);
    const type = response.headers.get('content-type') || '';
    if (type && !/text\/html|application\/xhtml|text\/plain/i.test(type)) throw new Error('NOT_HTML');

    return { url: url.toString(), html: await readCapped(response) };
  }

  throw new Error('TOO_MANY_REDIRECTS');
}

module.exports = {
  MAX_BYTES,
  TIMEOUT_MS,
  isPrivateIPv4,
  isPrivateIPv6,
  parsePublicUrl,
  assertPublicHost,
  fetchPublicHtml,
};
