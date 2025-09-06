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

    // Dashboard authentication using HTTP Basic Auth (as indicated by www-authenticate: Basic)
    const authenticateDashboard = async (): Promise<string | null> => {
      try {
        console.log('Authenticating with WAHA dashboard using Basic Auth...');
        
        // Create Basic Auth header
        const credentials = btoa(`${wahaDashUser}:${wahaDashPass}`);
        const authHeader = `Basic ${credentials}`;
        console.log('Using Basic Auth for:', wahaDashUser);
        
        // First, try to access dashboard to get session cookie
        const dashboardUrl = `${wahaBaseUrl}/dashboard/`;
        console.log('Accessing dashboard URL:', dashboardUrl);
        
        const res = await fetch(dashboardUrl, {
          method: 'GET',
          headers: { 
            'Authorization': authHeader,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'User-Agent': 'Mozilla/5.0 (compatible; WAHA-Client/1.0)'
          },
          redirect: 'manual'
        });
        
        console.log('Dashboard access response:', res.status, res.statusText);
        console.log('Response headers:', Object.fromEntries(res.headers.entries()));
        
        if (res.status === 200) {
          const cookie = res.headers.get('set-cookie');
          console.log('Dashboard auth success with Basic Auth. Cookie available:', !!cookie);
          if (cookie) {
            console.log('Cookie preview:', cookie.substring(0, 100) + '...');
          }
          // For Basic Auth, we can also use the Authorization header directly
          return cookie || authHeader;
        } else {
          console.log(`Dashboard Basic Auth failed: ${res.status} ${res.statusText}`);
          return null;
        }
      } catch (e) {
        console.log('Dashboard Basic Auth error:', e);
        return null;
      }
    };

    // Core request wrapper
    const wahaFetch = async (endpoint: string, init: RequestInit = {}) => {
      const url = `${wahaBaseUrl}${endpoint}`;
      console.log('Attempting WAHA request:', url);

      // Determine best available API key (plain preferred)
      const plainKey = wahaApiKeyPlain?.length ? wahaApiKeyPlain : (wahaApiKey && !wahaApiKey.startsWith('sha512:') ? wahaApiKey : undefined);
      const apiKeyHeaderNames = ['X-Api-Key', 'X-API-Key', 'x-api-key'];

      // 1) Primary method: combine Dashboard auth (Basic or Cookie) WITH Api-Key if present
      const dashAuth = await authenticateDashboard();
      if (dashAuth) {
        try {
          const baseHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(init.headers || {})
          };

          // Inject dashboard auth
          if (dashAuth.startsWith('Basic ')) {
            baseHeaders['Authorization'] = dashAuth;
            console.log('Using Basic Auth header');
          } else {
            baseHeaders['Cookie'] = dashAuth;
            console.log('Using Cookie');
          }

          // Try with different Api-Key header casings if we have a key
          if (plainKey) {
            for (const hk of apiKeyHeaderNames) {
              const headers = { ...baseHeaders, [hk]: plainKey };
              const res = await fetch(url, { ...init, headers });
              console.log(`Dashboard+ApiKey (${hk}) ->`, res.status, res.statusText);
              if (res.ok || res.status !== 401) return res;
            }
          } else {
            const res = await fetch(url, { ...init, headers: baseHeaders });
            console.log('Dashboard auth call ->', res.status, res.statusText);
            if (res.ok || res.status !== 401) return res;
          }
        } catch (e) {
          console.log('Dashboard auth call error:', e);
        }
      }

      // 2) Fallback: Api-Key only (no dashboard auth)
      if (plainKey) {
        for (const hk of apiKeyHeaderNames) {
          try {
            const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json', ...(init.headers || {}), [hk]: plainKey } as Record<string, string>;
            const res = await fetch(url, { ...init, headers });
            console.log(`API key variant (${hk}) ->`, res.status, res.statusText);
            if (res.ok || res.status !== 401) return res;
          } catch (e) {
            console.log(`API key variant (${hk}) error:`, e);
          }
        }
        // Some deployments accept Bearer token format
        try {
          const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json', ...(init.headers || {}), 'Authorization': `Bearer ${plainKey}` };
          const res = await fetch(url, { ...init, headers });
          console.log('API key variant (Bearer) ->', res.status, res.statusText);
          if (res.ok || res.status !== 401) return res;
        } catch (e) {
          console.log('API key variant (Bearer) error:', e);
        }
      }

      // 3) Last attempt without auth
      console.log('All auth methods failed. Final unauthenticated attempt.');
      return fetch(url, { ...init, headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...(init.headers || {}) } });
    };
    let wahaResponse: WAHAResponse = { success: false };
    switch (action) {
      case 'create': {
        console.log('Creating WAHA session...');
        const res = await wahaFetch(`/api/sessions/`, {
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

        let sessionData: any = null;
        if (res.ok) {
          sessionData = await res.json().catch(() => ({}));
          console.log('Session created:', sessionData);
          // Try to fetch status to ensure visibility in WAHA dashboard immediately
          try {
            const statusRes = await wahaFetch(`/api/sessions/${sessionName}`, { method: 'GET' });
            if (statusRes.ok) {
              const statusData = await statusRes.json().catch(() => ({}));
              sessionData = { ...(sessionData || {}), ...statusData };
            }
          } catch (e) {
            console.log('Status fetch after create failed:', e);
          }
        } else {
          const txt = await res.text();
          console.error('WAHA create failed:', res.status, txt);
          // Still upsert a placeholder row so UI shows session immediately
          const { error: placeholderErr } = await supabase.from('whatsapp_accounts').upsert({
            user_id: user.id,
            session_name: sessionName,
            phone_number: phoneNumber,
            status: 'disconnected',
            webhook_url: `${supabaseUrl}/functions/v1/waha-webhook`,
            waha_session_data: { error: `create_failed: ${txt}` },
            last_activity: new Date().toISOString(),
          });
          if (placeholderErr) console.error('DB upsert placeholder error:', placeholderErr);
          return new Response(JSON.stringify({ success: false, error: `WAHA create failed: ${txt}` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { error: dbError } = await supabase.from('whatsapp_accounts').upsert({
          user_id: user.id,
          session_name: sessionName,
          phone_number: phoneNumber,
          status: sessionData?.status || 'STOPPED',
          webhook_url: `${supabaseUrl}/functions/v1/waha-webhook`,
          waha_session_data: sessionData,
          last_activity: new Date().toISOString(),
        });
        if (dbError) throw dbError;
        wahaResponse = { success: true, data: sessionData };
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
        // WAHA docs: POST /api/{session}/auth/qr
        const res = await wahaFetch(`/api/${sessionName}/auth/qr`, { method: 'POST' });
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