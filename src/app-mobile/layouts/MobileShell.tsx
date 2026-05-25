import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { BottomTabBar } from './BottomTabBar';
import '../theme/mobile-theme.css';

/**
 * Mobile shell — renders the 5-tab WhatsApp-like layout for WaouhApp.
 * On drill-in routes (chat detail, partner sub-pages) we hide the bottom
 * tab bar so the page is fullscreen, exactly like WhatsApp.
 */
export const MobileShell = () => {
  const { pathname } = useLocation();

  // Fullscreen routes — no bottom tab bar, no bottom padding.
  // /app/chat/:id or /app/chat/waouh, and any /app/partner/sub-route.
  const fullscreen =
    /^\/app\/chat\/.+/.test(pathname) ||
    /^\/app\/partner\/.+/.test(pathname) ||
    /^\/app\/bots\/.+/.test(pathname);

  useEffect(() => {
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
        console.debug('[MobileShell] native bootstrap skipped:', e);
      }
    })();
  }, []);

  return (
    <div className="mobile-shell flex flex-col min-h-[100dvh]">
      <main className={fullscreen ? 'flex-1' : 'flex-1 pb-[64px]'}>
        <Outlet />
      </main>
      {!fullscreen && <BottomTabBar />}
    </div>
  );
};

export default MobileShell;
