export async function initializeNativeApp() {
  if (typeof window === 'undefined') return false;

  const { Capacitor } = await import('@capacitor/core');
  if (!Capacitor.isNativePlatform()) return false;

  const [{ StatusBar, Style }, { SplashScreen }] = await Promise.all([
    import('@capacitor/status-bar'),
    import('@capacitor/splash-screen'),
  ]);

  await Promise.allSettled([
    StatusBar.setStyle({ style: Style.Dark }),
    SplashScreen.hide(),
  ]);

  document.documentElement.dataset.nativeApp = Capacitor.getPlatform();
  return true;
}

export async function getDevicePosition(options = {}) {
  const { Capacitor } = await import('@capacitor/core');

  if (Capacitor.isNativePlatform()) {
    const { Geolocation } = await import('@capacitor/geolocation');
    const permission = await Geolocation.checkPermissions();
    if (permission.location !== 'granted') await Geolocation.requestPermissions({ permissions: ['location'] });
    return Geolocation.getCurrentPosition({
      enableHighAccuracy: false,
      timeout: options.timeout || 8000,
      maximumAge: options.maximumAge || 60000,
    });
  }

  if (!navigator.geolocation) throw new Error('Geolocation is not supported.');
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: options.timeout || 8000,
      maximumAge: options.maximumAge || 60000,
    });
  });
}

export async function registerNativePushToken(accessToken) {
  if (typeof window === 'undefined' || !accessToken) return false;
  const { Capacitor } = await import('@capacitor/core');
  if (!Capacitor.isNativePlatform()) return false;

  const { PushNotifications } = await import('@capacitor/push-notifications');
  let permission = await PushNotifications.checkPermissions();
  if (permission.receive === 'prompt' || permission.receive === 'prompt-with-rationale') {
    permission = await PushNotifications.requestPermissions();
  }
  if (permission.receive !== 'granted') return false;

  return new Promise(async (resolve) => {
    let settled = false;
    const finish = async (value) => {
      if (settled) return;
      settled = true;
      await Promise.allSettled([registrationListener.remove(), errorListener.remove()]);
      resolve(value);
    };

    const registrationListener = await PushNotifications.addListener('registration', async ({ value }) => {
      try {
        const response = await fetch('/api/native-push-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ platform: Capacitor.getPlatform(), token: value }),
        });
        await finish(response.ok);
      } catch {
        await finish(false);
      }
    });
    const errorListener = await PushNotifications.addListener('registrationError', () => finish(false));
    window.setTimeout(() => finish(false), 12000);
    try {
      await PushNotifications.register();
    } catch {
      await finish(false);
    }
  });
}
