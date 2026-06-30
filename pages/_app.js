import { useEffect, useState } from 'react';
import { ThemeProvider } from 'next-themes'
import '../styles/globals.css'
import { initializeNativeApp } from '../lib/nativeApp';
import { AppMessages } from '../components/ui/AppMessages';
import { THEME_STORAGE_KEY } from '../lib/themePreference';

export default function App({ Component, pageProps }) {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    initializeNativeApp().catch(() => {});
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  useEffect(() => {
    const minDelay = window.setTimeout(() => {
      window.requestAnimationFrame(() => setShowSplash(false));
    }, 1800);
    return () => window.clearTimeout(minDelay);
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey={THEME_STORAGE_KEY}>
      {showSplash && <DilzSplashScreen />}
      <AppMessages />
      <Component {...pageProps} />
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
