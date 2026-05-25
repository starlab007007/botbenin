import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { BottomTabBar } from './BottomTabBar';
import '../theme/mobile-theme.css';

/**
 * Mobile shell — renders the 5-tab WhatsApp-like layout for WaouhApp.
 * Used both inside the Capacitor native build AND when visiting /app/* on the web.
 */
export const MobileShell = () => {
  useEffect(() => {
    // Bootstrap native plugins only when running natively.
    (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;

        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#075E54' });

        const { SplashScreen } = await import('@capacitor/splash-screen');
        await SplashScreen.hide();
      } catch (e) {
        // Plugins not available on web — safe to ignore.
        console.debug('[MobileShell] native bootstrap skipped:', e);
      }
    })();
  }, []);

  return (
    <div className="mobile-shell flex flex-col min-h-[100dvh]">
      <main className="flex-1 pb-[64px]">
        <Outlet />
      </main>
      <BottomTabBar />
    </div>
  );
};

export default MobileShell;
