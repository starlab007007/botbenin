(() => {
  'use strict';

  const SUPABASE_URL = 'https://mvynepqulhflxtyymtzs.supabase.co';
  const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12eW5lcHF1bGhmbHh0eXltdHpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1OTgxNTMsImV4cCI6MjA2MzE3NDE1M30.g1llr-Q6T3h06xFV7hCNRWZHG20wQHoBmp5zL0OAKh8';
  const AUTH_KEY = 'fa_ia_supabase_session_v1';
  const MAIN_AUTH_KEY = 'sb-mvynepqulhflxtyymtzs-auth-token';
  const nativeFetch = window.fetch.bind(window);
  let pendingToken = null;

  function normalizeSession(value) {
    if (!value || typeof value !== 'object') return null;
    const session = value.currentSession || value.session || value.data?.session || value;
    return session?.access_token ? session : null;
  }

  function readSession() {
    for (const key of [MAIN_AUTH_KEY, AUTH_KEY]) {
      try {
        const session = normalizeSession(JSON.parse(localStorage.getItem(key) || 'null'));
        if (session) return session;
      } catch (_) {}
    }
    return null;
  }

  function saveSession(value) {
    const session = normalizeSession(value);
    if (!session) return null;
    const expiresAt = Number(session.expires_at || 0) ||
      (session.expires_in ? Math.floor(Date.now() / 1000) + Number(session.expires_in) : 0);
    const stored = { ...session, expires_at: expiresAt };
    try { localStorage.setItem(AUTH_KEY, JSON.stringify(stored)); } catch (_) {}
    return stored;
  }

  async function authRequest(path, body) {
    const response = await nativeFetch(`${SUPABASE_URL}/auth/v1/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.msg || data.message || data.error_description || data.error || 'Authentification indisponible');
    }
    return data;
  }

  async function resolveToken(forceNew = false) {
    let session = forceNew ? null : readSession();
    const now = Math.floor(Date.now() / 1000);

    if (session?.access_token && (!session.expires_at || Number(session.expires_at) > now + 90)) {
      return session.access_token;
    }

    if (session?.refresh_token) {
      try {
        session = saveSession(await authRequest('token?grant_type=refresh_token', {
          refresh_token: session.refresh_token,
        }));
        if (session?.access_token) return session.access_token;
      } catch (_) {
        try { localStorage.removeItem(AUTH_KEY); } catch (_) {}
      }
    }

    try {
      session = saveSession(await authRequest('signup', {
        data: { module: 'fa-ia-web', version: '5.2' },
        gotrue_meta_security: {},
      }));
      return session?.access_token || null;
    } catch (_) {
      return null;
    }
  }

  async function token(forceNew = false) {
    if (forceNew) pendingToken = null;
    if (!pendingToken) pendingToken = resolveToken(forceNew).finally(() => { pendingToken = null; });
    return pendingToken;
  }

  window.fetch = async function faAuthenticatedFetch(input, init = {}) {
    const url = typeof input === 'string' ? input : input?.url || '';
    if (!url.includes('/functions/v1/waouh-fa-chat')) {
      return nativeFetch(input, init);
    }

    const send = async (forceNew = false) => {
      const accessToken = await token(forceNew);
      const headers = new Headers(init.headers || (typeof input !== 'string' ? input.headers : undefined));
      headers.set('apikey', ANON_KEY);
      headers.set('Authorization', `Bearer ${accessToken || ANON_KEY}`);
      return nativeFetch(input, { ...init, headers });
    };

    let response = await send(false);
    if (response.status === 401) {
      try { localStorage.removeItem(AUTH_KEY); } catch (_) {}
      response = await send(true);
    }
    return response;
  };
})();