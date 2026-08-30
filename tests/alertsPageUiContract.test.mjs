import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const page = await readFile(path.join(process.cwd(), 'pages', 'alerts.js'), 'utf8');
const alerts = await readFile(path.join(process.cwd(), 'components', 'ui', 'AlertModal.js'), 'utf8');
const home = await readFile(path.join(process.cwd(), 'pages', 'index.js'), 'utf8');
const app = await readFile(path.join(process.cwd(), 'pages', '_app.js'), 'utf8');
const globalNav = await readFile(path.join(process.cwd(), 'components', 'layout', 'GlobalBottomNav.js'), 'utf8');
const routeHelpers = await readFile(path.join(process.cwd(), 'lib', 'globalBottomNavRoutes.mjs'), 'utf8');
const css = await readFile(path.join(process.cwd(), 'styles', 'globals.css'), 'utf8');

test('alerts render as a dedicated route with persistent bottom navigation', () => {
  assert.match(page, /export default function AlertsPage/);
  assert.doesNotMatch(page, /<BottomNav/);
  assert.match(app, /<GlobalBottomNav \/>/);
  assert.match(globalNav, /activeFromPath\(router\.asPath, router\.pathname\)/);
  assert.match(routeHelpers, /if \(path === '\/alerts'\) return 'alerts'/);
  assert.match(globalNav, /onAlerts=\{openNotifications\}/);
  assert.match(globalNav, /if \(!user\) \{ push\('\/auth\?redirect=\/alerts', 'alerts'\); return; \}/);
  assert.doesNotMatch(home, /<AlertModal/);
  assert.match(css, /\.dilz-alerts-route\s*\{[^}]*min-height:\s*100dvh/s);
});

test('alerts page exposes real popular-search suggestions and author follows', () => {
  assert.match(alerts, /fetch\('\/api\/search-analytics\?min=20&limit=8'/);
  assert.match(alerts, /popularSearches\.map/);
  assert.doesNotMatch(alerts, /PS5|Nintendo Switch 2|Rami Levy|Shufersal/);
  assert.match(alerts, /fetch\('\/api\/user-follows'/);
  assert.match(alerts, /toggleFollow\(candidate\)/);
  assert.match(alerts, /followedUsers = followUsers\.filter/);
  assert.match(alerts, /dilz-following-summary/);
  assert.match(alerts, /aria-pressed=\{candidate\.is_following\}/);
});

test('alerts page owns notification results and read state', () => {
  assert.match(alerts, /fetch\('\/api\/notifications'/);
  assert.match(alerts, /const \[notifications, setNotifications\] = useState\(\[\]\)/);
  assert.match(alerts, /id="alert-results-title"/);
  assert.match(alerts, /Alert results/);
  assert.match(alerts, /markAllNotificationsRead/);
  assert.match(alerts, /openNotificationDeal\(notification\)/);
  assert.match(alerts, /window\.dispatchEvent\(new Event\('dilz:notifications-read'\)\)/);
});

test('new alerts can target a deal category', () => {
  assert.match(alerts, /DEAL_CATEGORIES, getDealCategoryLabel/);
  assert.match(alerts, /category: ''/);
  assert.match(alerts, /category: form\.category \|\| null/);
  assert.match(alerts, /DEAL_CATEGORIES\.map\(\(category\) =>/);
  assert.match(alerts, /getDealCategoryLabel\(category, lang\)/);
});
