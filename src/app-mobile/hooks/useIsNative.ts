import { Capacitor } from '@capacitor/core';

/**
 * Returns true when the app runs inside the Capacitor native shell (Android/iOS).
 * Safe to call from any React component — does not throw on web.
 */
export const useIsNative = () => {
  return Capacitor.isNativePlatform();
};

export const getPlatform = (): 'android' | 'ios' | 'web' => {
  const p = Capacitor.getPlatform();
  if (p === 'android' || p === 'ios') return p;
  return 'web';
};
