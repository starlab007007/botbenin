(() => {
  'use strict';

  const CANONICAL_PATH = '/apresbacia';
  const FUNCTION_FRAGMENT = '/functions/v1/waouh-apresbac-chat';
  const REQUEST_WINDOW_MS = 60_000;
  const MAX_REQUESTS_PER_WINDOW = 12;
  const requestTimes = [];
  const originalFetch = window.fetch.bind(window);

  function canonicalizeVisibleUrl() {
    if (window.location.pathname !== CANONICAL_PATH || window.location.search || window.location.hash) {
      window.history.replaceState(
        window.history.state,
        document.title,
        `${window.location.origin}${CANONICAL_PATH}`,
      );
    }
  }

  function pruneRequestWindow(now) {
    while (requestTimes.length && now - requestTimes[0] >= REQUEST_WINDOW_MS) {
      requestTimes.shift();
    }
  }

  function isChatRequest(input, init) {
    const url = typeof input === 'string' ? input : String(input?.url || '');
    if (!url.includes(FUNCTION_FRAGMENT)) return false;

    try {
      const body = typeof init?.body === 'string'
        ? JSON.parse(init.body)
        : init?.body;
      return body?.action === 'chat';
    } catch (_) {
      return false;
    }
  }

  function rateLimitedResponse() {
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'client_rate_limited',
        message: 'Vous avez envoyé plusieurs demandes très rapidement. Patientez quelques secondes puis réessayez.',
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Retry-After': '10',
        },
      },
    );
  }

  // Protection contre les clics répétés et les boucles accidentelles sur un
  // même appareil. La limitation de sécurité principale doit aussi rester
  // active dans la fonction Edge côté serveur.
  window.fetch = async (input, init = {}) => {
    if (!isChatRequest(input, init)) {
      return originalFetch(input, init);
    }

    const now = Date.now();
    pruneRequestWindow(now);

    if (requestTimes.length >= MAX_REQUESTS_PER_WINDOW) {
      return rateLimitedResponse();
    }

    requestTimes.push(now);
    return originalFetch(input, init);
  };

  function start() {
    canonicalizeVisibleUrl();

    window.addEventListener('pageshow', canonicalizeVisibleUrl, {
      passive: true,
    });

    window.__APRESBAC_PRODUCTION__ = Object.freeze({
      canonicalUrl: `${window.location.origin}${CANONICAL_PATH}`,
      release: '2.17.0',
      public: true,
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
