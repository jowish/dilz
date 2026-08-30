import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const read = (...parts) => readFile(path.join(process.cwd(), ...parts), 'utf8');

const [globalNav, appHeader, notificationSheet, alertModal] = await Promise.all([
  read('components', 'layout', 'GlobalBottomNav.js'),
  read('components', 'layout', 'AppHeader.js'),
  read('components', 'ui', 'NotificationSheet.js'),
  read('components', 'ui', 'AlertModal.js'),
]);

test('mobile (BottomNav via GlobalBottomNav) and desktop (AppHeader) both open the same notification sheet', () => {
  // Mobile: GlobalBottomNav owns the sheet and opens it directly on its own Alerts tap.
  assert.match(globalNav, /onAlerts=\{openNotifications\}/);
  assert.match(globalNav, /const openNotifications = \(\) => \{/);
  assert.match(globalNav, /setSheetOpen\(true\)/);
  // Desktop: AppHeader can't reach GlobalBottomNav's state directly, so it dispatches
  // the same window event GlobalBottomNav listens for.
  assert.match(appHeader, /window\.dispatchEvent\(new Event\('dilz:open-notifications'\)\)/);
  assert.match(globalNav, /window\.addEventListener\('dilz:open-notifications', openSheet\)/);
});

test('the sheet is mounted with real handlers wired to the notifications API contract', () => {
  assert.match(globalNav, /<NotificationSheet[\s\S]*notifications=\{notifications\}[\s\S]*onClose=\{\(\) => setSheetOpen\(false\)\}[\s\S]*onMarkAllRead=\{markAllRead\}[\s\S]*onOpenAlerts=/);
  assert.match(globalNav, /body: JSON\.stringify\(\{ markAllRead: true \}\)/);
});

test('mark-all-read updates local state and notifies other mounted badges (e.g. the desktop header)', () => {
  assert.match(globalNav, /const markAllRead = \(\) => \{/);
  assert.match(globalNav, /setNotifications\(\(prev\) => prev\.map\(\(notification\) => \(\{ \.\.\.notification, is_read: true \}\)\)\)/);
  assert.match(globalNav, /window\.dispatchEvent\(new Event\('dilz:notifications-read'\)\)/);
});

test('NotificationSheet itself is untouched — only its call site changed', () => {
  assert.match(notificationSheet, /export function NotificationSheet\(\{ user, lang, notifications, onClose, onMarkAllRead, onOpenAlerts \}\)/);
  assert.match(notificationSheet, /onClick=\{onMarkAllRead\}/);
  assert.match(notificationSheet, /onClose\(\); onOpenAlerts\(\);/);
});

test('/alerts (AlertModal) keeps its own independent notifications + mark-all-read UI — the sheet complements it, it does not replace it', () => {
  assert.match(alertModal, /const markAllNotificationsRead = async \(\) => \{/);
  assert.match(alertModal, /id="alert-results-title"/);
  assert.match(alertModal, /fetch\('\/api\/notifications'/);
});

test('tapping Alerts while already on the full /alerts page does not pop the sheet on top of it', () => {
  assert.match(globalNav, /if \(activeTab === 'alerts'\) return; \/\/ already viewing the full alerts page/);
});
