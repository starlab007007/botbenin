import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const wahaBaseUrl = 'https://waha.bot.bj';
    const wahaDashUser = 'admin';
    const wahaDashPass = 'Starlab@007';

    console.log('=== COMPREHENSIVE WAHA AUTH TEST ===');
    
    const results: any = {};
    
    // Test 1: Basic Auth direct API access
    console.log('Test 1: Basic Auth sur /api/sessions');
    try {
      const credentials = btoa(`${wahaDashUser}:${wahaDashPass}`);
      const res1 = await fetch(`${wahaBaseUrl}/api/sessions`, {
        method: 'GET',
        headers: { 
          'Authorization': `Basic ${credentials}`,
          'Accept': 'application/json'
        }
      });
      results.basicAuthAPI = { status: res1.status, ok: res1.ok };
      console.log('Basic Auth API result:', res1.status, res1.ok);
    } catch (e) {
      results.basicAuthAPI = { error: e instanceof Error ? e.message : 'Unknown error' };
    }

    // Test 2: Try without /dashboard prefix
    console.log('Test 2: Basic Auth sur racine');
    try {
      const credentials = btoa(`${wahaDashUser}:${wahaDashPass}`);
      const res2 = await fetch(`${wahaBaseUrl}/`, {
        method: 'GET',
        headers: { 
          'Authorization': `Basic ${credentials}`,
          'Accept': 'text/html'
        }
      });
      results.basicAuthRoot = { status: res2.status, ok: res2.ok };
      console.log('Basic Auth Root result:', res2.status, res2.ok);
    } catch (e) {
      results.basicAuthRoot = { error: e instanceof Error ? e.message : 'Unknown error' };
    }

    // Test 3: Check if WAHA needs specific API endpoint for auth
    console.log('Test 3: Auth endpoint discovery');
    try {
      const endpoints = ['/auth', '/login', '/api/auth', '/api/login'];
      for (const endpoint of endpoints) {
        const res = await fetch(`${wahaBaseUrl}${endpoint}`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });
        results[`endpoint_${endpoint.replace('/', '_')}`] = { status: res.status };
        console.log(`Endpoint ${endpoint}:`, res.status);
      }
    } catch (e) {
      results.endpointDiscovery = { error: e instanceof Error ? e.message : 'Unknown error' };
    }

    // Test 4: Try creating session without auth (to see error message)
    console.log('Test 4: Session creation sans auth');
    try {
      const res4 = await fetch(`${wahaBaseUrl}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'test_no_auth' })
      });
      const text = await res4.text();
      results.noAuthSessionCreate = { status: res4.status, response: text };
      console.log('No auth session create:', res4.status, text);
    } catch (e) {
      results.noAuthSessionCreate = { error: e instanceof Error ? e.message : 'Unknown error' };
    }

    // Test 5: Try with different Basic Auth format
    console.log('Test 5: Different auth formats');
    try {
      const formats = [
        `Basic ${btoa(`${wahaDashUser}:${wahaDashPass}`)}`,
        `Bearer ${btoa(`${wahaDashUser}:${wahaDashPass}`)}`,
        wahaDashPass // Try just password as API key
      ];
      
      for (let i = 0; i < formats.length; i++) {
        const res = await fetch(`${wahaBaseUrl}/api/sessions`, {
          method: 'GET',
          headers: { 
            'Authorization': formats[i],
            'Accept': 'application/json'
          }
        });
        results[`authFormat_${i}`] = { status: res.status, format: formats[i].substring(0, 20) + '...' };
        console.log(`Auth format ${i}:`, res.status);
      }
    } catch (e) {
      results.authFormats = { error: e instanceof Error ? e.message : 'Unknown error' };
    }

    // Test 6: Check WAHA version/health
    console.log('Test 6: WAHA health check');
    try {
      const res6 = await fetch(`${wahaBaseUrl}/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      if (res6.ok) {
        const health = await res6.json();
        results.health = health;
        console.log('Health check OK:', health);
      } else {
        results.health = { status: res6.status };
      }
    } catch (e) {
      results.health = { error: e instanceof Error ? e.message : 'Unknown error' };
    }

    // Test 7: Try API key in header variations
    console.log('Test 7: API key variations');
    const apiKeyTests = ['X-API-Key', 'x-api-key', 'apikey', 'Api-Key'];
    for (const header of apiKeyTests) {
      try {
        const res = await fetch(`${wahaBaseUrl}/api/sessions`, {
          method: 'GET',
          headers: { 
            [header]: wahaDashPass,
            'Accept': 'application/json'
          }
        });
        results[`apiKey_${header}`] = { status: res.status };
        console.log(`API Key ${header}:`, res.status);
      } catch (e) {
        results[`apiKey_${header}`] = { error: e instanceof Error ? e.message : 'Unknown error' };
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Tests d\'authentification WAHA complets',
      results: results
    }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Test comprehensive error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});