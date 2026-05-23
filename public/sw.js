// Service Worker pour les notifications push avec IndexedDB
const NOTIFICATION_CACHE = 'notifications-v1';
const DB_NAME = 'NotificationsDB';
const DB_VERSION = 1;
const STORE_NAME = 'notifications';

// Helper pour ouvrir IndexedDB
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

self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    
    console.log('📧 Push notification reçue:', data);
    
    // Stocker dans IndexedDB pour consultation hors ligne
    event.waitUntil(
      openNotificationDB().then(db => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).add({
          ...data,
          receivedAt: Date.now()
        });
        return tx.complete;
      }).then(() => {
        // Afficher la notification
        return self.registration.showNotification(data.title, {
          body: data.content,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          vibrate: [200, 100, 200],
          tag: data.id,
          requireInteraction: false,
          data: {
            url: data.action_url || '/',
            notificationId: data.id
          }
        });
      }).catch(error => {
        console.error('❌ Erreur stockage notification:', error);
        // Afficher quand même la notification même si le stockage échoue
        return self.registration.showNotification(data.title, {
          body: data.content,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          vibrate: [200, 100, 200],
          tag: data.id,
          requireInteraction: false,
          data: {
            url: data.action_url || '/',
            notificationId: data.id
          }
        });
      })
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});

// Installation du service worker
self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(clients.claim());
});
