import type { CapacitorConfig } from '@capacitor/cli';

const isDev = process.env.NODE_ENV === 'development' || process.env.LOVABLE_DEV === 'true';

const config: CapacitorConfig = {
  appId: 'bj.bot.waouhapp',
  appName: 'WaouhApp',
  webDir: 'dist',
  // DEV ONLY: hot-reload from Lovable sandbox.
  // COMMENT OUT server.url for native APK builds.
  ...(isDev && {
    server: {
      url: 'https://e22c52ab-372c-49c8-ab35-fb1b4b55f0b1.lovableproject.com?forceHideBadge=true',
      cleartext: true,
    },
  }),
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
