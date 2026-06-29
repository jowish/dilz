import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const [shareMenu, safetyActions] = await Promise.all([
  readFile(path.join(process.cwd(), 'components', 'ui', 'ShareMenu.js'), 'utf8'),
  readFile(path.join(process.cwd(), 'components', 'ui', 'SafetyActions.js'), 'utf8'),
]);

test('deal popovers close on any external navigation or scroll action', () => {
  for (const source of [shareMenu, safetyActions]) {
    assert.match(source, /window\.addEventListener\('scroll'/);
    assert.match(source, /window\.addEventListener\('wheel'/);
    assert.match(source, /window\.addEventListener\('touchmove'/);
    assert.match(source, /window\.addEventListener\('keydown'/);
    assert.match(source, /window\.removeEventListener\('scroll'/);
    assert.match(source, /window\.removeEventListener\('wheel'/);
    assert.match(source, /window\.removeEventListener\('touchmove'/);
  }
  assert.match(shareMenu, /if \(!open\) return null/);
  assert.match(safetyActions, /if \(!open \|\| reporting\) return undefined/);
});
