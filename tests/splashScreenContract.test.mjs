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
  // The splash used to hide on a flat `setTimeout(..., 1800)` that ran whether
  // or not the app was ready, stacked on Capacitor's own 1200ms native splash.
  // It is now adaptive: it hides on the second animation frame after hydration,
  // with a 600ms floor so the brand moment is not a flicker and the original
  // 1800ms kept as a ceiling for when that frame never arrives. Both bounds are
  // pinned here so neither can silently drift back into a fixed wait.
  assert.match(app, /const FLOOR_MS = 600/);
  assert.match(app, /const CEILING_MS = 1800/);
  assert.match(app, /ceilingTimer = window\.setTimeout\(\(\) => setShowSplash\(false\), CEILING_MS\)/);
  assert.match(app, /window\.requestAnimationFrame\(\(\) => window\.requestAnimationFrame\(hide\)\)/);
  assert.match(app, /setShowSplash\(false\)/);
  assert.doesNotMatch(app, /}, 1800\)/);
});

test('startup splash covers the viewport and supports dark and reduced-motion modes', () => {
  assert.match(css, /\.dilz-splash-screen\s*\{[^}]*position:\s*fixed[^}]*inset:\s*0[^}]*z-index:\s*10000/s);
  assert.match(css, /\.dilz-splash-screen__logo\s*\{[^}]*object-fit:\s*cover/s);
  assert.match(css, /\.dilz-splash-screen__tagline\s*\{[^}]*text-align:\s*center/s);
  // Fade delay follows the 600ms floor above, not the old 1800ms fixed wait.
  assert.match(css, /animation:\s*dilzSplashFade 260ms ease-out 400ms forwards/);
  assert.match(css, /\.dark \.dilz-splash-screen\s*\{/);
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)/);
});
