/**
 * Dilz Scout discovers Israeli deals and submits complete candidates for review.
 * Sources: KSP, public Telegram channels, authorized Facebook pages and RSS feeds.
 * Every inserted deal remains pending until an admin approves it.
 */
const { createClient } = require('@supabase/supabase-js');
const { parseStringPromise } = require('xml2js');
const { findDuplicates } = require('../lib/dealDuplicates');
require('dotenv').config({ path: '.env.local' });

/**
 * The scout is OFF (2026-09-04, maintainer's decision).
 *
 * It had been publishing news articles as deals: a headline about fuel prices
 * went out three days running as a "Bug" deal for whatever product was
 * advertised beside it, priced 8 was 412.50. Nothing reviewed those before they
 * reached the feed.
 *
 * Nothing discovers or inserts while this is false — not the CLI, not the API
 * route, whoever triggers them. Set it to true to start the scout again.
 */
const SCOUT_ENABLED = false;

const BOT_NAME = 'DilzScout';
const USER_AGENT = 'DilzScout/1.0 (+https://dilz.vercel.app)';
const SOCIAL_HOSTS = new Set(['t.me', 'telegram.me', 'facebook.com', 'www.facebook.com', 'instagram.com', 'www.instagram.com', 'x.com', 'twitter.com']);
const TECHNICAL_HOST_PATTERN = /(?:cdn|cdnjs|cloudflare|cloudfront|jsdelivr|gmpg|gravatar|googleapis|gstatic|schema\.org|w3\.org|doubleclick|googlesyndication)/i;
const DEFAULT_RSS_FEEDS = [
  'https://www.tgspot.co.il/feed/',
  'https://www.poenta.co.il/feed/',
];

function envList(name) {
  return String(process.env[name] || '').split(',').map((value) => value.trim()).filter(Boolean);
}

function decodeHtml(value = '') {
  const entities = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' };
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, entity) => entities[entity.toLowerCase()] || match);
}

function textOnly(value = '') {
  return decodeHtml(value)
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

function normalizeUrl(rawUrl) {
  if (!rawUrl) return null;
  try {
    const url = new URL(decodeHtml(rawUrl));
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid$|gclid$|gad_|mc_)/i.test(key)) url.searchParams.delete(key);
    }
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

function externalUrls(value = '') {
  const urls = [];
  const matches = value.matchAll(/https?:\/\/[^\s<>'"]+/gi);
  for (const match of matches) {
    const url = normalizeUrl(match[0].replace(/[),.;]+$/, ''));
    if (!url) continue;
    if (SOCIAL_HOSTS.has(new URL(url).hostname.toLowerCase())) continue;
    if (!urls.includes(url)) urls.push(url);
  }
  return urls;
}

function isDirectDealUrl(url) {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return !SOCIAL_HOSTS.has(host) && !TECHNICAL_HOST_PATTERN.test(host) && !/dealabs\.com$/i.test(host);
  } catch {
    return false;
  }
}

function extractPrices(text = '') {
  if (/\b(?:free|gratuit)\b|חינם/i.test(text)) return { prix: 0, prix_original: null };
  const values = [];
  const patterns = [
    /(?:₪|ש["״']?ח|שקל(?:ים)?)\s*([0-9][0-9,.]*)/g,
    /([0-9][0-9,.]*)\s*(?:₪|ש["״']?ח|שקל(?:ים)?)/g,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const number = Number(match[1].replace(/,/g, ''));
      if (Number.isFinite(number) && number >= 0 && number <= 1000000) values.push(number);
    }
  }
  const unique = [...new Set(values)].sort((a, b) => a - b);
  return { prix: unique[0] ?? null, prix_original: unique.length > 1 ? unique[unique.length - 1] : null };
}

/**
 * A link tagged with the publisher's own name (`?ref=poenta` on poenta.co.il)
 * is that site monetising an article, not the subject of it. Those links are
 * what turned news headlines into deals for unrelated products.
 */
function isAffiliateLinkFor(url, feedHost) {
  const siteName = String(feedHost || '').split('.')[0].toLowerCase();
  if (!siteName) return false;
  try {
    const params = new URL(url).searchParams;
    return ['ref', 'referrer', 'utm_source', 'aff', 'affiliate', 'partner']
      .some((key) => String(params.get(key) || '').toLowerCase().includes(siteName));
  } catch {
    return false;
  }
}

function storeFromUrl(url, fallback = 'Online') {
  if (!url) return fallback;
  const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  const known = {
    'ksp.co.il': 'KSP', 'amazon.com': 'Amazon', 'amazon.co.uk': 'Amazon', 'amazon.fr': 'Amazon',
    'aliexpress.com': 'AliExpress', 'wolt.com': 'Wolt', 'shufersal.co.il': 'Shufersal',
    'rami-levy.co.il': 'Rami Levy', 'victory.co.il': 'Victory', 'super-pharm.co.il': 'Super-Pharm',
    'terminalx.com': 'Terminal X', 'zap.co.il': 'Zap', 'ivory.co.il': 'Ivory', 'bug.co.il': 'Bug',
  };
  if (known[host]) return known[host];
  const parts = host.split('.');
  const brand = ['il', 'he', 'en', 'us', 'uk', 'gr'].includes(parts[0]) ? parts[1] : parts[0];
  return brand.replace(/(^|[-_])\w/g, (letter) => letter.replace(/[-_]/, ' ').toUpperCase());
}

function categoryFromText(text = '') {
  if (/מזון|סופר|מסעד|אוכל|coffee|food|wolt|pizza/i.test(text)) return 'Food';
  if (/בגד|נעל|אופנה|fashion|shirt|dress|shoe/i.test(text)) return 'Fashion';
  if (/טלפון|מחשב|מסך|אוזניות|חשמל|tech|phone|laptop|gaming/i.test(text)) return 'Tech';
  if (/קולנוע|מלון|טיסה|אטרקציה|activity|hotel|flight|cinema/i.test(text)) return 'Activities';
  return 'Online';
}

function titleFromText(text = '') {
  const firstLine = text.split(/\n|[.!?](?:\s|$)/).map((part) => part.trim()).find(Boolean) || 'Promotion en ligne';
  return firstLine.length > 120 ? `${firstLine.slice(0, 117)}...` : firstLine;
}

function scoreDeal(deal) {
  let score = 0;
  if (deal.url_source) score += 30;
  if (deal.image_url) score += 20;
  if (deal.prix !== null && deal.prix !== undefined) score += 20;
  if (deal.prix_original > deal.prix) score += 15;
  if (/מבצע|הנחה|קופון|deal|sale|promo|off|gratuit|חינם/i.test(`${deal.titre} ${deal.description}`)) score += 10;
  if (deal.titre?.length >= 12) score += 5;
  return score;
}

function candidateFromPost({ text, links = [], image, sourceName, sourceUrl }) {
  const cleanText = textOnly(text);
  const urls = [...links.map(normalizeUrl).filter(Boolean), ...externalUrls(cleanText)];
  const directUrl = urls.find(isDirectDealUrl);
  const { prix, prix_original } = extractPrices(cleanText);
  const deal = {
    titre: titleFromText(cleanText),
    description: cleanText.slice(0, 900),
    prix,
    prix_original,
    magasin: directUrl ? storeFromUrl(directUrl, sourceName) : sourceName,
    ville: 'Online',
    categorie: categoryFromText(cleanText),
    url_source: directUrl || null,
    image_url: normalizeUrl(image),
    auteur_nom: BOT_NAME,
    statut: 'pending',
    source_reference: sourceUrl,
  };
  return deal;
}

function parseTelegramPage(html, channel) {
  const candidates = [];
  const chunks = html.split(/<div class="tgme_widget_message_wrap[^>]*>/i).slice(1);
  for (const chunk of chunks) {
    const postId = chunk.match(/data-post="([^"]+)"/i)?.[1];
    const textHtml = chunk.match(/tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/i)?.[1] || '';
    const links = [...textHtml.matchAll(/href="([^"]+)"/gi)].map((match) => decodeHtml(match[1]));
    const image = chunk.match(/background-image:url\(['"]?([^'")]+)['"]?\)/i)?.[1] || null;
    const sourceUrl = postId ? `https://t.me/${postId}` : `https://t.me/s/${channel}`;
    const candidate = candidateFromPost({ text: textHtml, links, image, sourceName: `Telegram ${channel}`, sourceUrl });
    if (candidate.description) candidates.push(candidate);
  }
  return candidates;
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(20000),
    headers: { 'user-agent': USER_AGENT, 'accept-language': 'he-IL,he;q=0.9,en;q=0.8', ...options.headers },
    ...options,
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.text();
}

async function scrapeKsp() {
  const categories = ['540', '541', '543', '547', '549'];
  const deals = [];
  for (const category of categories) {
    try {
      const body = await fetchText(`https://ksp.co.il/web/api/category/${category}?from=0&size=30&sort=discount`, { headers: { accept: 'application/json' } });
      if (body.trimStart().startsWith('<')) {
        console.warn('[KSP] API catalogue indisponible, source ignoree pour cette execution.');
        break;
      }
      const payload = JSON.parse(body);
      const products = payload.result || payload.products || [];
      for (const item of products) {
        const prix = Number(item.price?.price ?? item.price);
        const prixOriginal = Number(item.oldPrice?.price ?? item.oldPrice);
        if (!item.name || !Number.isFinite(prix) || prix <= 0 || !Number.isFinite(prixOriginal) || prixOriginal <= prix) continue;
        const reduction = Math.round(((prixOriginal - prix) / prixOriginal) * 100);
        if (reduction < 12) continue;
        deals.push({
          titre: String(item.name).slice(0, 120),
          description: `${reduction}% de reduction chez KSP. ${item.description || ''}`.trim().slice(0, 900),
          prix,
          prix_original: prixOriginal,
          magasin: 'KSP',
          ville: 'Online',
          categorie: categoryFromText(`${item.name} ${item.description || ''}`),
          url_source: normalizeUrl(item.url ? new URL(item.url, 'https://ksp.co.il').toString() : null),
          image_url: normalizeUrl(item.img ? new URL(item.img, 'https://ksp.co.il').toString() : null),
          auteur_nom: BOT_NAME,
          statut: 'pending',
          source_reference: 'KSP API',
        });
      }
    } catch (error) {
      console.warn(`[KSP ${category}] ${error.message}`);
    }
  }
  return deals;
}

async function scrapeTelegramChannel(channel) {
  const html = await fetchText(`https://t.me/s/${encodeURIComponent(channel)}`);
  return parseTelegramPage(html, channel);
}

async function scrapeFacebookPage(pageId, token) {
  const version = process.env.META_GRAPH_VERSION || 'v23.0';
  const fields = 'message,permalink_url,full_picture,created_time';
  const endpoint = `https://graph.facebook.com/${version}/${encodeURIComponent(pageId)}/posts?fields=${encodeURIComponent(fields)}&limit=25&access_token=${encodeURIComponent(token)}`;
  const payload = JSON.parse(await fetchText(endpoint, { headers: { accept: 'application/json' } }));
  return (payload.data || []).map((post) => candidateFromPost({
    text: post.message || '',
    links: externalUrls(post.message || ''),
    image: post.full_picture,
    sourceName: `Facebook ${pageId}`,
    sourceUrl: post.permalink_url,
  }));
}

async function scrapeRssFeed(feedUrl) {
  const xml = await parseStringPromise(await fetchText(feedUrl), { explicitArray: false, mergeAttrs: true });
  const rawItems = xml?.rss?.channel?.item || xml?.feed?.entry || [];
  const items = Array.isArray(rawItems) ? rawItems : [rawItems];
  const feedHost = new URL(feedUrl).hostname.replace(/^www\./, '');
  const candidates = await Promise.all(items.slice(0, 15).map(async (item) => {
    const link = typeof item.link === 'string' ? item.link : item.link?.href;
    const content = item.description || item.summary || item.content || item['content:encoded'] || '';
    const text = `${item.title || ''}\n${content}`;
    let articleHtml = '';
    try { articleHtml = link ? await fetchText(link) : ''; } catch {}
    const blocked = /(?:google|facebook|instagram|twitter|youtube|tiktok|whatsapp|linkedin|pinterest)/i;
    const commerceSignal = /(?:amazon|aliexpress|ksp|godeal|rockstargames|epicgames|play\.google|wolt|shufersal|rami-levy|victory|super-pharm|terminalx|zap|ivory|bug|target|sephora|store|shop|sale|deal|offer|coupon|product|item|buy|goldbox|newswire)/i;
    // Only links the post itself points at. Scanning every anchor in the page
    // swept up sidebars and affiliate boxes, so an article about fuel prices
    // was published as a "Bug" deal for whatever product happened to be
    // advertised alongside it — a different one each day.
    const merchantLinks = [...new Set(externalUrls(content))].filter((url) => {
      const host = new URL(url).hostname.replace(/^www\./, '');
      return host !== feedHost
        && !blocked.test(host)
        && isDirectDealUrl(url)
        && commerceSignal.test(url)
        && !isAffiliateLinkFor(url, feedHost);
    });
    const image = item.enclosure?.url
      || item['media:content']?.url
      || articleHtml.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i)?.[1]
      || articleHtml.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1]
      || null;
    return candidateFromPost({ text, links: merchantLinks, image, sourceName: 'Flux israelien', sourceUrl: link });
  }));
  return candidates;
}

/**
 * Two ways the same deal can come back. Keying on the URL alone let an
 * identical headline return day after day, because each copy carried a
 * different link.
 */
function candidateKeys(deal) {
  const keys = [`text:${deal.magasin}:${deal.titre}`.toLowerCase().replace(/\s+/g, ' ').trim()];
  if (deal.url_source) keys.push(`url:${deal.url_source.toLowerCase()}`);
  return keys;
}

function candidateKey(deal) {
  return candidateKeys(deal)[0];
}

function selectQualityDeals(deals, minimumScore = 65) {
  const unique = new Map();
  for (const deal of deals) {
    const score = scoreDeal(deal);
    if (score < minimumScore || !isDirectDealUrl(deal.url_source) || !deal.image_url || deal.prix === null) continue;
    const cleanDeal = { ...deal, quality_score: score };
    const key = candidateKey(cleanDeal);
    if (!unique.has(key) || unique.get(key).quality_score < score) unique.set(key, cleanDeal);
  }
  return [...unique.values()].sort((a, b) => b.quality_score - a.quality_score);
}

async function removeExisting(supabase, deals) {
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data, error } = await supabase
    .from('bons_plans')
    .select('id,titre,magasin,url_source,prix,prix_original,created_at')
    .gte('created_at', since)
    .limit(2000);
  if (error) throw error;

  const existing = data || [];
  const keys = new Set(existing.flatMap(candidateKeys));

  return deals.filter((deal) => {
    if (candidateKeys(deal).some((key) => keys.has(key))) return false;
    // Beyond exact repeats, the bot is held to the same duplicate rule people
    // are (P0.3) — it used to publish straight to the table and so was never
    // checked at all.
    return !findDuplicates(deal, existing).some((match) => match.confidence === 'high');
  });
}

async function discoverDeals() {
  const jobs = [{ name: 'KSP', run: scrapeKsp }];
  for (const channel of envList('DEAL_BOT_TELEGRAM_CHANNELS')) jobs.push({ name: `Telegram ${channel}`, run: () => scrapeTelegramChannel(channel) });
  const rssFeeds = [...new Set([...DEFAULT_RSS_FEEDS, ...envList('DEAL_BOT_RSS_FEEDS')])];
  for (const feed of rssFeeds) jobs.push({ name: `RSS ${feed}`, run: () => scrapeRssFeed(feed) });
  const facebookToken = process.env.META_ACCESS_TOKEN;
  if (facebookToken) {
    for (const pageId of envList('DEAL_BOT_FACEBOOK_PAGE_IDS')) jobs.push({ name: `Facebook ${pageId}`, run: () => scrapeFacebookPage(pageId, facebookToken) });
  }

  const settled = await Promise.allSettled(jobs.map((job) => job.run()));
  const deals = [];
  settled.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      console.log(`[${jobs[index].name}] ${result.value.length} candidats`);
      deals.push(...result.value);
    } else {
      console.warn(`[${jobs[index].name}] ${result.reason?.message || result.reason}`);
    }
  });
  return deals;
}

async function main() {
  if (!SCOUT_ENABLED) {
    console.warn('[DilzScout] The scout is switched off (SCOUT_ENABLED = false in scripts/deal-bot.js). Nothing was discovered or inserted.');
    return;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !serviceKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY');
  const supabase = createClient(url, serviceKey);
  const rawDeals = await discoverDeals();
  const qualityDeals = selectQualityDeals(rawDeals, Number(process.env.DEAL_BOT_MIN_SCORE || 65));
  const newDeals = await removeExisting(supabase, qualityDeals);
  const limit = Math.max(1, Math.min(100, Number(process.env.DEAL_BOT_MAX_PER_RUN || 25)));
  const selected = newDeals.slice(0, limit);

  console.log(`Qualifies: ${qualityDeals.length}; new: ${newDeals.length}; selected: ${selected.length}`);
  if (process.env.DEAL_BOT_DRY_RUN === 'true' || selected.length === 0) {
    for (const deal of selected) console.log(`[DRY] ${deal.quality_score} ${deal.magasin}: ${deal.titre}`);
    return;
  }

  const rows = selected.map(({ quality_score, source_reference, ...deal }) => ({
    ...deal,
    description: `${deal.description}\n\nSource de veille: ${source_reference}. Score qualite: ${quality_score}/100.`,
    votes_chaud: 0,
    votes_froid: 0,
    statut: 'pending',
  }));
  const { data, error } = await supabase.from('bons_plans').insert(rows).select('id,titre,magasin');
  if (error) throw error;
  console.log(`Inserted ${data.length} deals in pending moderation.`);
  for (const deal of data) console.log(`#${deal.id} ${deal.magasin}: ${deal.titre}`);
}

module.exports = {
  SCOUT_ENABLED,
  candidateFromPost,
  candidateKey,
  candidateKeys,
  discoverDeals,
  extractPrices,
  isDirectDealUrl,
  normalizeUrl,
  parseTelegramPage,
  removeExisting,
  scrapeRssFeed,
  scoreDeal,
  selectQualityDeals,
};

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
