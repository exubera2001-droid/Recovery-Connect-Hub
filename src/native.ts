let CapacitorPlugins: any = null;
async function getPlugins() {
  if (CapacitorPlugins) return CapacitorPlugins;
  try {
    const { Capacitor } = await import('@capacitor/core');
    const PushNotifications = (await import('@capacitor/push-notifications')).PushNotifications;
    const Haptics = (await import('@capacitor/haptics')).Haptics;
    const Share = (await import('@capacitor/share')).Share;
    const SplashScreen = (await import('@capacitor/splash-screen')).SplashScreen;
    const StatusBar = (await import('@capacitor/status-bar')).StatusBar;
    CapacitorPlugins = { Capacitor, PushNotifications, Haptics, Share, SplashScreen, StatusBar };
    return CapacitorPlugins;
  } catch { return null; }
}

function isNative() {
  return typeof window !== 'undefined' && !!(window as any).Capacitor;
}

export async function hapticLight() {
  if (!isNative()) return;
  const p = await getPlugins(); if (!p) return;
  try { await p.Haptics.impact({ style: 'light' }); } catch {}
}

export async function hapticSuccess() {
  if (!isNative()) return;
  const p = await getPlugins(); if (!p) return;
  try { await p.Haptics.notification({ type: 'success' }); } catch {}
}

export async function hideSplashScreen() {
  if (!isNative()) return;
  const p = await getPlugins(); if (!p) return;
  try { await p.SplashScreen.hide(); } catch {}
}

export async function setStatusBarStyle() {
  if (!isNative()) return;
  const p = await getPlugins(); if (!p) return;
  try {
    await p.StatusBar.setStyle({ style: 'dark' });
    await p.StatusBar.setBackgroundColor({ color: '#F3EDE2' });
  } catch {}
}

export async function shareText(text: string, title?: string) {
  if (!isNative()) return;
  const p = await getPlugins(); if (!p) return;
  try { await p.Share.share({ text, title, dialogTitle: title }); } catch {}
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (!isNative()) return null;
  const p = await getPlugins(); if (!p) return null;
  try {
    let token: string | null = null;
    p.PushNotifications.addListener('registration', (t: any) => { token = t.value; });
    await p.PushNotifications.requestPermissions();
    await p.PushNotifications.register();
    return token;
  } catch { return null; }
}
