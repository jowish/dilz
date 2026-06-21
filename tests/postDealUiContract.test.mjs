import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const modal = await readFile(path.join(process.cwd(), 'components', 'deals', 'PostDealModal.js'), 'utf8');
const cityPicker = await readFile(path.join(process.cwd(), 'components', 'ui', 'CityPicker.js'), 'utf8');
const css = await readFile(path.join(process.cwd(), 'styles', 'globals.css'), 'utf8');

test('the primary photo renders inside the original upload zone', () => {
  assert.match(modal, /dilz-upload-zone__picker[\s\S]*?imageSlots\.primary[\s\S]*?<img src=\{imageSlots\.primary\.preview\}/);
  assert.match(modal, /imageSlots\.thumbnails\.map/);
});

test('deal dates use two compact controls instead of full-width rows', () => {
  assert.equal((modal.match(/className="dilz-date-input"/g) || []).length, 2);
  assert.match(css, /\.dilz-form-grid--two\.dilz-date-fields\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(132px, 164px\)\)/s);
  assert.match(css, /\.dilz-date-fields \.dilz-date-input\s*\{[^}]*min-height:\s*42px/s);
});

test('a selected city exposes an accessible clear control', () => {
  assert.match(cityPicker, /value && \([\s\S]*?dilz-city-picker__clear/);
  assert.match(cityPicker, /onClick=\{\(\) => select\(null\)\}/);
  assert.match(cityPicker, /Clear selected city/);
  assert.match(modal, /clearDealCity\(current\)/);
});
