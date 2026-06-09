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



export const registerServiceWorker = () => {
  if (!('serviceWorker' in navigator)) return;

  runWhenIdle(async () => {
    try {
      const registration = await navigator.serviceWorker.register(`/sw.js?v=${Date.now()}`, {
        scope: '/',
        updateViaCache: 'none',
      });
      await registration.update();
      console.log('Service Worker enregistré:', registration.scope);
      if ('Notification' in window && Notification.permission === 'default') {
        // Ne pas prompter d'office, juste préparer
      }
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
