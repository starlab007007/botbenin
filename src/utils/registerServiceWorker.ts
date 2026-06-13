// Enregistrement différé du service worker pour éviter de bloquer le rendu initial
const runWhenIdle = (cb: () => void) => {
  if (typeof window === 'undefined') return;
  const ric = (window as any).requestIdleCallback as
    | ((cb: () => void, opts?: { timeout: number }) => number)
    | undefined;
  if (ric) ric(cb, { timeout: 3000 });
  else setTimeout(cb, 1500);
};

// Auto-reload quand un chunk lazy n'existe plus (après redéploiement)
const installChunkErrorReload = () => {
  if (typeof window === 'undefined') return;
  const RELOAD_KEY = '__chunk_reload_at';
  const shouldReload = (msg: string) =>
    /Importing a module script failed|Failed to fetch dynamically imported module|Unable to preload CSS|ChunkLoadError|Loading chunk \d+ failed/i.test(msg);
  const tryReload = () => {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < 10_000) return; // évite la boucle
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    // Purge tous les caches SW puis recharge
    if ('caches' in window) {
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).finally(() => location.reload());
    } else {
      location.reload();
    }
  };
  window.addEventListener('error', (e) => {
    if (e?.message && shouldReload(e.message)) tryReload();
  });
  window.addEventListener('unhandledrejection', (e: any) => {
    const msg = e?.reason?.message || String(e?.reason || '');
    if (shouldReload(msg)) tryReload();
  });
};

installChunkErrorReload();



const shouldSkipRegistration = () => {
  if (typeof window === 'undefined') return true;
  try {
    if (window.self !== window.top) return true; // inside iframe (Lovable preview)
  } catch { return true; }
  const host = window.location.hostname;
  if (host.startsWith('id-preview--') || host.startsWith('preview--')) return true;
  if (host === 'lovableproject.com' || host.endsWith('.lovableproject.com')) return true;
  if (host === 'lovableproject-dev.com' || host.endsWith('.lovableproject-dev.com')) return true;
  if (host === 'beta.lovable.dev' || host.endsWith('.beta.lovable.dev')) return true;
  if (new URLSearchParams(window.location.search).get('sw') === 'off') return true;
  return false;
};

export const registerServiceWorker = () => {
  if (!('serviceWorker' in navigator)) return;

  if (shouldSkipRegistration()) {
    // Make sure no stale SW is active in preview/iframe contexts.
    navigator.serviceWorker.getRegistrations?.().then((regs) => {
      regs.forEach((r) => r.unregister().catch(() => null));
    }).catch(() => null);
    return;
  }

  runWhenIdle(async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      });
      await registration.update();
      console.log('Service Worker enregistré:', registration.scope);
    } catch (error) {
      console.error('Erreur SW:', error);
    }
  });
};

export const unregisterServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.unregister();
    }
  }
};
