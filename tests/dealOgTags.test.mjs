import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const dealDetail = await readFile(path.join(process.cwd(), 'pages', 'deal', '[id].js'), 'utf8');

test('deal page is server-rendered so OG tags reach non-JS crawlers on the first response', () => {
  assert.match(dealDetail, /export async function getServerSideProps\(\{ params \}\)/);
  assert.match(dealDetail, /\.from\('bons_plans'\)/);
  assert.match(dealDetail, /\.eq\('id', params\.id\)/);
  assert.match(dealDetail, /\.or\('statut\.eq\.actif,statut\.is\.null'\)/);
  assert.match(dealDetail, /props: \{ initialDeal: null \}/);
  assert.match(dealDetail, /export default function DealPage\(\{ initialDeal \}\)/);
  assert.match(dealDetail, /const \[deal, setDeal\] = useState\(initialDeal \|\| null\)/);
});

test('OG/title tags are computed from `deal` and rendered unconditionally, before the mounted/loading/not-found gates', () => {
  const beforeMountedGate = dealDetail.slice(0, dealDetail.indexOf('if (!mounted)'));
  assert.match(beforeMountedGate, /const pageTitle = deal\s*\n\s*\? `\$\{deal\.titre\} — ₪\$\{deal\.prix\} at \$\{deal\.magasin\} \| Dilz`/);
  assert.match(beforeMountedGate, /const headTags = \(/);
  assert.match(beforeMountedGate, /<meta property="og:title" content=\{pageTitle\} \/>/);
  assert.match(beforeMountedGate, /<meta property="og:description" content=\{pageDesc\} \/>/);
  assert.match(beforeMountedGate, /\{dealImage && <meta property="og:image" content=\{dealImage\} \/>\}/);
  // The old bug: Head only ever rendered after `!mounted`/`loading`/`!deal` had
  // all already returned early, so a non-JS crawler (mounted is always false
  // during SSR) saw nothing at all for this route.
  assert.match(dealDetail, /if \(!mounted\) return headTags;/);
  assert.match(dealDetail, /if \(!deal\) \{\s*return \(\s*<>\s*\{headTags\}/);
});

test('per-deal image and price/store are reflected in the OG description when no free-text description exists', () => {
  assert.match(dealDetail, /: `\$\{deal\.titre\} for ₪\$\{deal\.prix\} at \$\{deal\.magasin\}\$\{deal\.ville \? `, \$\{deal\.ville\}` : ''\}\. Found on Dilz\.`\)/);
  assert.match(dealDetail, /const dealImage = deal\?\.image_url;/);
});
