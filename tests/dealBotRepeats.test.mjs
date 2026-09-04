import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { candidateKeys, candidateKey, removeExisting } = require('../scripts/deal-bot.js');
const botSource = await readFile(path.join(process.cwd(), 'scripts', 'deal-bot.js'), 'utf8');

// The rows that were actually live in the feed: one news headline, republished
// on three consecutive days, each copy carrying a different affiliate link.
const FUEL_HEADLINE = 'מחיר הדלק מזנק ל־8.25 שקל לליטר: שיא של 14 שנה';
const LIVE_ROWS = [
  { id: 161, titre: FUEL_HEADLINE, magasin: 'Bug', prix: 8, prix_original: 412.5, url_source: 'https://www.bug.co.il/brand/ninja/nc703/creami/spoon/spin', created_at: new Date().toISOString() },
  { id: 160, titre: FUEL_HEADLINE, magasin: 'Bug', prix: 8, prix_original: 412.5, url_source: 'https://www.bug.co.il/brand/razer/blackshark/v3/x/hyperspeed', created_at: new Date().toISOString() },
];

const fakeSupabase = (rows) => ({
  from: () => ({
    select: () => ({
      gte: () => ({ limit: async () => ({ data: rows, error: null }) }),
    }),
  }),
});

test('the same headline is one candidate however many links it carries', () => {
  const [today] = candidateKeys(LIVE_ROWS[0]);
  const [yesterday] = candidateKeys(LIVE_ROWS[1]);
  assert.equal(today, yesterday, 'the text key must match across differing URLs');
  // The URL is still a key, so an identical link is caught too.
  assert.equal(candidateKeys(LIVE_ROWS[0]).length, 2);
  assert.match(candidateKeys(LIVE_ROWS[0])[1], /^url:/);
  // candidateKey stays exported for callers that want a single key.
  assert.equal(candidateKey(LIVE_ROWS[0]), today);
});

test('a headline already in the feed is not published again tomorrow', async () => {
  const tomorrow = {
    titre: FUEL_HEADLINE,
    magasin: 'Bug',
    prix: 8,
    prix_original: 412.5,
    // A different affiliate link again — this is what defeated the old check.
    url_source: 'https://www.bug.co.il/brand/nintendo/switch/sports',
  };
  const kept = await removeExisting(fakeSupabase(LIVE_ROWS), [tomorrow]);
  assert.deepEqual(kept, [], 'the repeat must be dropped');
});

test('a genuinely new deal from the same store still gets through', async () => {
  const fresh = {
    titre: 'אוזניות Razer BlackShark V3 Pro',
    magasin: 'Bug',
    prix: 699,
    prix_original: 899,
    url_source: 'https://www.bug.co.il/brand/razer/blackshark/v3/pro',
  };
  const kept = await removeExisting(fakeSupabase(LIVE_ROWS), [fresh]);
  assert.equal(kept.length, 1);
});

test('the bot is held to the same duplicate rule as a person posting', () => {
  assert.match(botSource, /require\('\.\.\/lib\/dealDuplicates'\)/);
  assert.match(botSource, /findDuplicates\(deal, existing\)\.some\(\(match\) => match\.confidence === 'high'\)/);
});

test('a publisher\'s own affiliate link is not treated as the deal', () => {
  // Reproduces the exact shape seen in the feed: bug.co.il links tagged
  // ?ref=poenta, harvested out of poenta.co.il articles.
  const { isAffiliateLinkFor } = loadInternals();
  assert.equal(isAffiliateLinkFor('https://www.bug.co.il/brand/nintendo/switch/sports?ref=poenta', 'poenta.co.il'), true);
  assert.equal(isAffiliateLinkFor('https://www.bug.co.il/brand/nintendo/switch/sports?ref=tgspot', 'tgspot.co.il'), true);
  // Somebody else's referral tag, or none at all, is left alone.
  assert.equal(isAffiliateLinkFor('https://www.bug.co.il/item/1?ref=someoneelse', 'poenta.co.il'), false);
  assert.equal(isAffiliateLinkFor('https://www.bug.co.il/item/1', 'poenta.co.il'), false);
  assert.equal(isAffiliateLinkFor('not a url', 'poenta.co.il'), false);
});

test('only links the post itself points at are considered', () => {
  // Scanning every anchor on the article page is what paired a fuel-price
  // headline with an ice-cream maker.
  assert.doesNotMatch(botSource, /const anchorLinks =/);
  assert.doesNotMatch(botSource, /articleScope/);
  assert.match(botSource, /\[\.\.\.new Set\(externalUrls\(content\)\)\]/);
  assert.match(botSource, /!isAffiliateLinkFor\(url, feedHost\)/);
  // The page is still fetched, but only for its image.
  assert.match(botSource, /articleHtml\.match\(\/<meta\[\^>\]\+property=\["'\]og:image/);
});

// isAffiliateLinkFor is internal; read it out of the module for the test above
// rather than widening the bot's public surface for a helper nothing else uses.
function loadInternals() {
  const start = botSource.indexOf('function isAffiliateLinkFor');
  const end = botSource.indexOf('function storeFromUrl');
  assert.ok(start > -1 && end > start, 'isAffiliateLinkFor must exist');
  const factory = new Function(`${botSource.slice(start, end)}; return { isAffiliateLinkFor };`);
  return factory();
}
