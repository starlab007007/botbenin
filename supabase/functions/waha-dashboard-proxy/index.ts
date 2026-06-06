import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
};

interface SessionsResponse {
  sessions: any[];
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client for data sync only
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Sécurité: Vérifier l'origine de la requête (allowlist)
    const origin = req.headers.get('Origin') || req.headers.get('Referer') || '';
    
    // Autoriser tous les domaines Lovable en développement
    const isLovableDomain = 
      origin.includes('lovableproject.com') ||
      origin.includes('lovable.app') ||
      origin.includes('lovable.dev') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.includes('bot.bj') ||
      origin.includes('supabase.co') ||
      !origin; // Autoriser les requêtes sans origin (appels directs)
    
    if (!isLovableDomain) {
      console.warn('🚫 Proxy - Accès refusé - Origine non autorisée:', origin);
      return new Response(JSON.stringify({ 
        error: 'Access denied',
        message: 'Origin not allowed for proxy',
        origin: origin 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('✅ Proxy - Origine autorisée:', origin || 'No origin (direct access)');

    // Configuration WAHA - SANS fallback hardcodé pour le password
    const wahaUrl = Deno.env.get('WAHA_BASE_URL') || 'https://waha.bot.bj';
    const wahaUsername = Deno.env.get('WAHA_DASHBOARD_USERNAME');
    const wahaPassword = Deno.env.get('WAHA_DASHBOARD_PASSWORD');
    const wahaApiKey = Deno.env.get('WAHA_API_KEY');

    // Validate required secrets
    if (!wahaUsername || !wahaPassword) {
      console.error('Missing WAHA dashboard credentials in Supabase secrets');
      return new Response(JSON.stringify({
        error: 'Configuration error',
        message: 'WAHA dashboard credentials not configured in Supabase secrets',
        details: {
          WAHA_DASHBOARD_USERNAME: wahaUsername ? 'SET' : 'MISSING',
          WAHA_DASHBOARD_PASSWORD: wahaPassword ? 'SET' : 'MISSING'
        }
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('WAHA Dashboard Proxy - Configuration:', {
      wahaUrl: wahaUrl ? 'SET' : 'NOT SET',
      wahaUsername: 'SET (from secrets)',
      wahaPassword: 'SET (from secrets)',
      wahaApiKey: wahaApiKey ? 'SET' : 'NOT SET'
    });

    const { method: incomingMethod, url } = req;
    const urlObj = new URL(url);
    let urlPath = urlObj.searchParams.get('path') || urlObj.searchParams.get('endpoint') || '/api/sessions';
    let finalMethod = incomingMethod;
    
    console.log('📡 Proxy request:', {
      method: finalMethod,
      path: urlPath,
      params: Object.fromEntries(urlObj.searchParams.entries())
    });

    // Récupérer un éventuel corps JSON et permettre la surcharge du path/method
    let bodyData: any = null;
    if (incomingMethod === 'POST' || incomingMethod === 'PUT' || incomingMethod === 'PATCH') {
      try {
        const parsed = await req.json();
        console.log('Incoming JSON:', JSON.stringify(parsed, null, 2));
        if (parsed && typeof parsed === 'object' && (parsed.path || parsed.method || parsed.body)) {
          urlPath = parsed.path || urlPath;
          finalMethod = parsed.method || incomingMethod;
          bodyData = parsed.body ?? (finalMethod === 'GET' ? null : parsed);
        } else {
          bodyData = parsed;
        }
      } catch (e) {
        console.log('No JSON body or failed to parse:', e);
      }
    }

    // Normaliser l'URL pour éviter les doubles slash
    const base = (wahaUrl || '').replace(/\/+$/, '');
    const pathNormalized = `/${(urlPath || '').replace(/^\/+/, '')}`;
    const fullWahaUrl = `${base}${pathNormalized}`;

    console.log(`Proxying ${finalMethod} request to: ${fullWahaUrl}`);

    // Helper: fetch avec timeout pour éviter les IDLE_TIMEOUT (150s)
    const fetchWithTimeout = async (input: string, init: RequestInit, timeoutMs = 20000) => {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        return await fetch(input, { ...init, signal: ctrl.signal });
      } finally {
        clearTimeout(t);
      }
    };

    const tryWAHARequest = async (headers: Record<string, string>, authMethod: string) => {
      console.log(`Trying ${authMethod} authentication method`);
      const response = await fetchWithTimeout(fullWahaUrl, {
        method: finalMethod,
        headers,
        body: bodyData ? JSON.stringify(bodyData) : null,
      }, 25000);
      console.log(`${authMethod} response status: ${response.status}`);
      return response;
    };

    let wahaResponse: Response;
    let lastError: any = null;

    // Utiliser uniquement X-Api-Key pour l'authentification
    if (!wahaApiKey) {
      return new Response(JSON.stringify({
        error: 'API Key required',
        message: 'WAHA_API_KEY must be configured in Supabase secrets'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const apiKeyHeaders = {
      'X-Api-Key': wahaApiKey,
      'Content-Type': 'application/json',
      'Accept': '*/*'
    };
    
    console.log('Using X-Api-Key authentication method');
    wahaResponse = await tryWAHARequest(apiKeyHeaders, 'X-Api-Key');
    
    if (wahaResponse.ok) {
      console.log('✅ X-Api-Key authentication successful');
    } else {
      console.log(`❌ X-Api-Key authentication failed: ${wahaResponse.status}`);
      lastError = { method: 'X-Api-Key', status: wahaResponse.status };
    }

    // Fallback automatique vers /api/v2/sessions si 404 sur /api/sessions
    if (wahaResponse && wahaResponse.status === 404 && pathNormalized === '/api/sessions' && finalMethod === 'GET') {
      const altUrl = `${base}/api/v2/sessions`;
      console.log('Primary path returned 404. Retrying with /api/v2/sessions...');
      
      // Utiliser X-Api-Key pour le fallback
      const retryHeaders = {
        'X-Api-Key': wahaApiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      wahaResponse = await fetch(altUrl, { method: 'GET', headers: retryHeaders });
      console.log(`Fallback to /api/v2/sessions status: ${wahaResponse.status}`);
    }

    // Fallbacks intelligents pour les endpoints QR (nombreuses variantes WAHA)
    if (wahaResponse && wahaResponse.status === 404) {
      try {
        const qrMatch =
          pathNormalized.match(/^\/api(?:\/v2)?\/(?:sessions\/)?([^\/]+)\/(?:auth\/)?qr(\?.*)?$/i) ||
          pathNormalized.match(/^\/api(?:\/v2)?\/([^\/]+)\/auth\/qr(\?.*)?$/i);

        if (qrMatch) {
          const sessionName = qrMatch[1];
          console.log(`QR endpoint 404 for ${pathNormalized}. Trying alternative endpoints for session: ${sessionName}`);

          const candidates: { path: string; method: 'GET' | 'POST' }[] = [
            // Recommandés (nouvelles versions)
            { path: `/api/${sessionName}/auth/qr`, method: 'POST' },
            { path: `/api/${sessionName}/auth/qr?format=base64`, method: 'POST' },
            { path: `/api/v2/${sessionName}/auth/qr`, method: 'POST' },
            { path: `/api/v2/${sessionName}/auth/qr?format=base64`, method: 'POST' },
            // Anciens schémas (compatibilité max)
            { path: `/api/sessions/${sessionName}/auth/qr?format=base64`, method: 'GET' },
            { path: `/api/sessions/${sessionName}/auth/qr`, method: 'GET' },
            { path: `/api/sessions/${sessionName}/qr?format=base64`, method: 'GET' },
            { path: `/api/sessions/${sessionName}/qr`, method: 'GET' },
            { path: `/api/v2/sessions/${sessionName}/auth/qr?format=base64`, method: 'GET' },
            { path: `/api/v2/sessions/${sessionName}/auth/qr`, method: 'GET' },
            { path: `/api/v2/sessions/${sessionName}/qr?format=base64`, method: 'GET' },
            { path: `/api/v2/sessions/${sessionName}/qr`, method: 'GET' },
          ];

          for (const c of candidates) {
            const tryUrl = `${base}${c.path}`;
            const tryHeaders = {
              'X-Api-Key': wahaApiKey,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            } as Record<string, string>;
            console.log(`➡️ QR fallback try: ${c.method} ${tryUrl}`);
            const resp = await fetch(tryUrl, { method: c.method, headers: tryHeaders });
            console.log(`⬅️ QR fallback status: ${resp.status}`);
            if (resp.ok) {
              console.log('✅ QR fallback succeeded');
              wahaResponse = resp;
              break;
            }
          }
        }
      } catch (qrFallbackError) {
        console.warn('QR fallback handling error:', qrFallbackError);
      }
    }

    console.log(`Final WAHA response status: ${wahaResponse?.status || 'NO_RESPONSE'}`);

    // Forward the actual WAHA error so the client sees the real reason
    if (!wahaResponse || !wahaResponse.ok) {
      const status = wahaResponse?.status || 500;
      let wahaBody: any = null;
      try {
        const text = await wahaResponse!.text();
        try { wahaBody = JSON.parse(text); } catch { wahaBody = text; }
      } catch { /* ignore */ }

      const isAuthError = status === 401 || status === 403;
      const errorLabel = isAuthError
        ? 'X-Api-Key authentication failed'
        : `WAHA request failed (${status})`;

      const errorDetails = {
        error: errorLabel,
        message: typeof wahaBody === 'object' ? (wahaBody?.message || wahaBody?.error || JSON.stringify(wahaBody)) : String(wahaBody || ''),
        wahaStatus: status,
        wahaBody,
        lastError,
        method: 'X-Api-Key',
        timestamp: new Date().toISOString(),
      };

      console.error(`❌ ${errorLabel}:`, errorDetails);

      return new Response(JSON.stringify(errorDetails), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let responseData: any;
    const contentType = wahaResponse.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      responseData = await wahaResponse.json();
      console.log('✅ Successfully parsed JSON response');
    } else if (contentType?.includes('image/')) {
      // Gérer les réponses image - convertir en base64
      const arrayBuffer = await wahaResponse.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      const base64 = btoa(binary);
      console.log('✅ Successfully converted image to base64');
      responseData = { 
        mimetype: contentType, 
        data: base64, 
        type: 'image' 
      };
    } else {
      const textResponse = await wahaResponse.text();
      console.log('⚠️ Non-JSON response received:', textResponse.substring(0, 200));
      responseData = { data: textResponse, type: 'text' };
    }

    // Synchroniser les données avec notre base de données si c'est une requête de sessions
    if ((pathNormalized === '/api/sessions' || pathNormalized === '/api/v2/sessions') && finalMethod === 'GET' && wahaResponse.ok) {
      try {
        const sessions = Array.isArray(responseData) ? responseData : [];
        console.log(`Synchronizing ${sessions.length} sessions with database`);
        
        for (const session of sessions) {
          const { error: upsertError } = await supabase
            .from('waha_sessions_data')
            .upsert({
              session_name: session.name,
              status: session.status || 'DISCONNECTED',
              phone_number: session.config?.metadata?.phone_number || null,
              account_info: session.config || {},
              metadata: session.metadata || {},
              server_name: 'WAHA',
              last_activity: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, { 
              onConflict: 'session_name',
              ignoreDuplicates: false 
            });

          if (upsertError) {
            console.error('Error upserting session:', session.name, upsertError);
          }
        }
      } catch (syncError) {
        console.error('Error synchronizing sessions:', syncError);
      }
    }

    return new Response(JSON.stringify(responseData), {
      status: wahaResponse.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('WAHA Dashboard Proxy error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Proxy error', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
