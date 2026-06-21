import { useEffect } from 'react';
import { ThemeProvider } from 'next-themes'
import '../styles/globals.css'
import { initializeNativeApp } from '../lib/nativeApp';
import { AppMessages } from '../components/ui/AppMessages';
import { THEME_STORAGE_KEY } from '../lib/themePreference';

export default function App({ Component, pageProps }) {
  useEffect(() => {
    initializeNativeApp().catch(() => {});
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey={THEME_STORAGE_KEY}>
      <AppMessages />
      <Component {...pageProps} />
    </ThemeProvider>
  )
}
