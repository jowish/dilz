import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const read = (...parts) => readFile(path.join(process.cwd(), ...parts), 'utf8');

const [
  css,
  premiumCss,
  explore,
  splash,
  app,
  dealCard,
  safetyActions,
  postForm,
  alerts,
  detail,
] = await Promise.all([
  read('styles', 'globals.css'),
  read('styles', 'premium-refresh.css'),
  read('pages', 'explore.js'),
  read('assets', 'ios-splash.svg'),
  read('pages', '_app.js'),
  read('components', 'deals', 'DealCard.js'),
  read('components', 'ui', 'SafetyActions.js'),
  read('components', 'deals', 'PostDealModal.js'),
  read('components', 'ui', 'AlertModal.js'),
  read('pages', 'deal', '[id].js'),
]);

test('partial rollback keeps only the requested design-system changes', () => {
  assert.match(css, /Dilz premium polish layer: tokens, surfaces and subtle borders/);
  assert.match(css, /--brand:\s*#F97316/);
  assert.match(css, /--bg:\s*#070B12/);
  assert.match(css, /--border-default:\s*rgba\(15,\s*23,\s*42,\s*0\.12\)/);
  assert.match(css, /--border-default:\s*rgba\(148,\s*163,\s*184,\s*0\.20\)/);
  assert.match(explore, /Find every type of deal in one place\./);
  assert.match(splash, /fill="#F97316"/);
  assert.doesNotMatch(css, /Dilz premium polish layer:[\s\S]*\.dilz-alerts-route/);
  assert.doesNotMatch(css, /Dilz premium polish layer:[\s\S]*\.dilz-alert-page__panel/);
  assert.doesNotMatch(css, /Dilz premium polish layer:[\s\S]*\.dilz-alert-suggestions/);
});

test('premium refresh preserves behavior while moving owner actions into the safety menu', () => {
  assert.match(app, /defaultTheme="system" enableSystem/);
  assert.match(app, /import '\.\.\/styles\/globals\.css';?[\s\S]*import '\.\.\/styles\/premium-refresh\.css';?/);
  assert.doesNotMatch(dealCard, /dilz-owner-menu/);
  assert.doesNotMatch(dealCard, /dilz-owner-delete/);
  assert.doesNotMatch(dealCard, /dilz-owner-edit/);
  assert.match(dealCard, /onEdit=\{isOwner \? editOwnerDeal : undefined\}/);
  assert.match(dealCard, /onDelete=\{isOwner && onOwnerDelete/);
  assert.match(safetyActions, /className="is-destructive"/);
  assert.match(postForm, /addPhoto:\s*'Choose photos'/);
  assert.doesNotMatch(alerts, /Never miss a deal/);
  assert.match(detail, /className="dilz-deal-source-link"/);
  assert.match(detail, /<span>\{lang === 'he' \? text\.online : 'Get deal'\}<\/span><ArrowUpRightIcon \/>/);
  assert.doesNotMatch(detail, /router\.query\.edit === '1'/);
  assert.doesNotMatch(premiumCss, /\.dilz-bottom-nav/);
});
