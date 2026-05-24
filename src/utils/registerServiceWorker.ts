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

  runWhenIdle(async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
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
