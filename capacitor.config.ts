import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'bj.bot.waouhapp',
  appName: 'WaouhApp',
  webDir: 'dist',
  // Hot-reload from Lovable sandbox during dev.
  // Remove "url" before producing a release APK for Play Store.
  server: {
    url: 'https://e22c52ab-372c-49c8-ab35-fb1b4b55f0b1.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#075E54',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#075E54',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
