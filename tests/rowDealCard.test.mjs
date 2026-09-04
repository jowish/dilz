import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const read = async (...parts) => {
  const text = await readFile(path.join(process.cwd(), ...parts), 'utf8');
  return text.split('\r\n').join('\n');
};
const [card, home, dealsApi, prefs, css] = await Promise.all([
  read('components', 'deals', 'DealCard.js'),
  read('pages', 'index.js'),
  read('pages', 'api', 'bons-plans.js'),
  read('lib', 'userPreferences.js'),
  read('styles', 'globals.css'),
]);

test('the feed opens on rows without overriding a chosen layout', () => {
  assert.match(home, /useState\(DEFAULT_DEAL_LAYOUT\)/);
  assert.match(home, /if \(dealLayout !== DEFAULT_DEAL_LAYOUT\) params\.set\('layout', dealLayout\)/);
  // The saved value has to be readable as "absent", or an untouched account
  // looks identical to one that chose cards.
  assert.match(prefs, /export function readStoredDealLayout/);
  assert.match(prefs, /return stored \? normalizeDealLayoutPreference\(stored\) : null/);
  assert.match(home, /readStoredDealLayout\(\)/);
  assert.doesNotMatch(home, /readDealLayoutPreference\(\)/);
});

test('a row card shows when it was posted and who posted it', () => {
  assert.match(card, /const isRow = layout === 'spotlight'/);
  assert.match(card, /const postedAgo = deal\.created_at \? timeAgo\(deal\.created_at, lang\) : null/);
  assert.match(card, /isRow && postedAgo/);
  assert.match(card, /dilz-deal-card__posted/);
});

test("the poster's tier is shown beside their name, from the existing points system", () => {
  assert.match(card, /import \{ TIER_LABELS \} from '\.\.\/\.\.\/lib\/points'/);
  assert.match(card, /deal\.auteur_tier && \(/);
  assert.match(card, /dilz-poster-tier is-\$\{deal\.auteur_tier\}/);
  // Translated, not a raw tier id.
  assert.match(card, /TIER_LABELS\[deal\.auteur_tier\]\?\.\[lang === 'he' \? 'he' : 'en'\]/);
});

test('the feed API supplies that tier in one bounded query', () => {
  assert.match(dealsApi, /async function withAuthorTiers/);
  assert.match(dealsApi, /\.in\('user_id', authorIds\)/);
  assert.match(dealsApi, /bons_plans: await withAuthorTiers\(supabase, rows\)/);
  // A failure costs the badges, never the feed.
  assert.match(dealsApi, /if \(error\) return deals;/);
  assert.match(dealsApi, /\} catch \{\s*\n\s*return deals;\s*\n\s*\}/);
});

test('the saving sits next to the prices, in green, only in the row', () => {
  assert.match(card, /isRow && discount !== null && \(/);
  assert.match(
    css,
    /\.dilz-feed-grid\.is-spotlight[^{]*\.dilz-deal-card__price-row \.dilz-badge--saving[\s\S]*?color: var\(--saving\) !important/,
    'the row price line re-asserts the savings green over the global orange rule'
  );
});

test('a negative discount reads correctly in Hebrew', () => {
  // Without an LTR isolate the leading minus jumps to the other side: "29%-".
  assert.equal((card.match(/<Badge dir="ltr" tone=\{discount >= 30/g) || []).length, 2);
});

test('the row keeps voting, and adds a way straight into the deal', () => {
  assert.match(card, /dilz-deal-card__row-tools/);
  assert.match(card, /className="dilz-deal-card__view"/);
  assert.match(card, /\{text\.viewDeal\}/);
  assert.match(card, /viewDeal: 'View deal'/);
  assert.match(card, /viewDeal: 'לצפייה בדיל'/);
  // Voting stays on the card: it is the community's main gesture.
  assert.match(card, /dilz-vote-pill dilz-vote-pill--combined/);
  assert.match(card, /onVote\(deal\.id, 'chaud'\)/);
  assert.match(card, /onVote\(deal\.id, 'froid'\)/);
});

test('no verification tick is claimed next to a store name', () => {
  // The mockup drew one; nothing in the data verifies a store, so the store row
  // carries the name, the city and the time — and nothing that asserts trust.
  // (The word "Verified" does appear in this file, as the deal's own freshness
  // label — a different claim about a different thing.)
  const storeRow = card.slice(
    card.indexOf('<div className="dilz-deal-card__store-row">'),
    card.indexOf('<h3>{deal.titre}</h3>')
  );
  assert.ok(storeRow.length > 0);
  assert.doesNotMatch(storeRow, /verified|badge|check|tick/i);
  assert.match(storeRow, /\{deal\.magasin\}/);
});
