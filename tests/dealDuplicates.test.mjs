import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  normalizeUrl, titleSimilarity, priceMatches, scoreCandidate, findDuplicates,
} = require(path.join(process.cwd(), 'lib', 'dealDuplicates.js'));

const NOW = Date.parse('2026-09-04T12:00:00Z');
const daysAgo = (d) => new Date(NOW - d * 86400000).toISOString();

test('the same page shared two different ways is one URL', () => {
  const a = normalizeUrl('https://www.ksp.co.il/web/item/12345?utm_source=whatsapp&fbclid=abc');
  const b = normalizeUrl('http://ksp.co.il/web/item/12345/');
  assert.equal(a, b);
  assert.equal(a, 'ksp.co.il/web/item/12345');
});

test('meaningful query parameters are kept', () => {
  assert.notEqual(
    normalizeUrl('https://shop.com/p?id=1'),
    normalizeUrl('https://shop.com/p?id=2'),
  );
});

test('non-http and malformed URLs are ignored rather than matched', () => {
  for (const value of ['javascript:alert(1)', 'not a url', '', null, undefined]) {
    assert.equal(normalizeUrl(value), null);
  }
});

test('titles match across punctuation, case and Hebrew geresh', () => {
  assert.ok(titleSimilarity('AirPods Pro 2', 'airpods pro 2!') > 0.9);
  assert.ok(titleSimilarity("עגבניות שרי 500 גר'", 'עגבניות שרי 500 גר') > 0.9);
});

test('unrelated titles do not match', () => {
  assert.ok(titleSimilarity('AirPods Pro', 'Washing machine 8kg') < 0.2);
});

test('generic deal words alone are not a match', () => {
  // Both are "deal/sale" noise; nothing distinguishing is shared.
  assert.equal(titleSimilarity('New deal offer', 'Sale promo deal'), 0);
});

test('prices match within a tolerance but not across real differences', () => {
  assert.equal(priceMatches(799, 799), true);
  assert.equal(priceMatches(799, 789), true, '1.3% apart');
  assert.equal(priceMatches(799, 499), false);
  assert.equal(priceMatches(0, 0), true);
  assert.equal(priceMatches(null, 799), false);
});

test('an identical source URL is high confidence on its own', () => {
  const match = scoreCandidate(
    { titre: 'Completely different words', magasin: 'Other shop', prix: 55, url_source: 'https://ksp.co.il/item/1?utm_source=x' },
    { titre: 'AirPods Pro', magasin: 'KSP', prix: 799, url_source: 'https://www.ksp.co.il/item/1', created_at: daysAgo(3) },
    { now: NOW },
  );
  assert.equal(match.confidence, 'high');
  assert.ok(match.reasons.includes('same_url'));
});

test('same store + similar title + similar price is high confidence', () => {
  const match = scoreCandidate(
    { titre: 'AirPods Pro 2nd gen', magasin: 'KSP', prix: 799 },
    { titre: 'AirPods Pro 2nd gen', magasin: 'ksp', prix: 789, created_at: daysAgo(2) },
    { now: NOW },
  );
  assert.equal(match.confidence, 'high');
  assert.deepEqual(match.reasons.sort(), ['same_price', 'same_store', 'similar_title'].sort());
});

test('same store and title but a very different price is only medium', () => {
  const match = scoreCandidate(
    { titre: 'AirPods Pro 2nd gen', magasin: 'KSP', prix: 399 },
    { titre: 'AirPods Pro 2nd gen', magasin: 'KSP', prix: 799, created_at: daysAgo(2) },
    { now: NOW },
  );
  assert.equal(match.confidence, 'medium');
});

test('the same product at a different store is not a duplicate', () => {
  const match = scoreCandidate(
    { titre: 'AirPods Pro', magasin: 'Ivory', prix: 799 },
    { titre: 'AirPods Pro', magasin: 'KSP', prix: 799, created_at: daysAgo(2) },
    { now: NOW },
  );
  assert.equal(match.confidence, null, 'a better price elsewhere is a real, new deal');
});

test('an old deal is not flagged as a duplicate of a new post', () => {
  const match = scoreCandidate(
    { titre: 'AirPods Pro', magasin: 'KSP', prix: 799 },
    { titre: 'AirPods Pro', magasin: 'KSP', prix: 799, created_at: daysAgo(200) },
    { now: NOW },
  );
  assert.equal(match.confidence, null);
  assert.ok(match.reasons.includes('old'));
});

test('matches come back strongest first, and non-matches are dropped', () => {
  const incoming = { titre: 'AirPods Pro 2', magasin: 'KSP', prix: 799, url_source: 'https://ksp.co.il/item/9' };
  const matches = findDuplicates(incoming, [
    { id: 1, titre: 'Washing machine', magasin: 'Other', prix: 2000, created_at: daysAgo(1) },
    { id: 2, titre: 'AirPods Pro 2', magasin: 'KSP', prix: 795, created_at: daysAgo(1) },
    { id: 3, titre: 'Unrelated', magasin: 'Nowhere', prix: 5, url_source: 'https://ksp.co.il/item/9', created_at: daysAgo(1) },
  ], { now: NOW });

  assert.equal(matches.length, 2, 'the unrelated deal is dropped');
  assert.equal(matches[0].deal.id, 3, 'the exact URL match ranks first');
  assert.ok(matches.every((m) => m.confidence));
});

test('empty or malformed input never throws', () => {
  assert.deepEqual(findDuplicates(null, []), []);
  assert.deepEqual(findDuplicates({}, null), []);
  assert.deepEqual(findDuplicates({ titre: '' }, [{}]), []);
});
