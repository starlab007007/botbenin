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
      console.log('🚀 Attempting WAHA request:', url);

      // Determine best available API key (plain preferred)
      const plainKey = wahaApiKeyPlain?.length ? wahaApiKeyPlain : (wahaApiKey && !wahaApiKey.startsWith('sha512:') ? wahaApiKey : undefined);
      console.log('🔑 API Key available:', !!plainKey, plainKey ? `(${plainKey.substring(0, 8)}...)` : 'NONE');
      
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

      // 2) Fallback: Api-Key only (no dashboard auth) - PRIORITÉ à X-API-Key selon WAHA docs
      if (plainKey) {
        // Ordre prioritaire selon la documentation WAHA
        const priorityHeaders = ['X-API-Key', 'X-Api-Key', 'x-api-key'];
        
        for (const hk of priorityHeaders) {
          try {
            const headers = { 
              'Content-Type': 'application/json', 
              'Accept': 'application/json', 
              ...(init.headers || {}), 
              [hk]: plainKey 
            } as Record<string, string>;
            
            console.log(`🔑 Trying API key with header: ${hk}`);
            const res = await fetch(url, { ...init, headers });
            console.log(`✅ API key variant (${hk}) ->`, res.status, res.statusText);
            
            if (res.ok) {
              console.log(`🎉 Success with ${hk} header!`);
              return res;
            }
            
            // Si ce n'est pas 401, on retourne quand même la réponse pour analyse
            if (res.status !== 401) {
              console.log(`⚠️ Non-401 response with ${hk}:`, res.status);
              return res;
            }
          } catch (e) {
            console.log(`❌ API key variant (${hk}) error:`, e);
          }
        }
        
        // Essayer en Bearer token aussi
        try {
          const headers = { 
            'Content-Type': 'application/json', 
            'Accept': 'application/json', 
            ...(init.headers || {}), 
            'Authorization': `Bearer ${plainKey}` 
          };
          console.log('🔑 Trying Bearer token format');
          const res = await fetch(url, { ...init, headers });
          console.log('✅ API key variant (Bearer) ->', res.status, res.statusText);
          if (res.ok) {
            console.log('🎉 Success with Bearer token!');
            return res;
          }
          if (res.status !== 401) return res;
        } catch (e) {
          console.log('❌ API key variant (Bearer) error:', e);
        }
      } else {
        console.log('⚠️ No API key available - this may cause 401 errors');
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
        
        // Essayer les différents endpoints de start selon la doc WAHA
        const startEndpoints = [
          `/api/sessions/${sessionName}/start`,  // Standard
          `/api/v2/sessions/${sessionName}/start`, // V2
          `/api/${sessionName}/start`,  // Court
          `/api/v2/${sessionName}/start`  // V2 court
        ];
        
        let startSuccess = false;
        let lastError: string | null = null;
        
        for (const endpoint of startEndpoints) {
          try {
            console.log(`Trying start endpoint: ${endpoint}`);
            const res = await wahaFetch(endpoint, { method: 'POST' });
            
            if (res.ok) {
              const data = await res.json();
              console.log('✅ Session started successfully:', data);
              await supabase.from('whatsapp_accounts').update({ 
                status: 'connecting', 
                last_activity: new Date().toISOString() 
              }).eq('user_id', user.id).eq('session_name', sessionName);
              wahaResponse = { success: true, data };
              startSuccess = true;
              break;
            } else {
              const txt = await res.text();
              lastError = `${endpoint}: ${res.status} ${txt}`;
              console.warn(`❌ Start endpoint ${endpoint} failed: ${res.status} ${txt}`);
            }
          } catch (e: any) {
            lastError = `${endpoint}: ${e.message}`;
            console.warn(`❌ Start endpoint ${endpoint} error:`, e);
          }
        }
        
        if (!startSuccess) {
          console.error('❌ All start endpoints failed. Last error:', lastError);
          wahaResponse = { 
            success: false, 
            error: `Impossible de démarrer la session "${sessionName}". Vérifiez que la session existe et que l'API WAHA est correctement configurée. Détail: ${lastError}` 
          };
        }
        break;
      }

      case 'qr': {
        console.log('Fetching QR...');
        
        // Essayer plusieurs endpoints QR (docs: POST /api/{session}/auth/qr)
        const qrEndpoints: { path: string; method: 'POST' | 'GET' }[] = [
          // Recommandé par la doc (priorité)
          { path: `/api/${sessionName}/auth/qr`, method: 'POST' },
          { path: `/api/${sessionName}/auth/qr?format=base64`, method: 'POST' },
          { path: `/api/v2/${sessionName}/auth/qr`, method: 'POST' },
          { path: `/api/v2/${sessionName}/auth/qr?format=base64`, method: 'POST' },
          // Anciennes variantes en fallback (GET)
          { path: `/api/sessions/${sessionName}/auth/qr?format=base64`, method: 'GET' },
          { path: `/api/sessions/${sessionName}/auth/qr`, method: 'GET' },
          { path: `/api/sessions/${sessionName}/qr?format=base64`, method: 'GET' },
          { path: `/api/sessions/${sessionName}/qr`, method: 'GET' },
          { path: `/api/v2/sessions/${sessionName}/auth/qr?format=base64`, method: 'GET' },
          { path: `/api/v2/sessions/${sessionName}/auth/qr`, method: 'GET' },
          { path: `/api/v2/sessions/${sessionName}/qr?format=base64`, method: 'GET' },
          { path: `/api/v2/sessions/${sessionName}/qr`, method: 'GET' },
        ];
        
        let qrSuccess = false;
        let lastError: string | null = null;
        
        for (const endpoint of qrEndpoints) {
          try {
            console.log(`Trying QR endpoint: ${endpoint.path} (${endpoint.method})`);
            const res = await wahaFetch(endpoint.path, { method: endpoint.method });
            const ct = res.headers.get('content-type') || '';
            
            if (res.ok) {
              let qrCode: string | undefined;
              let data: any = {};

              if (ct.includes('application/json')) {
                data = await res.json();
                qrCode = data.qr || data.base64 || data.image || data.qrcode;
              } else if (ct.includes('image/png')) {
                const buf = await res.arrayBuffer();
                const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
                qrCode = `data:image/png;base64,${b64}`;
                data = { base64: b64 };
              } else {
                const txt = await res.text();
                // Might already be a data URL or raw base64
                if (txt.startsWith('data:image')) qrCode = txt.trim();
                else if (/^[A-Za-z0-9+/=\n\r]+$/.test(txt.trim()) && txt.trim().length > 100) {
                  qrCode = `data:image/png;base64,${txt.trim().replace(/\s+/g,'')}`;
                } else {
                  data = { data: txt };
                }
              }
              
              if (qrCode) {
                await supabase.from('whatsapp_accounts').update({ 
                  qr_code: qrCode, 
                  last_activity: new Date().toISOString() 
                }).eq('user_id', user.id).eq('session_name', sessionName);
                
                wahaResponse = { success: true, data, qrCode };
                qrSuccess = true;
                break;
              }
            } else {
              const txt = await res.text();
              lastError = `${endpoint.path}: ${res.status} ${txt}`;
              console.warn(`QR endpoint ${endpoint.path} failed: ${res.status} ${txt}`);
            }
          } catch (e: any) {
            lastError = `${endpoint.path}: ${e.message}`;
            console.warn(`QR endpoint ${endpoint.path} error:`, e);
          }
        }
        
        if (!qrSuccess) {
          console.error('❌ All QR endpoints failed. Last error:', lastError);
          wahaResponse = { success: false, error: `QR fetch failed: ${lastError || 'All endpoints failed'}` };
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