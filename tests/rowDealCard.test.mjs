import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const read = async (...parts) => {
  const text = await readFile(path.join(process.cwd(), ...parts), 'utf8');
  return text.split('\r\n').join('\n');
};
const [card, home, dealsApi, prefs, css, premium] = await Promise.all([
  read('components', 'deals', 'DealCard.js'),
  read('pages', 'index.js'),
  read('pages', 'api', 'bons-plans.js'),
  read('lib', 'userPreferences.js'),
  read('styles', 'globals.css'),
  // premium-refresh.css is loaded after globals and is the authority for the
  // row card — defining it in both is what caused its action bar to overlap.
  read('styles', 'premium-refresh.css'),
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

test('a row card closes with who posted it and when, in words', () => {
  assert.match(card, /const isRow = layout === 'spotlight'/);
  assert.match(card, /const postedAgo = deal\.created_at \? timeAgoLong\(deal\.created_at, lang\) : null/);
  // The byline ends the card rather than interrupting it after the title.
  assert.match(card, /\{!isRow && authorLine\}/);
  assert.match(card, /\{isRow && authorLine\}/);
  assert.ok(
    card.indexOf('{isRow && authorLine}') > card.indexOf('dilz-deal-card__actions'),
    'in the row the byline comes after the actions, at the foot of the card'
  );
  assert.match(card, /isRow && postedAgo && <span className="dilz-deal-card__posted"> \{postedAgo\}<\/span>/);
});

test('the top of a row says whether you can walk in or have to click through', () => {
  const storeRow = card.slice(
    card.indexOf('<div className="dilz-deal-card__store-row">'),
    card.indexOf('<h3>{deal.titre}</h3>')
  );
  assert.match(storeRow, /isRow && availability/);
  assert.match(storeRow, /dilz-deal-card__channel/);
});

test('the photo runs the full height of the row, and the title leads', () => {
  assert.match(
    premium,
    /\.dilz-feed-grid\.is-spotlight[^{]*\.dilz-deal-card__media \{[^}]*min-height: 100%[^}]*aspect-ratio: auto/s,
    'the media fills the card rather than keeping a fixed ratio'
  );
  assert.match(premium, /\.dilz-feed-grid\.is-spotlight[^{]*\.dilz-deal-card__media img \{[^}]*object-fit: cover/s);
  // Two rules further up set .dilz-deal-card h3 with !important, one of them
  // inside the phone media query, so the row's own size has to be as loud.
  assert.match(premium, /\.dilz-feed-grid\.is-spotlight[^{]*\.is-spotlight h3 \{[^}]*font-size: 18px !important/s);
  // And it belongs in this file only: defining the row in both stylesheets is
  // what put the action bar on top of the title before.
  assert.doesNotMatch(css, /Row card refinements/);
});

test('a saving is never struck through', () => {
  // .dilz-deal-card__price-row span strikes every span it contains, and a
  // Badge is a span — which is how the green -35% ended up with a line
  // through it on a real phone.
  assert.match(premium, /\.dilz-deal-card__price-row \.dilz-badge \{[^}]*text-decoration: none/s);
});

test('the byline can wrap, and the action bar cannot', () => {
  // Measured on a phone: the byline was cut mid-word ("2 hours a…") and the
  // vote pill, bookmark and button had spilled onto a second line.
  assert.match(premium, /\.is-spotlight \.dilz-deal-card__author \{[^}]*white-space: normal/s);
  assert.match(premium, /\.is-spotlight \.dilz-deal-card__actions \{[^}]*flex-wrap: nowrap/s);
  // The store name keeps its room; the city is what gives way.
  assert.match(premium, /\.dilz-deal-card__store-row strong \{[^}]*flex: 0 0 auto/s);
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
