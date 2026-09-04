import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const read = (...parts) => readFile(path.join(process.cwd(), ...parts), 'utf8');
const [modal, postPage, css] = await Promise.all([
  read('components', 'deals', 'PostDealModal.js'),
  read('pages', 'post.js'),
  read('styles', 'globals.css'),
]);

test('the posting flow is three stages: add, review, publish', () => {
  assert.match(modal, /steps: \['Add', 'Review', 'Publish'\]/);
  assert.match(modal, /steps: \['הוספה', 'בדיקה', 'פרסום'\]/);
  assert.match(modal, /const STEP_ADD = 0/);
  assert.match(modal, /const STEP_REVIEW = 1/);
  assert.match(modal, /const STEP_PUBLISH = 2/);
  assert.match(modal, /const LAST_STEP = STEP_PUBLISH/);
  // No fourth stage left behind.
  assert.doesNotMatch(modal, /step === 3/);
  assert.doesNotMatch(modal, /step < 3/);
  assert.match(css, /\.dilz-post-stepper \{[^}]*grid-template-columns: repeat\(3, 1fr\)/s);
});

test('the stepper shows stage names rather than the numbers 1 2 3 4', () => {
  assert.doesNotMatch(modal, /<span>\{index \+ 1\}<\/span>/);
  assert.match(modal, /aria-current=\{step === index \? 'step' : undefined\}/);
});

test('details and location are reviewed together, so nothing needs a fourth screen', () => {
  const review = modal.slice(modal.indexOf('{step === STEP_REVIEW &&'), modal.indexOf('{step === STEP_PUBLISH &&'));
  assert.match(review, /label=\{text\.dealTitle\}/);
  assert.match(review, /label=\{text\.price\}/);
  assert.match(review, /SegmentedControl/);
  assert.match(review, /CityPicker/);
  assert.match(review, /dilz-date-fields/);
});

test('the deal link is collected with the other sources on the first stage', () => {
  const add = modal.slice(modal.indexOf('{step === STEP_ADD &&'), modal.indexOf('{step === STEP_REVIEW &&'));
  assert.match(add, /label=\{text\.url\}/);
  assert.match(add, /helper=\{text\.sourceUrlHelp\}/);
  // A link that is only required once the deal is marked online must send the
  // author back to the field instead of showing an error they cannot reach.
  assert.match(modal, /errors\.images \|\| errors\.url_source \? STEP_ADD : STEP_REVIEW/);
  assert.match(modal, /if \(errors\.url_source && Object\.keys\(errors\)\.length === 1\) setStep\(STEP_ADD\)/);
});

test('publishing still validates every stage, not just the visible one', () => {
  assert.match(modal, /\[STEP_ADD, STEP_REVIEW\]\.reduce/);
});

test('the post page does not stack a second header above the posting surface', () => {
  assert.doesNotMatch(postPage, /dilz-alerts-route__header/);
  assert.doesNotMatch(postPage, /Wordmark/);
});
