// Service Worker neutralisé : se désinstalle et purge tous les caches au prochain chargement.
// Évite les boucles infinies de cache en production après un nouveau déploiement.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await self.clients.claim();
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch (e) {}
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    await Promise.all(clients.map((client) => {
      try {
        const url = new URL(client.url);
        url.searchParams.set('sw-cleanup', Date.now().toString());
        return client.navigate(url.toString());
      } catch (e) {
        return undefined;
      }
    }));
    try {
      const reg = await self.registration;
      await reg.unregister();
    } catch (e) {}
  })());
});

// Pas-de-cache : laisser le réseau gérer toutes les requêtes.
self.addEventListener('fetch', () => {});
