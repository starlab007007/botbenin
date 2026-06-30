import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WAHAQRResponse {
  session: string;
  status: 'pending' | 'connected' | 'failed';
  qr_base64?: string;
  expires_in?: number;
  error?: string;
}

interface WAHAStatusResponse {
  session: string;
  status: 'pending' | 'connected' | 'failed';
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);

    // Routes: /waha-connect/start | /status/{sessionName} | /pair-code
    // Also supports body-based dispatch via { action, sessionName, phoneNumber }
    // so it works with supabase.functions.invoke('waha-connect', { body: {...} }).
    let action: string | undefined = pathSegments[1];
    let sessionName: string | undefined = pathSegments[2];
    let phoneNumber: string | undefined;

    let parsedBody: any = null;
    if (req.method !== 'GET') {
      try { parsedBody = await req.clone().json(); } catch { /* ignore */ }
    }
    if (parsedBody && typeof parsedBody === 'object') {
      if (!action && typeof parsedBody.action === 'string') action = parsedBody.action;
      if (!sessionName && typeof parsedBody.sessionName === 'string') sessionName = parsedBody.sessionName;
      if (typeof parsedBody.phoneNumber === 'string') phoneNumber = parsedBody.phoneNumber;
    }

    const wahaUrl = 'https://waha.bot.bj';
    const wahaApiKey = Deno.env.get('WAHA_API_KEY');
    const wahaUsername = Deno.env.get('WAHA_USERNAME');
    const wahaPassword = Deno.env.get('WAHA_PASSWORD');

    if (!wahaApiKey && !wahaPassword) {
      console.error('Missing WAHA credentials in Supabase secrets');
      return new Response(
        JSON.stringify({
          error: 'WAHA credentials not configured',
          details: {
            WAHA_API_KEY: wahaApiKey ? 'SET' : 'MISSING',
            WAHA_USERNAME: wahaUsername ? 'SET' : 'MISSING',
            WAHA_PASSWORD: wahaPassword ? 'SET' : 'MISSING'
          }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔗 WAHA Connect - Action: ${action}, Session: ${sessionName || 'N/A'}`);

    if (action === 'start') {
      return await handleStart(sessionName, wahaUrl, wahaApiKey, wahaUsername || 'admin', wahaPassword);
    } else if (action === 'status' && sessionName) {
      return await handleStatus(sessionName, wahaUrl, wahaApiKey, wahaUsername || 'admin', wahaPassword);
    } else if (action === 'pair-code') {
      return await handlePairCode(sessionName, phoneNumber, wahaUrl, wahaApiKey, wahaUsername || 'admin', wahaPassword);
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid endpoint. Use action=start | status | pair-code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('❌ WAHA Connect Error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleStart(
  sessionName: string | undefined,
  wahaUrl: string,
  wahaApiKey: string | undefined,
  wahaUsername: string,
  wahaPassword: string | undefined
): Promise<Response> {
  if (!sessionName) {
    return new Response(
      JSON.stringify({ error: 'sessionName is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log(`🚀 Starting session: ${sessionName}`);

  try {
    // Étape 1: Démarrer la session
    const startResult = await startWAHASession(sessionName, wahaUrl, wahaApiKey, wahaUsername, wahaPassword);
    if (!startResult.success) {
      throw new Error(startResult.error || 'Failed to start session');
    }

    // Étape 2: Récupérer le QR code
    await new Promise(resolve => setTimeout(resolve, 2000)); // Attendre 2s pour que la session se prépare
    
    const qrResult = await getQRCode(sessionName, wahaUrl, wahaApiKey, wahaUsername, wahaPassword);
    
    const response: WAHAQRResponse = {
      session: sessionName,
      status: qrResult.success ? 'pending' : 'failed',
      qr_base64: qrResult.qr_base64,
      expires_in: 300, // 5 minutes
      error: qrResult.error
    };

    console.log(`✅ Session started: ${sessionName}, QR: ${qrResult.success ? 'Available' : 'Failed'}`);

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error(`❌ Start session failed: ${error.message}`);
    
    const response: WAHAQRResponse = {
      session: sessionName,
      status: 'failed',
      error: error.message
    };

    return new Response(
      JSON.stringify(response),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleStatus(
  sessionName: string,
  wahaUrl: string,
  wahaApiKey: string | undefined,
  wahaUsername: string,
  wahaPassword: string | undefined
): Promise<Response> {
  console.log(`📊 Checking status for session: ${sessionName}`);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': '*/*'
    };

    if (wahaApiKey) {
      headers['X-Api-Key'] = wahaApiKey;
    } else if (wahaPassword) {
      headers['Authorization'] = `Basic ${btoa(`${wahaUsername}:${wahaPassword}`)}`;
    }

    const response = await fetch(`${wahaUrl}/api/sessions/${sessionName}`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      throw new Error(`Status check failed: ${response.status}`);
    }

    const sessionData = await response.json();
    
    let status: 'pending' | 'connected' | 'failed' = 'pending';
    
    if (sessionData.status === 'WORKING' || sessionData.status === 'SCAN_QR_CODE') {
      status = 'pending';
    } else if (sessionData.status === 'AUTHENTICATED' || sessionData.status === 'READY') {
      status = 'connected';
    } else {
      status = 'failed';
    }

    const statusResponse: WAHAStatusResponse = {
      session: sessionName,
      status
    };

    console.log(`📊 Status for ${sessionName}: ${status} (WAHA: ${sessionData.status})`);

    return new Response(
      JSON.stringify(statusResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error(`❌ Status check failed: ${error.message}`);
    
    const statusResponse: WAHAStatusResponse = {
      session: sessionName,
      status: 'failed',
      error: error.message
    };

    return new Response(
      JSON.stringify(statusResponse),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function startWAHASession(
  sessionName: string,
  wahaUrl: string,
  wahaApiKey: string | undefined,
  wahaUsername: string,
  wahaPassword: string | undefined
): Promise<{ success: boolean; error?: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': '*/*'
  };

  if (wahaApiKey) {
    headers['X-Api-Key'] = wahaApiKey;
  } else if (wahaPassword) {
    headers['Authorization'] = `Basic ${btoa(`${wahaUsername}:${wahaPassword}`)}`;
  }

  try {
    console.log(`🚀 Attempting to start session: ${sessionName}`);
    
    // Première tentative: démarrer la session
    const startResponse = await fetch(`${wahaUrl}/api/sessions/${sessionName}/start`, {
      method: 'POST',
      headers,
      body: JSON.stringify({})
    });

    if (startResponse.ok || startResponse.status === 201) {
      console.log(`✅ Session started successfully: ${sessionName}`);
      return { success: true };
    }

    // Si 404 "Session not found", tenter de créer la session explicitement
    if (startResponse.status === 404) {
      const errorText = await startResponse.text();
      console.log(`⚠️ Session not found (404), attempting to create: ${sessionName}`);
      
      if (errorText.toLowerCase().includes('session not found') || errorText.toLowerCase().includes('not found')) {
        // Tenter la création explicite de la session
        const createResult = await createWAHASession(sessionName, wahaUrl, wahaApiKey, wahaUsername, wahaPassword);
        
        if (createResult.success) {
          console.log(`✅ Session created, retrying start: ${sessionName}`);
          
          // Attendre un peu avant de re-tenter le start
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Re-tenter le démarrage
          const retryStartResponse = await fetch(`${wahaUrl}/api/sessions/${sessionName}/start`, {
            method: 'POST',
            headers,
            body: JSON.stringify({})
          });

          if (retryStartResponse.ok || retryStartResponse.status === 201) {
            console.log(`✅ Session started after creation: ${sessionName}`);
            return { success: true };
          } else {
            const retryErrorText = await retryStartResponse.text();
            console.error(`❌ Start failed after creation: ${retryStartResponse.status} - ${retryErrorText}`);
            return { success: false, error: `Start failed after creation: ${retryStartResponse.status} - ${retryErrorText}` };
          }
        } else {
          console.error(`❌ Session creation failed: ${createResult.error}`);
          return { success: false, error: `Session creation failed: ${createResult.error}` };
        }
      }
    }

    // Autre erreur ou 404 sans "session not found"
    const errorText = await startResponse.text();
    console.error(`❌ Start failed: ${startResponse.status} - ${errorText}`);
    return { success: false, error: `Start failed: ${startResponse.status} - ${errorText}` };

  } catch (error: any) {
    console.error(`❌ Network error during start: ${error.message}`);
    return { success: false, error: `Network error: ${error.message}` };
  }
}

async function createWAHASession(
  sessionName: string,
  wahaUrl: string,
  wahaApiKey: string | undefined,
  wahaUsername: string,
  wahaPassword: string | undefined
): Promise<{ success: boolean; error?: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': '*/*'
  };

  if (wahaApiKey) {
    headers['X-Api-Key'] = wahaApiKey;
  } else if (wahaPassword) {
    headers['Authorization'] = `Basic ${btoa(`${wahaUsername}:${wahaPassword}`)}`;
  }

  // Tentatives de création avec différents endpoints et formats
  const createEndpoints = [
    {
      url: `/api/v2/sessions`,
      body: { name: sessionName, config: { driver: "whatsapp-web" } }
    },
    {
      url: `/api/sessions`,
      body: { name: sessionName, config: { driver: "whatsapp-web" } }
    },
    {
      url: `/api/v2/sessions`,
      body: { name: sessionName, driver: "whatsapp-web" }
    },
    {
      url: `/api/sessions`,
      body: { name: sessionName, driver: "whatsapp-web" }
    }
  ];

  for (const endpoint of createEndpoints) {
    try {
      console.log(`🔧 Trying session creation endpoint: ${endpoint.url}`);
      
      const response = await fetch(`${wahaUrl}${endpoint.url}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(endpoint.body)
      });

      if (response.ok || response.status === 201) {
        console.log(`✅ Session created successfully with endpoint: ${endpoint.url}`);
        return { success: true };
      } else {
        const errorText = await response.text();
        console.log(`❌ Creation endpoint ${endpoint.url} failed: ${response.status} - ${errorText}`);
      }
    } catch (error: any) {
      console.log(`❌ Creation endpoint ${endpoint.url} error: ${error.message}`);
      continue;
    }
  }

  return { success: false, error: 'All session creation endpoints failed - check WAHA permissions and API configuration' };
}

async function getQRCode(
  sessionName: string,
  wahaUrl: string,
  wahaApiKey: string | undefined,
  wahaUsername: string,
  wahaPassword: string | undefined
): Promise<{ success: boolean; qr_base64?: string; error?: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': '*/*'
  };

  if (wahaApiKey) {
    headers['X-Api-Key'] = wahaApiKey;
  } else if (wahaPassword) {
    headers['Authorization'] = `Basic ${btoa(`${wahaUsername}:${wahaPassword}`)}`;
  }

  // Séquence d'URLs QR à essayer
  const qrEndpoints = [
    `/api/v2/sessions/${sessionName}/qr?format=base64`,
    `/api/v2/sessions/${sessionName}/qr`,
    `/api/v2/sessions/${sessionName}/auth/qr?format=base64`,
    `/api/v2/sessions/${sessionName}/auth/qr`,
    `/api/sessions/${sessionName}/qr?format=base64`,
    `/api/sessions/${sessionName}/qr`,
    `/api/sessions/${sessionName}/auth/qr?format=base64`,
    `/api/sessions/${sessionName}/auth/qr`
  ];

  for (const endpoint of qrEndpoints) {
    try {
      console.log(`🔍 Trying QR endpoint: ${endpoint}`);
      
      const response = await fetch(`${wahaUrl}${endpoint}`, {
        method: 'GET',
        headers
      });

      if (response.ok) {
        const data = await response.text();
        
        // Vérifier si c'est du base64 valide ou une URL
        if (data && (data.startsWith('data:image') || data.startsWith('iVBORw0KGgo') || data.startsWith('/9j/'))) {
          console.log(`✅ QR found at: ${endpoint}`);
          
          // Normaliser en base64 avec préfixe data:image
          let qr_base64 = data;
          if (!data.startsWith('data:image')) {
            qr_base64 = `data:image/png;base64,${data}`;
          }
          
          return { success: true, qr_base64 };
        }
      }
    } catch (error: any) {
      console.log(`❌ QR endpoint ${endpoint} failed: ${error.message}`);
      continue;
    }
  }

  return { success: false, error: 'No valid QR code found in any endpoint' };
}

// ============================================================
// Pair code (8 digits) — alternative to QR scanning
// User enters their phone number, gets a code, then on the phone:
// WhatsApp → Linked devices → Link with phone number → enter code.
// ============================================================
async function handlePairCode(
  sessionName: string | undefined,
  phoneNumber: string | undefined,
  wahaUrl: string,
  wahaApiKey: string | undefined,
  wahaUsername: string,
  wahaPassword: string | undefined
): Promise<Response> {
  if (!sessionName) {
    return new Response(
      JSON.stringify({ error: 'sessionName is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Normalize phone to E.164 digits only (no +, no spaces)
  const digits = String(phoneNumber || '').replace(/[^\d]/g, '');
  if (!digits || digits.length < 8 || digits.length > 15) {
    return new Response(
      JSON.stringify({ error: 'Invalid phone number. Use international format, e.g. 22990000000.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log(`🔢 Pair-code requested for session=${sessionName}, phone=+${digits}`);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': '*/*'
  };
  if (wahaApiKey) headers['X-Api-Key'] = wahaApiKey;
  else if (wahaPassword) headers['Authorization'] = `Basic ${btoa(`${wahaUsername}:${wahaPassword}`)}`;

  try {
    // Ensure session exists and is started (idempotent — handles 404/422 transparently)
    const startResult = await startWAHASession(sessionName, wahaUrl, wahaApiKey, wahaUsername, wahaPassword);
    if (!startResult.success) {
      console.warn(`⚠️ start before pair-code failed (continuing): ${startResult.error}`);
    }
    await new Promise((r) => setTimeout(r, 1500));

    // Try multiple WAHA endpoints (versions differ): v2 first, then v1.
    const endpoints = [
      `/api/v2/sessions/${sessionName}/auth/request-code`,
      `/api/${sessionName}/auth/request-code`,
      `/api/sessions/${sessionName}/auth/request-code`,
    ];

    let code: string | undefined;
    let lastError = '';

    for (const ep of endpoints) {
      try {
        const res = await fetch(`${wahaUrl}${ep}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ phoneNumber: digits, method: 'sms' }),
        });
        const text = await res.text();
        if (!res.ok) {
          lastError = `${ep} -> ${res.status} ${text.slice(0, 200)}`;
          console.log(`❌ ${lastError}`);
          continue;
        }
        // Parse: WAHA may return { code: "XXXXXXXX" } or { pairingCode: "XXXX-XXXX" } or plain string
        let raw: any = text;
        try { raw = JSON.parse(text); } catch { /* plain text */ }
        const candidate = (typeof raw === 'string')
          ? raw
          : (raw?.code ?? raw?.pairingCode ?? raw?.pairing_code ?? raw?.data?.code);
        if (candidate) { code = String(candidate); break; }
        lastError = `${ep} -> ok but no code in payload`;
      } catch (e: any) {
        lastError = `${ep} -> ${e?.message ?? e}`;
        console.log(`❌ ${lastError}`);
      }
    }

    if (!code) {
      return new Response(
        JSON.stringify({ session: sessionName, status: 'failed', error: lastError || 'Pair code request failed' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize: keep only digits, then group 4-4 (e.g. ABCD1234 -> ABCD-1234)
    const onlyAlnum = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const formatted = onlyAlnum.length === 8
      ? `${onlyAlnum.slice(0, 4)}-${onlyAlnum.slice(4)}`
      : onlyAlnum;

    console.log(`✅ Pair code generated for ${sessionName}: ${formatted}`);

    return new Response(
      JSON.stringify({
        session: sessionName,
        status: 'pending',
        code: formatted,
        code_raw: onlyAlnum,
        expires_in: 300,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error(`❌ Pair code error: ${error.message}`);
    return new Response(
      JSON.stringify({ session: sessionName, status: 'failed', error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
