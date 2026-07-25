import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.maravae.thriveher',
  appName: 'ThriveHer',
  webDir: 'dist/client',
  server: { cleartext: true },
  ios: { contentInset: 'automatic', preferredContentMode: 'mobile' },
  android: { allowMixedContent: true }
};

export default config;
