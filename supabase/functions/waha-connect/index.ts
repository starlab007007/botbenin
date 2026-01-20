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
    
    // Routes: /waha-connect/start ou /waha-connect/status/{sessionName}
    const action = pathSegments[1]; // start ou status
    const sessionName = pathSegments[2]; // nom de session pour status

    const wahaUrl = 'https://waha.bot.bj';
    const wahaApiKey = Deno.env.get('WAHA_API_KEY');
    const wahaUsername = Deno.env.get('WAHA_USERNAME');
    const wahaPassword = Deno.env.get('WAHA_PASSWORD');

    // Validate required secrets - NO hardcoded fallbacks
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
      return await handleStart(req, wahaUrl, wahaApiKey, wahaUsername || 'admin', wahaPassword);
    } else if (action === 'status' && sessionName) {
      return await handleStatus(sessionName, wahaUrl, wahaApiKey, wahaUsername || 'admin', wahaPassword);
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid endpoint. Use /start or /status/{sessionName}' }),
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
  req: Request, 
  wahaUrl: string, 
  wahaApiKey: string | undefined, 
  wahaUsername: string, 
  wahaPassword: string | undefined
): Promise<Response> {
  const body = await req.json();
  const { sessionName } = body;

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
