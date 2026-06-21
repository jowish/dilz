import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const index = await readFile(path.join(process.cwd(), 'pages', 'index.js'), 'utf8');
const profile = await readFile(path.join(process.cwd(), 'pages', 'profil.js'), 'utf8');
const shareMenu = await readFile(path.join(process.cwd(), 'components', 'ui', 'ShareMenu.js'), 'utf8');

test('profile shortcuts separate owned deals from account settings', () => {
  assert.match(index, /href: '\/profil\?view=deals'/);
  assert.match(index, /href: '\/profil\?view=settings'/);
  assert.doesNotMatch(index.slice(index.indexOf('function ProfileTab'), index.indexOf('export default function Home')), /Deals map|My deal alerts/);
});

test('My deals query is restricted to the authenticated author', () => {
  assert.match(profile, /\.from\('bons_plans'\)[\s\S]*?\.eq\('auteur_id', userId\)/);
});

test('share menu offers all requested actions including SMS and copy', () => {
  for (const action of ['links.whatsapp', 'links.telegram', 'links.sms', 'onCopy?.()']) {
    assert.ok(shareMenu.includes(action), `missing share action: ${action}`);
  }
});

test('Saved items renders the complete fetched collection in a scrollable section', () => {
  assert.match(index, /savedItems\.map\(item =>/);
  assert.doesNotMatch(index, /savedItems\.slice\(0,\s*8\)/);
});
