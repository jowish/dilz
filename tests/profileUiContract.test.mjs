import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const index = await readFile(path.join(process.cwd(), 'pages', 'index.js'), 'utf8');
const profile = await readFile(path.join(process.cwd(), 'pages', 'profil.js'), 'utf8');
const shareMenu = await readFile(path.join(process.cwd(), 'components', 'ui', 'ShareMenu.js'), 'utf8');
const appHeader = await readFile(path.join(process.cwd(), 'components', 'layout', 'AppHeader.js'), 'utf8');
const app = await readFile(path.join(process.cwd(), 'pages', '_app.js'), 'utf8');
const themePreference = await readFile(path.join(process.cwd(), 'lib', 'themePreference.js'), 'utf8');
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
  assert.ok(profileTab.lastIndexOf('dilz-profile-signout--bottom') > profileTab.lastIndexOf('dilz-profile-directory'));
  assert.match(profileTab, /title: 'Community'/);
  assert.match(profileTab, /label: 'Posting rules'/);
  assert.match(profileTab, /title: 'Legal'/);
  assert.match(profileTab, /Your data is secure\./);
  assert.match(css, /\.dilz-profile-directory\s*\{[^}]*display:\s*grid[^}]*gap:\s*18px/s);
  assert.match(css, /\.dilz-profile-tab \.dilz-profile-signout--bottom\s*\{[^}]*margin-top:\s*8px/s);
});

test('header keeps the app logo and removes the useless profile-person shortcut', () => {
  assert.doesNotMatch(appHeader, /dilz-avatar-mini/);
  assert.match(appHeader, /function Logo/);
  assert.match(appHeader, /dilz-app-header__left/);
  assert.match(appHeader, /dilz-desktop-tabs/);
  assert.match(appHeader, /dILz/);
  assert.doesNotMatch(appHeader, /slice\(0, 2\)\.toUpperCase\(\)/);
  assert.doesNotMatch(appHeader, /aria-label=\{user \? labels\.profile : labels\.signIn\}/);
  assert.doesNotMatch(appHeader, /onProfileClick/);
  assert.match(index, /const avatarUrl = user\.user_metadata\?\.avatar_url \|\| user\.user_metadata\?\.picture \|\| ''/);
  assert.match(index, /className="dilz-profile-card__avatar"/);
  assert.match(index, /avatarUrl \? \(/);
  assert.match(index, /<img src=\{avatarUrl\} alt=\{displayName\} \/>/);
  assert.match(css, /\.dilz-profile-card__avatar img\s*\{[^}]*object-fit:\s*cover/s);
});

test('profile settings keeps the back action on the top left even in RTL', () => {
  assert.match(profile, /className="dilz-app-header dilz-profil-header"/);
  assert.match(profile, /className="dilz-profil-heading" dir=\{dir\}/);
  assert.doesNotMatch(profile, /ThemeToggle/);
  assert.match(profile, /className="dilz-profil-header-actions" aria-hidden="true"/);
  assert.match(css, /\.dilz-profil-header \.dilz-app-header__inner\s*\{[^}]*direction:\s*ltr[^}]*display:\s*grid[^}]*grid-template-columns:\s*minmax\(72px,\s*1fr\) auto minmax\(72px,\s*1fr\)/s);
  assert.match(css, /\.dilz-profil-header \.dilz-profil-back\s*\{[^}]*justify-self:\s*start/s);
  assert.match(css, /\.dilz-profil-header \.dilz-profil-header-actions\s*\{[^}]*justify-self:\s*end/s);
});

test('profile tab links to the signed-in user\'s own public profile, bilingually, on both mobile and desktop', () => {
  const profileTab = index.slice(index.indexOf('function ProfileTab'), index.indexOf('function ChevronIcon'));
  assert.match(profileTab, /href: `\/user\/\$\{user\.id\}`/);
  assert.match(profileTab, /'View my public profile' : 'צפה בפרופיל הציבורי שלי'/);
  // ProfileTab is the same component/route reached by both the mobile
  // BottomNav profile tap and the desktop AppHeader profile icon (#35/#39) —
  // no separate desktop-only implementation is needed, and no CSS hides
  // .dilz-profile-tab or .dilz-profile-links at any viewport width.
  assert.doesNotMatch(css, /\.dilz-profile-tab\s*\{[^}]*display:\s*none/s);
  assert.doesNotMatch(css, /\.dilz-profile-links\s*\{[^}]*display:\s*none/s);
});

test('theme controls live only in account settings and support system mode', () => {
  assert.doesNotMatch(appHeader, /ThemeToggle/);
  assert.match(app, /defaultTheme="system" enableSystem/);
  assert.match(themePreference, /THEME_VALUES = Object\.freeze\(\['light', 'dark', 'system'\]\)/);
  assert.match(profile, /useTheme\(\)/);
  assert.match(profile, /THEME_VALUES\.map\(\(value\) =>/);
  assert.match(profile, /setTheme\(nextTheme\)/);
});
