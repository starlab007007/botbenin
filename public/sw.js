// Service Worker neutralisé — se désinscrit + purge les caches.
// Raison : une ancienne version mettait en cache index.html et bloquait
// l'app sur "Chargement de Bot.BJ..." après chaque déploiement.
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.registration.unregister();
      const clientsList = await self.clients.matchAll({ type: 'window' });
      clientsList.forEach((client) => client.navigate(client.url));
    } catch (e) {
      // no-op
    }
  })());
});

// Pas d'interception fetch : le navigateur charge directement le réseau.
