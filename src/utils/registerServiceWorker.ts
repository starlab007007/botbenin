// Enregistrement différé du service worker pour éviter de bloquer le rendu initial
const runWhenIdle = (cb: () => void) => {
  if (typeof window === 'undefined') return;
  const ric = (window as any).requestIdleCallback as
    | ((cb: () => void, opts?: { timeout: number }) => number)
    | undefined;
  if (ric) ric(cb, { timeout: 3000 });
  else setTimeout(cb, 1500);
};

export const registerServiceWorker = () => {
  if (!('serviceWorker' in navigator)) return;

  // ⚠️ Désactivé temporairement : un ancien SW servait un index.html mis en
  // cache qui pointait vers des chunks obsolètes, ce qui bloquait l'app sur
  // l'écran "Chargement de Bot.BJ...". On désinscrit toute version existante.
  runWhenIdle(async () => {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
      if ((window as any).caches?.keys) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k).catch(() => false)));
      }
    } catch (error) {
      console.error('Nettoyage SW:', error);
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
