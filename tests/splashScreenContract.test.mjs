import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const [app, css] = await Promise.all([
  readFile(path.join(process.cwd(), 'pages', '_app.js'), 'utf8'),
  readFile(path.join(process.cwd(), 'styles', 'globals.css'), 'utf8'),
]);

test('global app renders a branded startup splash before the page content', () => {
  assert.match(app, /const \[showSplash, setShowSplash\] = useState\(true\)/);
  assert.match(app, /\{showSplash && <DilzSplashScreen \/>}/);
  assert.match(app, /function DilzSplashScreen/);
  assert.match(app, /className="dilz-splash-screen__logo"/);
  assert.match(app, /src="\/icon-512\.png"/);
  assert.match(app, /alt="dILz"/);
  assert.match(app, /The best deals community is Israel/);
  assert.match(app, /setShowSplash\(false\)/);
});

test('startup splash covers the viewport and supports dark and reduced-motion modes', () => {
  assert.match(css, /\.dilz-splash-screen\s*\{[^}]*position:\s*fixed[^}]*inset:\s*0[^}]*z-index:\s*10000/s);
  assert.match(css, /\.dilz-splash-screen__logo\s*\{[^}]*object-fit:\s*cover/s);
  assert.match(css, /\.dilz-splash-screen__tagline\s*\{[^}]*text-align:\s*center/s);
  assert.match(css, /\.dark \.dilz-splash-screen\s*\{/);
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)/);
});
