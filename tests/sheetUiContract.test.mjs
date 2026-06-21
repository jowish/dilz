import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const modal = await readFile(path.join(process.cwd(), 'components', 'ui', 'Modal.js'), 'utf8');
const menu = await readFile(path.join(process.cwd(), 'components', 'ui', 'MainMenuSheet.js'), 'utf8');
const alerts = await readFile(path.join(process.cwd(), 'components', 'ui', 'AlertModal.js'), 'utf8');
const css = await readFile(path.join(process.cwd(), 'styles', 'globals.css'), 'utf8');

test('deal modal keeps its header available while only its body scrolls', () => {
  assert.match(modal, /dilz-modal__header[\s\S]*?dilz-modal__body/);
  assert.match(css, /\.dilz-modal__panel\s*\{[^}]*display:\s*flex[^}]*overflow:\s*hidden/s);
  assert.match(css, /\.dilz-modal__body\s*\{[^}]*overflow-y:\s*auto/s);
});

test('Menu and Alerts handles support downward swipe dismissal', () => {
  for (const source of [menu, alerts]) {
    assert.match(source, /useSheetGesture\(onClose\)/);
    assert.match(source, /\{\.\.\.handleProps\}/);
    assert.match(source, /ref=\{panelRef\}/);
  }
  assert.match(css, /\.dilz-sheet__handle\s*\{[^}]*touch-action:\s*none/s);
  assert.match(css, /\.dilz-main-menu__handle\{[^}]*touch-action:none/s);
});

test('expanded Saved items remains bounded and independently scrollable', () => {
  assert.match(css, /\.dilz-saved-items-content\s*\{[^}]*max-height:[^}]*overflow-y:\s*auto/s);
});
