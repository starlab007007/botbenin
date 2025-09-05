import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user
    const authHeader = req.headers.get('Authorization');
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader?.replace('Bearer ', '') || ''
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Configuration WAHA
    const wahaUrl = Deno.env.get('WAHA_BASE_URL') || 'https://waha.bot.bj';
    const wahaUsername = Deno.env.get('WAHA_DASHBOARD_USERNAME') || 'admin';
    const wahaPassword = Deno.env.get('WAHA_DASHBOARD_PASSWORD') || 'Starlab@007';

    console.log('WAHA Dashboard Proxy - Configuration:', {
      wahaUrl: wahaUrl ? 'SET' : 'NOT SET',
      wahaUsername: wahaUsername ? 'SET' : 'NOT SET', 
      wahaPassword: wahaPassword ? 'SET' : 'NOT SET'
    });

    const { method, url } = req;
    const urlPath = new URL(url).searchParams.get('path') || '/api/sessions';
    const fullWahaUrl = `${wahaUrl}${urlPath}`;

    console.log(`Proxying ${method} request to: ${fullWahaUrl}`);

    // Créer les headers d'authentification
    const basicAuth = btoa(`${wahaUsername}:${wahaPassword}`);
    const wahaHeaders: Record<string, string> = {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    // Pour les requêtes POST/PUT, récupérer le body
    let body: any = null;
    if (method === 'POST' || method === 'PUT') {
      try {
        body = await req.json();
        console.log('Request body:', JSON.stringify(body, null, 2));
      } catch (e) {
        console.log('No JSON body or failed to parse:', e);
      }
    }

    // Faire la requête vers WAHA
    console.log('Making request to WAHA with headers:', { 
      ...wahaHeaders, 
      Authorization: 'Basic [REDACTED]' 
    });

    const wahaResponse = await fetch(fullWahaUrl, {
      method,
      headers: wahaHeaders,
      body: body ? JSON.stringify(body) : null,
    });

    console.log(`WAHA response status: ${wahaResponse.status}`);

    let responseData: any;
    const contentType = wahaResponse.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      responseData = await wahaResponse.json();
    } else {
      const textResponse = await wahaResponse.text();
      console.log('Non-JSON response:', textResponse.substring(0, 200));
      responseData = { data: textResponse };
    }

    // Synchroniser les données avec notre base de données si c'est une requête de sessions
    if (urlPath === '/api/sessions' && method === 'GET' && wahaResponse.ok) {
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
        details: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});