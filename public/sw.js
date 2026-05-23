// Service Worker — notifications push + cache assets statiques uniquement.
// Ne jamais cacher le HTML : un app-shell obsolète peut référencer des chunks JS supprimés
// et provoquer l'écran blanc/spinner infini après déploiement.
const STATIC_CACHE = 'static-v3';
const DB_NAME = 'NotificationsDB';
const DB_VERSION = 1;
const STORE_NAME = 'notifications';

function openNotificationDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== 'notifications-v1')
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Stratégies de cache
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Cache-first immutable pour assets hashés JS/CSS/images/fonts uniquement
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const res = await fetch(req);
          if (res.ok && res.type === 'basic') cache.put(req, res.clone());
          return res;
        } catch (e) {
          return cached || Response.error();
        }
      })
    );
    return;
  }

  // Network-only pour HTML/navigation afin d'éviter les index.html périmés après publication.
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req, { cache: 'no-store' }).catch(() =>
        new Response('Bot.BJ est momentanément indisponible. Vérifiez votre connexion puis rechargez la page.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        })
      )
    );
  }
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();

  event.waitUntil(
    openNotificationDB()
      .then((db) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).add({ ...data, receivedAt: Date.now() });
        return tx.complete;
      })
      .catch(() => null)
      .then(() =>
        self.registration.showNotification(data.title, {
          body: data.content,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          vibrate: [200, 100, 200],
          tag: data.id,
          requireInteraction: false,
          data: { url: data.action_url || '/', notificationId: data.id },
        })
      )
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
