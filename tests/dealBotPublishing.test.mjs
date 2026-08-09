import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const route = await readFile(path.join(process.cwd(), 'pages', 'api', 'admin', 'deal-bot.js'), 'utf8');

// Quality-filtered deal-bot deals publish directly instead of sitting in a
// manual-approval queue. selectQualityDeals() is already a strict bar (score
// >= threshold, requires image + price + direct URL); the pending gate added
// no real safety and let deals pile up unseen. Guard against a regression
// back to pending, and against silently touching the scoring logic.
test('deal-bot inserts quality-filtered deals as actif, not pending', () => {
  assert.match(route, /const rows = selected\.map\(/);
  assert.match(route, /statut:\s*'actif'/);
  assert.doesNotMatch(route, /statut:\s*'pending'/);
});

test('the quality filter itself is untouched by the publishing change', () => {
  assert.match(route, /selectQualityDeals\(merged, minScore\)/);
  assert.doesNotMatch(route, /minScore\s*=\s*0/);
});
