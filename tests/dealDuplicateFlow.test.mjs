import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const read = (...parts) => readFile(path.join(process.cwd(), ...parts), 'utf8');
const [dealsApi, checkApi, lookup, prompt, postFlow] = await Promise.all([
  read('pages', 'api', 'bons-plans.js'),
  read('pages', 'api', 'deal-duplicates.js'),
  read('lib', 'dealDuplicateLookup.js'),
  read('components', 'deals', 'DuplicateDealPrompt.js'),
  read('components', 'deals', 'PostDealModal.js'),
]);

test('the duplicate rule is enforced on the server, not only in the posting UI', () => {
  assert.match(dealsApi, /req\.body\.allow_duplicate !== true/);
  assert.match(dealsApi, /DUPLICATE_SUSPECTED/);
  assert.match(dealsApi, /status\(409\)/);
  // Only a high-confidence match blocks; weaker signals are advisory.
  assert.match(dealsApi, /match\.confidence === 'high'/);
});

test('an existing deal is never modified or removed by the duplicate check', () => {
  const postBlock = dealsApi.slice(dealsApi.indexOf('Duplicate guard'), dealsApi.indexOf('const auteur_nom'));
  assert.doesNotMatch(postBlock, /\.delete\(/);
  assert.doesNotMatch(postBlock, /\.update\(/);
  assert.doesNotMatch(postBlock, /\.upsert\(/);
});

test('a failing duplicate lookup never blocks a legitimate post', () => {
  // Both the pre-check endpoint and the publish guard swallow lookup errors.
  assert.match(checkApi, /catch \(error\)[\s\S]*matches: \[\]/);
  assert.match(dealsApi, /\} catch \{\s*\n\s*\/\/ Never let a failing duplicate lookup stop a legitimate post\./);
});

test('candidate lookup is bounded and keeps user text out of the filter grammar', () => {
  assert.match(lookup, /CANDIDATE_LIMIT = \d+/);
  assert.match(lookup, /\.limit\(CANDIDATE_LIMIT\)/);
  assert.match(lookup, /\.gte\('created_at', since\)/);
  assert.match(lookup, /function sanitizeFilterValue/);
  assert.match(lookup, /replace\(\/\[\(\),\."'\\\\\*%_\]\/g/);
});

test('the prompt offers view, confirm, add information and a low-key post anyway', () => {
  assert.match(prompt, /View existing deal/);
  assert.match(prompt, /Confirm this deal/);
  assert.match(prompt, /Add information/);
  assert.match(prompt, /Post anyway/);
  // Hebrew too.
  assert.match(prompt, /הצגת הדיל הקיים/);
  assert.match(prompt, /אישור הדיל הזה/);
});

test('confirming an existing deal feeds its freshness instead of creating a copy', () => {
  assert.match(prompt, /\/api\/deal-availability/);
  assert.match(prompt, /available: true/);
  // Confirming must not post a deal.
  assert.doesNotMatch(prompt, /\/api\/bons-plans/);
});

test('the posting flow checks before uploading, and honours an explicit override', () => {
  assert.match(postFlow, /if \(!allowDuplicate\) \{\s*\n\s*const matches = await checkForDuplicates\(\);/);
  assert.match(postFlow, /allow_duplicate: allowDuplicate/);
  assert.match(postFlow, /setAllowDuplicate\(true\)/);
  // A late 409 (someone else posted meanwhile) shows the prompt, not an error,
  // and cleans up the images that were already uploaded.
  assert.match(postFlow, /response\.status === 409 && data\.code === 'DUPLICATE_SUSPECTED'/);
  assert.match(postFlow, /uploadPaths\.map\(\(path\) => deleteDealImage\(path\)\)/);
});
