import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const read = (...parts) => readFile(path.join(process.cwd(), ...parts), 'utf8');

const [
  app,
  css,
  dealCard,
  dealDetail,
  postForm,
  alerts,
  explore,
] = await Promise.all([
  read('pages', '_app.js'),
  read('styles', 'globals.css'),
  read('components', 'deals', 'DealCard.js'),
  read('pages', 'deal', '[id].js'),
  read('components', 'deals', 'PostDealModal.js'),
  read('components', 'ui', 'AlertModal.js'),
  read('pages', 'explore.js'),
]);

test('premium theme uses dark-first Dilz tokens and disciplined orange', () => {
  assert.match(app, /defaultTheme="dark"/);
  assert.match(css, /--bg:\s*#070B12/);
  assert.match(css, /--bg-card:\s*#0D1420/);
  assert.match(css, /--text-primary:\s*#F8FAFC/);
  assert.match(css, /--brand:\s*#F97316/);
  assert.match(css, /--brand-soft:\s*rgba\(249,\s*115,\s*22,\s*0\.14\)/);
  assert.match(css, /--border-default:\s*rgba\(148,\s*163,\s*184,\s*0\.20\)/);
});

test('deal cards keep admin actions hidden behind a secondary owner menu', () => {
  assert.match(dealCard, /dilz-owner-menu/);
  assert.match(dealCard, /router\.push\(`\/deal\/\$\{deal\.id\}\?edit=1`\)/);
  assert.match(dealCard, /className="is-destructive"/);
  assert.match(css, /\.dilz-deal-card__right-actions \.dilz-owner-delete,[\s\S]*?display:\s*none\s*!important/s);
  assert.match(css, /\.dilz-safety-actions__menu \.is-destructive\s*\{[^}]*color:\s*var\(--danger\)\s*!important/s);
});

test('deal detail has a conversion-oriented primary action area', () => {
  assert.match(dealDetail, /dilz-deal-primary-action/);
  assert.match(dealDetail, /Get deal/);
  assert.match(dealDetail, /Open location/);
  assert.match(dealDetail, /View details/);
  assert.match(dealDetail, /router\.query\.edit === '1'/);
});

test('post flow uses premium upload copy and completed-step checkmarks', () => {
  assert.match(postForm, /uploadTitle:\s*'Choose photos'/);
  assert.match(postForm, /Upload 1-3 photos or screenshots/);
  assert.match(postForm, /Why is this a good deal\?/);
  assert.match(postForm, /step > index \? '✓' : index \+ 1/);
  assert.match(css, /\.dilz-upload-dropzone,[\s\S]*?border:\s*1\.5px dashed var\(--border-strong\)\s*!important/s);
});

test('alerts and explore read as consumer discovery surfaces', () => {
  assert.match(alerts, /Never miss a deal/);
  assert.match(alerts, /Create alerts for stores, products, cities or discount levels\./);
  assert.match(alerts, /dilz-alert-item__copy/);
  assert.match(explore, /Find every type of deal in one place\./);
  assert.match(css, /\.dilz-explore-card\s*\{[^}]*min-height:\s*62px\s*!important/s);
});
