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
  assert.match(css, /\.dilz-form-grid--two\.dilz-date-fields\s*\{[^}]*width:\s*min\(100%, 360px\)[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/s);
  assert.match(css, /\.dilz-date-fields \.dilz-date-input\s*\{[^}]*min-height:\s*46px/s);
  assert.match(css, /@media \(max-width: 380px\)[\s\S]*?\.dilz-form-grid--two\.dilz-date-fields\s*\{[^}]*grid-template-columns:\s*1fr/s);
});

test('old price is optional but cannot be below current price', () => {
  assert.match(modal, /form\.prix_original !== '' && Number\(form\.prix_original\) < Number\(form\.prix\)/);
  assert.match(modal, /label=\{text\.oldPrice\} error=\{fieldErrors\.prix_original\}/);
});

test('both price fields request a decimal numeric keyboard', () => {
  assert.equal((modal.match(/type="number" inputMode="decimal"/g) || []).length, 2);
});

test('a selected city exposes an accessible clear control', () => {
  assert.match(cityPicker, /value && \([\s\S]*?dilz-city-picker__clear/);
  assert.match(cityPicker, /onClick=\{\(\) => select\(null\)\}/);
  assert.match(cityPicker, /Clear selected city/);
  assert.match(modal, /clearDealCity\(current\)/);
});

test('current location keeps coordinates even when reverse geocoding does not resolve an address', () => {
  assert.match(modal, /setForm\(\(current\) => \(\{\s*\.\.\.current,\s*latitude: coords\.latitude,\s*longitude: coords\.longitude,\s*\}\)\);/s);
  assert.match(modal, /if \(response\.ok\) \{\s*setForm\(\(current\) => \(\{\s*\.\.\.current,\s*ville: location\.city \|\| current\.ville,\s*adresse: location\.address \|\| current\.adresse,/s);
  assert.match(modal, /catch \{\}\s*setFieldErrors/);
});

test('city arrow stays at the right edge with clear immediately to its left', () => {
  assert.match(cityPicker, /dilz-city-picker__clear[\s\S]*?dilz-city-picker__arrow/);
  assert.match(css, /\.dilz-city-picker__clear\s*\{[^}]*right:\s*38px/s);
  assert.match(css, /\.dilz-city-picker__arrow\s*\{[^}]*right:\s*13px/s);
});
