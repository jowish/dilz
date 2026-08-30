import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const read = (...parts) => readFile(path.join(process.cwd(), ...parts), 'utf8');

const [appHeader, css] = await Promise.all([
  read('components', 'layout', 'AppHeader.js'),
  read('styles', 'globals.css'),
]);

test('desktop header exposes a profile entry point that mirrors BottomNav', () => {
  assert.match(appHeader, /import \{ Button, IconButton \} from '\.\.\/ui\/Button'/);
  assert.match(appHeader, /const goProfile = \(\) => router\.push\('\/\?tab=profile', undefined, \{ shallow: true, scroll: false \}\)/);
  assert.match(appHeader, /<IconButton onClick=\{goProfile\} selected=\{activeTab === 'profile'\} aria-label=\{labels\.profile\}>/);
  assert.match(appHeader, /<ProfileIcon \/>/);
});

test('desktop header exposes a notifications entry point with the same auth gate and unread badge as BottomNav', () => {
  assert.match(appHeader, /const goAlerts = \(\) => router\.push\(user \? '\/alerts' : '\/auth\?redirect=\/alerts'\)/);
  assert.match(appHeader, /<IconButton onClick=\{goAlerts\} aria-label=\{labels\.alerts\}>/);
  assert.match(appHeader, /<BellIcon \/>/);
  assert.match(appHeader, /unreadCount > 0 && \(/);
  assert.match(appHeader, /className="dilz-header-badge"/);
  assert.match(appHeader, /unreadCount > 9 \? '9\+' : unreadCount/);
});

test('unread count is fetched independently of GlobalBottomNav, reusing the same /api/notifications contract', () => {
  assert.match(appHeader, /fetch\('\/api\/notifications', \{ headers: \{ Authorization: `Bearer \$\{session\.access_token\}` \} \}\)/);
  assert.match(appHeader, /\(data\.notifications \|\| \[\]\)\.filter\(\(notification\) => !notification\.is_read\)\.length/);
  assert.match(appHeader, /window\.addEventListener\('dilz:notifications-read', refreshUnread\)/);
});

test('new header icon buttons rely on the existing mobile-hide rule instead of a new one', () => {
  assert.match(css, /\.dilz-app-header__right \.dilz-icon-button[\s\S]*?display:\s*none/);
  assert.match(css, /\.dilz-header-badge\s*\{[^}]*background:\s*var\(--danger\)/s);
});
