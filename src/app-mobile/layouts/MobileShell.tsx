import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { BottomTabBar } from './BottomTabBar';
import { useGlobalChatSync } from '../hooks/useGlobalChatSync';
import { useIsNative } from '../hooks/useIsNative';
import { OfflineBanner } from '@/components/OfflineBanner';
import { WebErpShell } from '../../erp/WebErpShell';
import '../theme/mobile-theme.css';

const ERP_DESKTOP_BREAKPOINT = 1180;

export const MobileShell = () => {
  const { pathname } = useLocation();
  const { totalUnread } = useGlobalChatSync();
  const isNative = useIsNative();
  const [desktopWeb, setDesktopWeb] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth >= ERP_DESKTOP_BREAKPOINT
  );

  // The ERP shell is a web-only presentation layer. Capacitor keeps the
  // validated native/mobile UI and all routes continue to use the same engine.
  useEffect(() => {
    if (isNative) return;
    const media = window.matchMedia(`(min-width: ${ERP_DESKTOP_BREAKPOINT}px)`);
    const sync = () => setDesktopWeb(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [isNative]);

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

  if (!isNative && desktopWeb) {
    return (
      <WebErpShell unreadChat={totalUnread}>
        <Outlet />
      </WebErpShell>
    );
  }

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
