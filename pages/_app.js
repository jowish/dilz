import { useEffect, useState } from 'react';
import { ThemeProvider } from 'next-themes'
import { Analytics } from '@vercel/analytics/next';
import '../styles/globals.css'
import '../styles/premium-refresh.css'
import { initializeNativeApp } from '../lib/nativeApp';
import { GlobalBottomNav } from '../components/layout/GlobalBottomNav';
import { THEME_STORAGE_KEY, THEME_CLASSES } from '../lib/themePreference';

export default function App({ Component, pageProps }) {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    initializeNativeApp().catch(() => {});
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  // The splash used to sit for a flat 1800ms whether or not the app was ready,
  // on top of Capacitor's own 1200ms native splash — about three seconds of
  // waiting on every cold start of the phone app, none of it doing any work.
  //
  // It now clears as soon as the first frame after hydration has painted, with
  // a 600ms floor so the brand moment is not a flicker, and the original 1800ms
  // as a ceiling in case that frame never arrives. A fast start feels fast; a
  // slow one is unchanged.
  useEffect(() => {
    const FLOOR_MS = 600;
    const CEILING_MS = 1800;
    const started = Date.now();
    let floorTimer;
    let ceilingTimer;

    const hide = () => {
      const waited = Date.now() - started;
      if (waited >= FLOOR_MS) {
        window.requestAnimationFrame(() => setShowSplash(false));
        return;
      }
      floorTimer = window.setTimeout(hide, FLOOR_MS - waited);
    };

    // Two frames: the first is hydration's own paint, the second is the one
    // the user actually sees content in.
    const raf = window.requestAnimationFrame(() => window.requestAnimationFrame(hide));
    ceilingTimer = window.setTimeout(() => setShowSplash(false), CEILING_MS);

    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(floorTimer);
      window.clearTimeout(ceilingTimer);
    };
  }, []);

  // `themes` has to be passed explicitly: next-themes only knows light/dark
  // by default, and without warm in that list it never puts the .warm class
  // on <html>. Light and dark keep the exact behaviour they had.
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem themes={THEME_CLASSES} storageKey={THEME_STORAGE_KEY}>
      {showSplash && <DilzSplashScreen />}
      {/* The admin announcement banner is no longer mounted: it sat above the
          header, scrolled underneath it, and left a permanently smeared strip
          across the top of every screen. AppMessages.js and /api/app-messages
          are kept intact so the surface can be brought back deliberately. */}
      <Component {...pageProps} />
      <GlobalBottomNav />
      <Analytics />
    </ThemeProvider>
  )
}

function DilzSplashScreen() {
  return (
    <div className="dilz-splash-screen" role="status" aria-label="Dilz is loading">
      <div className="dilz-splash-screen__card">
        <img
          className="dilz-splash-screen__logo"
          src="/icon-512.png"
          alt="dILz"
          width="112"
          height="112"
        />
        <span className="dilz-splash-screen__tagline">The best deals community is Israel</span>
      </div>
    </div>
  );
}
