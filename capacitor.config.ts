import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.dilz.mobile',
  appName: 'Dilz',
  webDir: 'native-shell',
  server: {
    url: 'https://dilz.vercel.app',
    cleartext: false,
    allowNavigation: ['dilz.vercel.app'],
  },
  ios: {
    // 'automatic' lets WKWebView add and continuously re-adjust its own
    // content insets while scrolling, which visibly shifts the top of the
    // page — the header appeared to move and sit too low. The web app has
    // handled the safe areas itself since the header started reserving
    // env(safe-area-inset-top), so the webview must not inset on top of that.
    contentInset: 'never',
    preferredContentMode: 'mobile',
    scheme: 'Dilz',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: '#FFFFFF',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#FFFFFF',
    },
  },
};

export default config;
