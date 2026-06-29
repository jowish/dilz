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
    }, 1050);
    return () => window.clearTimeout(minDelay);
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey={THEME_STORAGE_KEY}>
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
        <span className="dilz-splash-screen__brand">dILz</span>
        <span className="dilz-splash-screen__tagline">On trouve. Vous économisez.</span>
      </div>
    </div>
  );
}
