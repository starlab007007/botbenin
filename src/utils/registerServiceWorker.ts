// Service Worker désactivé : la stratégie de cache provoquait des boucles infinies
// en production lorsque d'anciens assets hashés restaient en cache après un nouveau déploiement.
// Cette fonction désinscrit tout SW existant et purge tous les caches.

export const registerServiceWorker = () => {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  // Désinscription + purge silencieuse, exécutée après le rendu initial
  setTimeout(async () => {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch (e) {
      // silencieux
    }
  }, 1500);
};

export const unregisterServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  }
};
