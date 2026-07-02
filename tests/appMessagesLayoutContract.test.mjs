import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const css = await readFile(path.join(process.cwd(), 'styles', 'globals.css'), 'utf8');
const appMessages = await readFile(path.join(process.cwd(), 'components', 'ui', 'AppMessages.js'), 'utf8');

test('active banners stay compact so deal page actions remain reachable', () => {
  assert.match(appMessages, /className=\{?'?["`]?dilz-app-messages/);
  assert.match(css, /\.dilz-app-messages\s*\{[^}]*position:\s*sticky[^}]*top:\s*0/s);
  assert.match(css, /\.dilz-app-message\s*\{[^}]*min-height:\s*42px[^}]*padding:\s*7px/s);
  assert.match(css, /\.dilz-app-message__content span\s*\{[^}]*text-overflow:\s*ellipsis[^}]*white-space:\s*nowrap/s);
  assert.match(css, /@media \(max-width: 767px\)\s*\{[\s\S]*?\.dilz-app-messages\s*\{[^}]*max-height:\s*46px[^}]*overflow:\s*hidden/s);
  assert.match(css, /@media \(max-width: 767px\)\s*\{[\s\S]*?\.dilz-app-message__actions\s*\{[^}]*flex-shrink:\s*0/s);
});
