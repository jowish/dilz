import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const dealDetail = await readFile(path.join(process.cwd(), 'pages', 'deal', '[id].js'), 'utf8');

test('opening a deal does not re-fetch data getServerSideProps already delivered', () => {
  // The `id`-keyed effect used to unconditionally call fetchDeal() -> a
  // client-side hit to /api/deal/[id] that ran the exact same Supabase
  // query getServerSideProps had just run on the server, on every single
  // deal open (both a hard load and a client-side nav between two deal
  // pages, where Next re-runs getServerSideProps and delivers a fresh
  // `initialDeal` prop without a full reload). That doubled the network
  // round-trip on the page's critical path. It must now seed straight from
  // the prop instead, only falling back to a real fetch when there's no
  // usable `initialDeal` (e.g. SSR returned null).
  const idEffectStart = dealDetail.indexOf('if (!id) return;');
  assert.ok(idEffectStart >= 0, 'expected the id-keyed effect to exist');
  const idEffectEnd = dealDetail.indexOf('}, [id, initialDeal]);', idEffectStart);
  assert.ok(idEffectEnd > idEffectStart, 'expected the id-keyed effect to depend on [id, initialDeal]');
  const idEffect = dealDetail.slice(idEffectStart, idEffectEnd);

  assert.match(idEffect, /if \(initialDeal && String\(initialDeal\.id\) === String\(id\)\) \{/);
  assert.match(idEffect, /setDeal\(initialDeal\);/);
  assert.match(idEffect, /\} else \{\s*fetchDeal\(\);\s*\}/);

  // fetchDeal() still exists and is still used to refresh the page after a
  // successful edit, since a save isn't a navigation and getServerSideProps
  // doesn't re-run for it.
  assert.match(dealDetail, /const fetchDeal = async \(\) => \{/);
  assert.match(dealDetail, /await fetchDeal\(\);/);
});

test('loading only blocks first paint when there is no server-rendered deal yet', () => {
  assert.match(dealDetail, /const \[loading, setLoading\] = useState\(!initialDeal\);/);
});
