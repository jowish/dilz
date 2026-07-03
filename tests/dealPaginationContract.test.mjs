import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const api = await readFile(path.join(process.cwd(), 'pages', 'api', 'bons-plans.js'), 'utf8');
const home = await readFile(path.join(process.cwd(), 'pages', 'index.js'), 'utf8');
const css = await readFile(path.join(process.cwd(), 'styles', 'globals.css'), 'utf8');

test('deals API defaults to small paginated pages and returns pagination metadata', () => {
  assert.match(api, /limit = 25, offset = 0/);
  assert.match(api, /const responseLimit = clampLimit\(limit, 25, 500\)/);
  assert.match(api, /const responseOffset = Math\.max\(0, Number\.parseInt\(String\(offset\), 10\) \|\| 0\)/);
  assert.match(api, /query = query\.range\(responseOffset, responseOffset \+ responseLimit - 1\)/);
  assert.match(api, /limit: responseLimit/);
  assert.match(api, /offset: responseOffset/);
  assert.match(api, /hasMore: responseOffset \+ rows\.length < \(count \|\| 0\)/);
  assert.doesNotMatch(api, /limit = 200/);
  assert.doesNotMatch(api, /fetchLimit = tri === 'comments' \? 500/);
});

test('home feed fetches the first 25 deals before rendering more pages', () => {
  assert.match(home, /const DEAL_PAGE_SIZE = 25/);
  assert.match(home, /params\.set\('limit', String\(DEAL_PAGE_SIZE\)\)/);
  assert.match(home, /params\.set\('offset', String\(offset\)\)/);
  assert.match(home, /fetchDealsPage\(\{ offset: 0, append: false, signal: controller\.signal \}\)/);
  assert.doesNotMatch(home, /fetch\(`\/api\/bons-plans\?\$\{params\}`[\s\S]*setDeals\(nextDeals\)[\s\S]*setLoadingDeals\(false\)[\s\S]*fetch\('\/api\/bons-plans\?tri=latest'\)/);
});

test('home feed appends later pages without duplicating deals', () => {
  assert.match(home, /const \[loadingMoreDeals, setLoadingMoreDeals\] = useState\(false\)/);
  assert.match(home, /const \[hasMoreDeals, setHasMoreDeals\] = useState\(false\)/);
  assert.match(home, /const seen = new Set\(current\.map\(\(deal\) => deal\.id\)\)/);
  assert.match(home, /return \[\.\.\.current, \.\.\.nextDeals\.filter\(\(deal\) => !seen\.has\(deal\.id\)\)\]/);
  assert.match(home, /setHasMoreDeals\(typeof d\.hasMore === 'boolean' \? d\.hasMore : offset \+ nextDeals\.length < nextTotal\)/);
});

test('home feed loads the next 25 deals from an intersection sentinel', () => {
  assert.match(home, /const dealListEndRef = useRef\(null\)/);
  assert.match(home, /new IntersectionObserver\(\(entries\) => \{/);
  assert.match(home, /entry\.isIntersecting/);
  assert.match(home, /loadMoreDealsRef\.current\?\.\(\)/);
  assert.match(home, /rootMargin: '480px 0px 480px 0px'/);
  assert.match(home, /fetchDealsPage\(\{ offset: deals\.length, append: true, signal: controller\.signal \}\)/);
  assert.match(home, /className="dilz-feed-sentinel"/);
  assert.match(home, /dilz-loading-state--more/);
  assert.match(css, /\.dilz-loading-state--more\s*\{[^}]*padding:\s*20px 0 28px/s);
});

test('empty state waits until the paginated API says there are no more deals', () => {
  assert.match(home, /visibleDeals\.length === 0 && !hasMoreDeals/);
  assert.doesNotMatch(home, /visibleDeals\.length === 0 \? \(/);
});
