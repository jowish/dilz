import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const page = await readFile(path.join(process.cwd(), 'pages', 'alerts.js'), 'utf8');
const alerts = await readFile(path.join(process.cwd(), 'components', 'ui', 'AlertModal.js'), 'utf8');
const home = await readFile(path.join(process.cwd(), 'pages', 'index.js'), 'utf8');
const css = await readFile(path.join(process.cwd(), 'styles', 'globals.css'), 'utf8');

test('alerts render as a dedicated route with persistent bottom navigation', () => {
  assert.match(page, /export default function AlertsPage/);
  assert.match(page, /activeTab="alerts"/);
  assert.match(home, /router\.push\('\/alerts'\)/);
  assert.doesNotMatch(home, /<AlertModal/);
  assert.match(css, /\.dilz-alerts-route\s*\{[^}]*min-height:\s*100dvh/s);
});

test('alerts page exposes popular suggestions and author follows', () => {
  for (const keyword of ['PS5', 'Nintendo Switch 2', 'iPhone', 'MacBook', 'Fan']) assert.match(alerts, new RegExp(keyword));
  assert.match(alerts, /fetch\('\/api\/user-follows'/);
  assert.match(alerts, /toggleFollow\(candidate\)/);
});
