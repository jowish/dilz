import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const read = (...parts) => readFile(path.join(process.cwd(), ...parts), 'utf8');

const [pkg, app, index, dealDetail, profile, privacy] = await Promise.all([
  read('package.json'),
  read('pages', '_app.js'),
  read('pages', 'index.js'),
  read('pages', 'deal', '[id].js'),
  read('pages', 'profil.js'),
  read('pages', 'privacy.js'),
]);

test('Vercel Analytics is installed and mounted exactly once, globally in _app.js', () => {
  assert.match(pkg, /"@vercel\/analytics":\s*"\^?[\d.]+"/);
  assert.match(app, /import \{ Analytics \} from '@vercel\/analytics\/next'/);
  const analyticsOccurrences = (app.match(/<Analytics\s*\/>/g) || []).length;
  assert.equal(analyticsOccurrences, 1);
});

test('Analytics is not duplicated on individual pages', () => {
  for (const [name, source] of [['pages/index.js', index], ['pages/deal/[id].js', dealDetail], ['pages/profil.js', profile]]) {
    assert.doesNotMatch(source, /@vercel\/analytics/, `${name} should not import analytics directly`);
  }
});

test('privacy policy discloses the cookie-free Vercel Analytics usage in both languages', () => {
  assert.match(privacy, /Vercel Analytics measures page views and site performance[\s\S]*cookie-free/);
  assert.match(privacy, /Vercel Analytics מודדת צפיות בעמודים/);
});
