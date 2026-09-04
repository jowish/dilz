import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const read = (...parts) => readFile(path.join(process.cwd(), ...parts), 'utf8');
const [bot, route] = await Promise.all([
  read('scripts', 'deal-bot.js'),
  read('pages', 'api', 'admin', 'deal-bot.js'),
]);

// These assert the switch exists and is honoured on every path — not what it is
// currently set to, so turning the scout back on does not turn CI red.

test('there is one switch, and it is what both entry points read', () => {
  assert.match(bot, /const SCOUT_ENABLED = (?:true|false);/);
  assert.match(bot, /^\s*SCOUT_ENABLED,$/m, 'the switch is exported');
  assert.match(route, /SCOUT_ENABLED,\s*\n\s*candidateKey,/);
});

test('the command-line run discovers nothing while the scout is off', () => {
  const main = bot.slice(bot.indexOf('async function main()'), bot.indexOf('const url = process.env.NEXT_PUBLIC_SUPABASE_URL'));
  assert.match(main, /if \(!SCOUT_ENABLED\) \{[\s\S]*?return;\s*\}/);
});

test('the API route refuses before it discovers or inserts anything', () => {
  const handler = route.slice(route.indexOf('export default async function handler'));
  const guard = handler.indexOf('if (!SCOUT_ENABLED)');
  assert.ok(guard > -1, 'the route must check the switch');
  // Before discovery, before the database client, before the insert.
  for (const later of ['discoverDeals()', 'createClient(', '.insert(']) {
    assert.ok(guard < handler.indexOf(later), `the switch must be checked before ${later}`);
  }
});

test('the reason the scout was switched off is written down next to the switch', () => {
  // So whoever turns it back on knows what to fix first.
  const preamble = bot.slice(0, bot.indexOf('const SCOUT_ENABLED'));
  assert.match(preamble, /publishing news articles as deals/);
});
