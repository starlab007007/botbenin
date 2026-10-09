import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { BottomTabBar } from './BottomTabBar';
import { TabletRail, TABLET_RAIL_WIDTH } from './TabletRail';
import { WorkspaceMenuSheet } from './WorkspaceMenuSheet';
import { useViewportTier } from '../hooks/useViewportTier';
import { useGlobalChatSync } from '../hooks/useGlobalChatSync';
import { useIsNative } from '../hooks/useIsNative';
import { OfflineBanner } from '@/components/OfflineBanner';
import { startWaouhResync } from '@/lib/waouh/resync';
import { WebErpShell } from '../../erp/WebErpShell';
import '../theme/mobile-theme.css';


export const MobileShell = () => {
  const { pathname } = useLocation();
  const { totalUnread } = useGlobalChatSync();
  const isNative = useIsNative();
  // Paliers : phone < 640, tablet 640–1179, desktop ≥ 1180. Capacitor garde toujours l'UI mobile validée.
  const tierRaw = useViewportTier();
  const tier = isNative ? 'phone' : tierRaw;
  const [menuOpen, setMenuOpen] = useState(false);

  // Bottom tab bar visible on Partner screens (parity with other modules).
  // Only hide on deep chat threads and bot editors.
  const fullscreen =
    /^\/app\/chat\/.+/.test(pathname) ||
    /^\/app\/bots\/.+/.test(pathname);

  useEffect(() => startWaouhResync(), []);

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

  if (tier === 'desktop') {
    return (
      <WebErpShell unreadChat={totalUnread}>
        <Outlet />
      </WebErpShell>
    );
  }

  if (tier === 'tablet') {
    return (
      <div className="waouh-app mobile-shell flex min-h-[100dvh]" style={{ ['--shell-bottom' as string]: '0px', ['--shell-left' as string]: `${TABLET_RAIL_WIDTH}px` }}>
        <TabletRail unreadChat={totalUnread} onOpenMenu={() => setMenuOpen(true)} />
        <div className="flex min-w-0 flex-1 flex-col" style={{ marginLeft: TABLET_RAIL_WIDTH }}>
          <OfflineBanner />
          <main className="flex-1">
            <Outlet />
          </main>
        </div>
        <WorkspaceMenuSheet open={menuOpen} onOpenChange={setMenuOpen} side="left" unreadChat={totalUnread} />
      </div>
    );
  }

  return (
    <div className="waouh-app mobile-shell flex flex-col min-h-[100dvh]">
      <OfflineBanner />
      <main className={fullscreen ? 'flex-1' : 'flex-1 pb-[64px]'}>
        <Outlet />
      </main>
      {!fullscreen && <BottomTabBar unreadChat={totalUnread} onOpenMenu={() => setMenuOpen(true)} />}
      <WorkspaceMenuSheet open={menuOpen} onOpenChange={setMenuOpen} side="bottom" unreadChat={totalUnread} />
    </div>
  );
};

export default MobileShell;
