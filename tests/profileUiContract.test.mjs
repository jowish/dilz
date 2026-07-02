import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const index = await readFile(path.join(process.cwd(), 'pages', 'index.js'), 'utf8');
const profile = await readFile(path.join(process.cwd(), 'pages', 'profil.js'), 'utf8');
const shareMenu = await readFile(path.join(process.cwd(), 'components', 'ui', 'ShareMenu.js'), 'utf8');
const appHeader = await readFile(path.join(process.cwd(), 'components', 'layout', 'AppHeader.js'), 'utf8');
const css = await readFile(path.join(process.cwd(), 'styles', 'globals.css'), 'utf8');

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

test('profile hides global search and keeps sign out after profile content', () => {
  assert.match(index, /showSearch=\{tab !== 'profile'\}/);
  assert.match(appHeader, /showSearch = true/);
  assert.match(appHeader, /\{showSearch && \([\s\S]*dilz-app-header__search/);
  const profileTab = index.slice(index.indexOf('function ProfileTab'), index.indexOf('function ChevronIcon'));
  assert.ok(profileTab.lastIndexOf('dilz-profile-signout--bottom') > profileTab.lastIndexOf('dilz-saved-items-content'));
});

test('header removes useless initials while profile card shows the uploaded photo', () => {
  assert.doesNotMatch(appHeader, /dilz-avatar-mini/);
  assert.doesNotMatch(appHeader, /<Logo/);
  assert.doesNotMatch(appHeader, /dilz-app-header__left/);
  assert.doesNotMatch(appHeader, /dilz-desktop-tabs/);
  assert.doesNotMatch(appHeader, /dILz/);
  assert.doesNotMatch(appHeader, /slice\(0, 2\)\.toUpperCase\(\)/);
  assert.match(appHeader, /aria-label=\{user \? labels\.profile : labels\.signIn\}/);
  assert.match(index, /const avatarUrl = user\.user_metadata\?\.avatar_url \|\| user\.user_metadata\?\.picture \|\| ''/);
  assert.match(index, /className="dilz-profile-card__avatar"/);
  assert.match(index, /avatarUrl \? \(/);
  assert.match(index, /<img src=\{avatarUrl\} alt=\{displayName\} \/>/);
  assert.match(css, /\.dilz-profile-card__avatar img\s*\{[^}]*object-fit:\s*cover/s);
});
