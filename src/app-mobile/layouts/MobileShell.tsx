import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { BottomTabBar } from './BottomTabBar';
import { useGlobalChatSync } from '../hooks/useGlobalChatSync';
import { OfflineBanner } from '@/components/OfflineBanner';
import '../theme/mobile-theme.css';

export const MobileShell = () => {
  const { pathname } = useLocation();
  const { totalUnread } = useGlobalChatSync();

  // Bottom tab bar visible on Partner screens (parity with other modules).
  // Only hide on deep chat threads and bot editors.
  const fullscreen =
    /^\/app\/chat\/.+/.test(pathname) ||
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
      <OfflineBanner />
      <main className={fullscreen ? 'flex-1' : 'flex-1 pb-[64px]'}>
        <Outlet />
      </main>
      {!fullscreen && <BottomTabBar unreadChat={totalUnread} />}
    </div>
  );
};

export default MobileShell;
