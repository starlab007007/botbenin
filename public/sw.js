// Service Worker neutralisé : se désinstalle et purge tous les caches au prochain chargement.
// Évite les boucles infinies de cache en production après un nouveau déploiement.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch (e) {}
    await self.clients.claim();
    const clients = await self.clients.matchAll({ type: 'window' });
    for (const client of clients) {
      try { client.navigate(client.url); } catch (e) {}
    }
    try {
      const reg = await self.registration;
      await reg.unregister();
    } catch (e) {}
  })());
});

// Pas-de-cache : laisser le réseau gérer toutes les requêtes.
self.addEventListener('fetch', () => {});
