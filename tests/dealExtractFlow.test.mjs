import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const read = (...parts) => readFile(path.join(process.cwd(), ...parts), 'utf8');
const [api, modal, helper, css] = await Promise.all([
  read('pages', 'api', 'deal-extract.js'),
  read('components', 'deals', 'PostDealModal.js'),
  read('lib', 'postDealForm.js'),
  read('styles', 'globals.css'),
]);

test('the extraction endpoint refuses anonymous callers before spending anything', () => {
  // Inside the handler, the auth check must come before the fetch and before
  // any model call — not merely be present somewhere in the file.
  const handler = api.slice(api.indexOf('export default async function handler'));
  const authIndex = handler.indexOf('Sign in to read deal details');
  assert.ok(authIndex > -1);
  assert.ok(authIndex < handler.indexOf('fetchPublicHtml'), 'auth is checked before fetching');
  assert.ok(authIndex < handler.indexOf('extractFromImage'), 'auth is checked before the model call');
  assert.match(api, /status\(401\)/);
});

test('user-supplied links are fetched through the guarded fetcher only', () => {
  assert.match(api, /require\('\.\.\/\.\.\/lib\/safeUrlFetch'\)/);
  assert.match(api, /await fetchPublicHtml\(sourceUrl\)/);
  // No unguarded fetch of the poster's URL anywhere in the handler.
  assert.doesNotMatch(api, /await fetch\(sourceUrl/);
});

test('the vision half is optional and never runs without a key', () => {
  assert.match(api, /const apiKey = process\.env\.ANTHROPIC_API_KEY;\s*\n\s*if \(!apiKey\) return null;/);
  assert.match(api, /media_type: image\.mediaType/);
  // And it is skipped entirely when the page already answered.
  assert.match(api, /const pageWasEnough = Boolean\(fromUrl\.titre\) && typeof fromUrl\.prix === 'number'/);
  assert.match(api, /if \(image && !pageWasEnough\)/);
});

test('image payloads are bounded and type-checked before being sent on', () => {
  assert.match(api, /ALLOWED_IMAGE_TYPES = \['image\/jpeg', 'image\/png', 'image\/webp'\]/);
  assert.match(api, /MAX_IMAGE_BYTES/);
  assert.match(api, /data\.length \* 0\.75 > MAX_IMAGE_BYTES/);
});

test('the model reply is treated as untrusted input', () => {
  // Only known keys, run through the same cleaners as page data.
  assert.match(api, /function shapeVisionResult/);
  assert.match(api, /cleanText\(parsed\.titre, LIMITS\.titre\)/);
  assert.match(api, /parsePrice\(parsed\.prix\)/);
  assert.match(api, /parsed\.online === true \? true : parsed\.online === false \? false : null/);
});

test('a failure to read the source never fails the post', () => {
  // Both failure paths record a warning and still return 200 with fields.
  assert.match(api, /warnings\.push\([\s\S]*?'url_unreadable'\)/);
  assert.match(api, /warnings\.push\('photo_unreadable'\)/);
  assert.doesNotMatch(api, /status\(50[03]\)\.json\(\{ erreur: 'Could not/);
});

test('the flow extracts when leaving Add, and only once per source', () => {
  assert.match(modal, /if \(step === STEP_ADD\) await runExtraction\(\)/);
  assert.match(modal, /const signature = `\$\{sourceUrl\}\|\$\{photo \? photo\.id : ''\}`/);
  assert.match(modal, /if \(signature === lastExtractedSource\.current\) return/);
  assert.match(modal, /loading=\{extracting\}/);
});

test('extraction fills blanks only, and says so on the Review stage', () => {
  // Applied against the current form, outside a state updater — otherwise the
  // list of filled fields is read before React has run the update, and the
  // "we found the details" message contradicts the form the poster is looking at.
  assert.match(modal, /const \{ form: next, filled \} = applyExtraction\(form, payload\.fields \|\| \{\}\)/);
  assert.match(modal, /setExtractionFilled\(filled\)/);
  assert.match(modal, /We found the deal details for you\. Check them before publishing\./);
  assert.match(modal, /מצאנו עבורכם את פרטי הדיל\. בדקו אותם לפני הפרסום\./);
  // Empty and error states are shown too, not just the happy path.
  assert.match(modal, /extractedNone: 'We could not read the details automatically/);
  assert.match(modal, /extractionWarnings\.includes\('price_currency'\)/);
  assert.match(css, /\.dilz-post-extracted \{/);
});

test('the screenshot is downscaled before it is sent', () => {
  assert.match(helper, /export async function screenshotDataUrl/);
  assert.match(helper, /compressImage/);
  assert.match(modal, /screenshotDataUrl\(photo\.file\)/);
});
