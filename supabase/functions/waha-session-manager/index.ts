import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WAHASessionRequest {
  action: 'create' | 'start' | 'stop' | 'status' | 'delete' | 'qr';
  sessionName: string;
  phoneNumber?: string;
}

interface WAHAResponse {
  success: boolean;
  data?: any;
  error?: string;
  qrCode?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Allow a safe default base URL to avoid missing config in dev
    let wahaBaseUrl = Deno.env.get('WAHA_BASE_URL') || 'https://waha.bot.bj';
    const wahaApiKey = Deno.env.get('WAHA_API_KEY')?.trim();
    const wahaApiKeyPlain = Deno.env.get('WAHA_API_KEY_PLAIN')?.trim();
    const wahaDashUser = Deno.env.get('WAHA_DASHBOARD_USERNAME') || 'admin';
    const wahaDashPass = Deno.env.get('WAHA_DASHBOARD_PASSWORD') || 'Starlab@007';

    // Clean base URL (remove trailing slash and /dashboard path)
    if (wahaBaseUrl) {
      wahaBaseUrl = wahaBaseUrl.replace(/\/$/, '').replace(/\/dashboard$/, '');
    }

    // Debug logging for environment variables
    console.log('Environment check:');
    console.log('WAHA_BASE_URL:', wahaBaseUrl ? 'SET' : 'MISSING');
    console.log('WAHA_API_KEY (hash or plain):', wahaApiKey ? 'SET' : 'MISSING');
    console.log('WAHA_API_KEY_PLAIN:', wahaApiKeyPlain ? 'SET' : 'MISSING');
    console.log('WAHA_DASHBOARD_USERNAME:', wahaDashUser ? 'SET' : 'MISSING');
    console.log('WAHA_DASHBOARD_PASSWORD:', wahaDashPass ? 'SET' : 'MISSING');

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid token');
    }

    const { action, sessionName, phoneNumber }: WAHASessionRequest = await req.json();

    console.log(`WAHA ${action} request for session: ${sessionName}`);

    // Auth method A: API login (/auth/login) to get cookie or bearer token usable for /api
    const authenticateApi = async (): Promise<{ cookie?: string; bearer?: string } | null> => {
      try {
        console.log('Authenticating with WAHA API /auth/login...');
        const body = new URLSearchParams({ username: wahaDashUser, password: wahaDashPass });
        const res = await fetch(`${wahaBaseUrl}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body,
        });
        if (!res.ok) {
          console.log(`API auth failed: ${res.status} ${res.statusText}`);
          return null;
        }
        const cookie = res.headers.get('set-cookie') || undefined;
        let bearer: string | undefined;
        try {
          const json = await res.clone().json();
          bearer = (json?.token || json?.access_token) as string | undefined;
        } catch (_) { /* ignore parse error */ }
        console.log('API auth success. cookie:', !!cookie, 'bearer:', !!bearer);
        return cookie || bearer ? { cookie, bearer } : { };
      } catch (e) {
        console.log('API auth error:', e);
        return null;
      }
    };

    // Auth method B: Dashboard login (cookie may be scoped to /dashboard only, last resort)
    const authenticateDashboard = async (): Promise<string | null> => {
      try {
        console.log('Authenticating with WAHA dashboard /dashboard/auth...');
        const res = await fetch(`${wahaBaseUrl}/dashboard/auth`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ username: wahaDashUser, password: wahaDashPass }),
        });
        if (!res.ok) {
          console.log(`Dashboard auth failed: ${res.status} ${res.statusText}`);
          return null;
        }
        const cookie = res.headers.get('set-cookie');
        console.log('Dashboard auth success. cookie:', !!cookie);
        return cookie;
      } catch (e) {
        console.log('Dashboard auth error:', e);
        return null;
      }
    };

    // Core request wrapper
    const wahaFetch = async (endpoint: string, init: RequestInit = {}) => {
      const url = `${wahaBaseUrl}${endpoint}`;
      console.log('Attempting WAHA request:', url);

      // 1) Try API session (best match for /api endpoints)
      const apiAuth = await authenticateApi();
      if (apiAuth) {
        try {
          const res = await fetch(url, {
            ...init,
            headers: {
              'Content-Type': 'application/json',
              ...(apiAuth.cookie ? { Cookie: apiAuth.cookie } : {}),
              ...(apiAuth.bearer ? { Authorization: `Bearer ${apiAuth.bearer}` } : {}),
              ...(init.headers || {}),
            },
          });
          console.log('API session call ->', res.status, res.statusText);
          if (res.ok || res.status !== 401) return res;
        } catch (e) {
          console.log('API session call error:', e);
        }
      }

      // 2) Try API keys if provided
      const candidates: Record<string, string>[] = [];
      const key = wahaApiKeyPlain?.length ? wahaApiKeyPlain : wahaApiKey;
      if (key) {
        candidates.push(
          { 'X-Api-Key': key },
          { 'X-API-Key': key },
          { 'X-API-KEY': key },
          { 'x-api-key': key },
          { 'Authorization': `Bearer ${key}` },
          { 'Authorization': `ApiKey ${key}` },
        );
      }
      for (let i = 0; i < candidates.length; i++) {
        try {
          const res = await fetch(url, {
            ...init,
            headers: { 'Content-Type': 'application/json', ...(init.headers || {}), ...candidates[i] },
          });
          console.log(`API key variant ${i + 1} ->`, res.status, res.statusText);
          if (res.ok || res.status !== 401) return res;
        } catch (e) {
          console.log(`API key variant ${i + 1} error:`, e);
        }
      }

      // 3) Try dashboard cookie as a final fallback
      const dashCookie = await authenticateDashboard();
      if (dashCookie) {
        try {
          const res = await fetch(url, {
            ...init,
            headers: { 'Content-Type': 'application/json', Cookie: dashCookie, ...(init.headers || {}) },
          });
          console.log('Dashboard cookie call ->', res.status, res.statusText);
          return res;
        } catch (e) {
          console.log('Dashboard cookie call error:', e);
        }
      }

      // 4) Last attempt without auth
      console.log('All auth methods failed. Final unauthenticated attempt.');
      return fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(init.headers || {}) } });
    };

    let wahaResponse: WAHAResponse = { success: false };
    switch (action) {
      case 'create': {
        console.log('Creating WAHA session...');
        const res = await wahaFetch(`/api/sessions`, {
          method: 'POST',
          body: JSON.stringify({
            name: sessionName,
            config: {
              webhooks: [
                { url: `${supabaseUrl}/functions/v1/waha-webhook`, events: ['message', 'session.status'] },
              ],
            },
          }),
        });

        if (res.ok) {
          const sessionData = await res.json();
          console.log('Session created:', sessionData);
          const { error: dbError } = await supabase.from('whatsapp_accounts').upsert({
            user_id: user.id,
            session_name: sessionName,
            phone_number: phoneNumber,
            status: 'disconnected',
            webhook_url: `${supabaseUrl}/functions/v1/waha-webhook`,
            waha_session_data: sessionData,
            last_activity: new Date().toISOString(),
          });
          if (dbError) throw dbError;
          wahaResponse = { success: true, data: sessionData };
        } else if (res.status === 409) {
          wahaResponse = { success: true, data: { name: sessionName, status: 'existing' } };
        } else {
          const txt = await res.text();
          console.error('WAHA create failed:', res.status, txt);
          wahaResponse = { success: false, error: `WAHA create failed: ${txt}` };
        }
        break;
      }

      case 'start': {
        console.log('Starting session...');
        const res = await wahaFetch(`/api/sessions/${sessionName}/start`, { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          await supabase.from('whatsapp_accounts').update({ status: 'connecting', last_activity: new Date().toISOString() })
            .eq('user_id', user.id).eq('session_name', sessionName);
          wahaResponse = { success: true, data };
        } else {
          const txt = await res.text();
          console.error('WAHA start failed:', res.status, txt);
          wahaResponse = { success: false, error: `WAHA start failed: ${txt}` };
        }
        break;
      }

      case 'qr': {
        console.log('Fetching QR...');
        const res = await wahaFetch(`/api/sessions/${sessionName}/auth/qr`, { method: 'GET' });
        if (res.ok) {
          const data = await res.json();
          await supabase.from('whatsapp_accounts').update({ qr_code: data.qr || data.base64, last_activity: new Date().toISOString() })
            .eq('user_id', user.id).eq('session_name', sessionName);
          wahaResponse = { success: true, data, qrCode: data.qr || data.base64 };
        } else {
          const txt = await res.text();
          console.error('QR fetch failed:', res.status, txt);
          wahaResponse = { success: false, error: `QR fetch failed: ${txt}` };
        }
        break;
      }

      case 'status': {
        const res = await wahaFetch(`/api/sessions/${sessionName}`, { method: 'GET' });
        if (res.ok) {
          const data = await res.json();
          await supabase.from('whatsapp_accounts').update({
            status: data.status || 'disconnected',
            waha_session_data: data,
            last_activity: new Date().toISOString(),
          }).eq('user_id', user.id).eq('session_name', sessionName);
          wahaResponse = { success: true, data };
        } else {
          const txt = await res.text();
          console.error('Status failed:', res.status, txt);
          wahaResponse = { success: false, error: 'Session not found' };
        }
        break;
      }

      case 'stop': {
        const res = await wahaFetch(`/api/sessions/${sessionName}/stop`, { method: 'POST' });
        if (res.ok) {
          await supabase.from('whatsapp_accounts').update({ status: 'disconnected', qr_code: null, last_activity: new Date().toISOString() })
            .eq('user_id', user.id).eq('session_name', sessionName);
          wahaResponse = { success: true };
        } else {
          const txt = await res.text();
          console.error('Stop failed:', res.status, txt);
          wahaResponse = { success: false, error: `WAHA stop failed: ${txt}` };
        }
        break;
      }

      case 'delete': {
        const res = await wahaFetch(`/api/sessions/${sessionName}`, { method: 'DELETE' });
        if (res.ok) {
          await supabase.from('whatsapp_accounts').delete().eq('user_id', user.id).eq('session_name', sessionName);
          wahaResponse = { success: true };
        } else {
          const txt = await res.text();
          console.error('Delete failed:', res.status, txt);
          wahaResponse = { success: false, error: `WAHA delete failed: ${txt}` };
        }
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(wahaResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('WAHA session manager error:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as { message?: string }).message || 'Unknown error' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});