(() => {
  'use strict';

  const nativeFetch = window.fetch.bind(window);
  const APRESBAC_FUNCTION = '/functions/v1/waouh-apresbac-chat';
  const diagnostics = [];

  function isApresBacRequest(input) {
    const value = typeof input === 'string' ? input : input?.url || '';
    return value.includes(APRESBAC_FUNCTION);
  }

  function record(stage, detail = {}) {
    const entry = {
      stage,
      at: new Date().toISOString(),
      online: navigator.onLine,
      ...detail,
    };
    diagnostics.push(entry);
    if (diagnostics.length > 30) diagnostics.shift();
    console.info('[AprèsBac Web]', entry);
  }

  function cleanHeaders(source) {
    const headers = new Headers(source || {});

    // La fonction V2.14 ne déclarait pas x-request-id dans
    // Access-Control-Allow-Headers. Le navigateur bloquait donc le preflight.
    headers.delete('x-request-id');
    headers.delete('X-Request-Id');

    return headers;
  }

  function syntheticFailure(error) {
    const offline = navigator.onLine === false;
    const message = offline
      ? 'La connexion Internet est interrompue. Reconnectez le téléphone puis réessayez.'
      : 'Le service Web AprèsBac IA est momentanément inaccessible. Actualisez la page puis réessayez.';

    record('synthetic_failure', {
      name: error?.name || 'Error',
      message: String(error?.message || error || 'Network failure'),
    });

    return new Response(
      JSON.stringify({
        ok: false,
        error: 'APRESBAC_WEB_NETWORK_ERROR',
        message,
        retryable: true,
        web_diagnostic: offline ? 'OFFLINE' : 'NETWORK_OR_CORS',
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      },
    );
  }

  async function invokeWithFallback(input, init = {}) {
    const primaryHeaders = cleanHeaders(init.headers);
    const primaryInit = {
      ...init,
      headers: primaryHeaders,
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
    };

    try {
      record('primary_request', {
        authorization: primaryHeaders.has('authorization'),
        apikey: primaryHeaders.has('apikey'),
      });
      return await nativeFetch(input, primaryInit);
    } catch (primaryError) {
      record('primary_failed', {
        name: primaryError?.name || 'Error',
        message: String(primaryError?.message || primaryError),
      });

      // Deuxième tentative : requête CORS simple, sans en-tête personnalisé.
      // La fonction publique est déployée avec --no-verify-jwt et traite le JSON
      // via request.json(), même avec un Content-Type text/plain.
      try {
        const simpleInit = {
          ...init,
          headers: new Headers({
            'Content-Type': 'text/plain;charset=UTF-8',
          }),
          mode: 'cors',
          credentials: 'omit',
          cache: 'no-store',
          referrerPolicy: 'no-referrer',
        };

        record('simple_cors_retry');
        return await nativeFetch(input, simpleInit);
      } catch (fallbackError) {
        record('simple_cors_failed', {
          name: fallbackError?.name || 'Error',
          message: String(fallbackError?.message || fallbackError),
        });
        return syntheticFailure(fallbackError);
      }
    }
  }

  window.fetch = function patchedFetch(input, init) {
    if (!isApresBacRequest(input)) {
      return nativeFetch(input, init);
    }
    return invokeWithFallback(input, init || {});
  };

  window.__APRESBAC_WEB_DIAGNOSTICS__ = {
    version: '3.0.0',
    get entries() {
      return [...diagnostics];
    },
    clear() {
      diagnostics.length = 0;
    },
  };

  window.addEventListener('online', () => record('browser_online'));
  window.addEventListener('offline', () => record('browser_offline'));
  window.addEventListener('unhandledrejection', (event) => {
    record('unhandled_rejection', {
      message: String(event.reason?.message || event.reason || ''),
    });
  });

  record('hotfix_loaded', { version: '3.0.0' });
})();
