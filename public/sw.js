// Service Worker — notifications push only. Les assets restent gérés par Vite/Nginx
// pour éviter de servir un ancien bundle après redéploiement.
const STATIC_CACHE = 'static-v3-disabled';
const HTML_CACHE = 'html-v3-disabled';
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
          .filter((k) => k !== 'notifications-v1')
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

  // Network-first pour HTML/navigation
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          const cache = await caches.open(HTML_CACHE);
          cache.put(req, res.clone());
          return res;
        } catch (e) {
          const cached = await caches.match(req);
          return cached || caches.match('/') || Response.error();
        }
      })()
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
