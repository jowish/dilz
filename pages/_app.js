import { useEffect } from 'react';
import { ThemeProvider } from 'next-themes'
import '../styles/globals.css'
import { initializeNativeApp } from '../lib/nativeApp';
import { AppMessages } from '../components/ui/AppMessages';

export default function App({ Component, pageProps }) {
  useEffect(() => {
    initializeNativeApp().catch(() => {});
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <AppMessages />
      <Component {...pageProps} />
    </ThemeProvider>
  )
}
