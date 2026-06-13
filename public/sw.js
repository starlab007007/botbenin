// Service Worker — Offline-first style WhatsApp + notifications push
// - Précache du shell pour fonctionner hors-ligne
// - NetworkFirst pour la navigation HTML (jamais d'ancien bundle après deploy)
// - CacheFirst pour les assets hashés /assets/*
// - StaleWhileRevalidate pour images/fonts
// - NetworkOnly pour Supabase / API / méthodes non-GET

const VERSION = 'v4';
const SHELL_CACHE = `botbj-shell-${VERSION}`;
const ASSETS_CACHE = `botbj-assets-${VERSION}`;
const RUNTIME_CACHE = `botbj-runtime-${VERSION}`;
const HTML_CACHE = `botbj-html-${VERSION}`;
const ALL_CACHES = [SHELL_CACHE, ASSETS_CACHE, RUNTIME_CACHE, HTML_CACHE, 'notifications-v1'];

const SHELL_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
];

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
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS).catch((e) => console.warn('[SW] precache partial', e)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !ALL_CACHES.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const isSameOrigin = (url) => url.origin === self.location.origin;
const isHashedAsset = (url) => /\/assets\/.+\.[a-f0-9]{6,}\.(?:js|css|woff2?|ttf)$/.test(url.pathname);
const isImage = (req) => req.destination === 'image' || /\.(?:png|jpg|jpeg|gif|webp|svg|ico)$/i.test(new URL(req.url).pathname);
const isFont = (req) => req.destination === 'font';
const isApiOrSupabase = (url) =>
  url.hostname.endsWith('.supabase.co') ||
  url.pathname.startsWith('/rest/') ||
  url.pathname.startsWith('/auth/') ||
  url.pathname.startsWith('/functions/') ||
  url.pathname.startsWith('/realtime/');

async function networkFirstHTML(request) {
  try {
    const res = await fetch(request);
    if (res && res.ok) {
      const copy = res.clone();
      caches.open(HTML_CACHE).then((c) => c.put(request, copy)).catch(() => null);
    }
    return res;
  } catch (e) {
    const cached = await caches.match(request);
    if (cached) return cached;
    const shellCached = await caches.match('/');
    if (shellCached) return shellCached;
    const offline = await caches.match('/offline.html');
    if (offline) return offline;
    return new Response('Hors ligne', { status: 503, statusText: 'Offline' });
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res && res.ok) {
      const copy = res.clone();
      caches.open(cacheName).then((c) => c.put(request, copy)).catch(() => null);
    }
    return res;
  } catch (e) {
    return cached || Response.error();
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cached = await caches.match(request);
  const fetchPromise = fetch(request)
    .then((res) => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(cacheName).then((c) => c.put(request, copy)).catch(() => null);
      }
      return res;
    })
    .catch(() => null);
  return cached || (await fetchPromise) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return; // never cache writes
  const url = new URL(request.url);

  // Skip cross-origin third-party requests (let browser handle)
  if (!isSameOrigin(url)) {
    // Cache cross-origin images opportunistically (logos, etc.)
    if (isImage(request) || isFont(request)) {
      event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    }
    return;
  }

  // Never cache Supabase/API
  if (isApiOrSupabase(url)) return;

  // OAuth callback — never cache
  if (url.pathname.startsWith('/~oauth')) return;

  // Navigation requests → NetworkFirst HTML
  if (request.mode === 'navigate' || (request.destination === 'document')) {
    event.respondWith(networkFirstHTML(request));
    return;
  }

  // Hashed JS/CSS/fonts → CacheFirst
  if (isHashedAsset(url)) {
    event.respondWith(cacheFirst(request, ASSETS_CACHE));
    return;
  }

  // Images / fonts → SWR
  if (isImage(request) || isFont(request)) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    return;
  }

  // Manifest, offline page, etc. → SWR
  if (/\.(?:json|webmanifest|html)$/.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
  }
});

// ---------- Push notifications ----------
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data;
  try { data = event.data.json(); } catch { data = { title: 'Notification', content: event.data.text() }; }

  event.waitUntil(
    openNotificationDB()
      .then((db) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).add({ ...data, receivedAt: Date.now() });
        return tx.complete;
      })
      .catch(() => null)
      .then(() =>
        self.registration.showNotification(data.title || 'Bot.BJ', {
          body: data.content,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
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
  event.waitUntil(clients.openWindow(event.notification.data?.url || '/'));
});

// Allow page to force activation of a waiting SW.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING' || event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
