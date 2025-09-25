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
    const wahaBaseUrl = Deno.env.get('WAHA_BASE_URL');
    const wahaApiKey = Deno.env.get('WAHA_API_KEY');
    const wahaApiKeyPlain = Deno.env.get('WAHA_API_KEY_PLAIN');
    const wahaDashUser = Deno.env.get('WAHA_DASHBOARD_USERNAME');
    const wahaDashPass = Deno.env.get('WAHA_DASHBOARD_PASSWORD');

    console.log('WAHA Health Check');
    console.log('WAHA_BASE_URL:', wahaBaseUrl);
    console.log('WAHA_API_KEY:', wahaApiKey ? 'SET' : 'MISSING');
    console.log('WAHA_API_KEY_PLAIN:', wahaApiKeyPlain ? 'SET' : 'MISSING');
    console.log('WAHA_DASHBOARD_USERNAME:', wahaDashUser ? 'SET' : 'MISSING');
    console.log('WAHA_DASHBOARD_PASSWORD:', wahaDashPass ? 'SET' : 'MISSING');

    if (!wahaBaseUrl) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'WAHA_BASE_URL not configured' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Test different auth methods
    const authTests = [];

    // Test 1: No auth
    try {
      const res = await fetch(`${wahaBaseUrl}/api/sessions`);
      authTests.push({
        method: 'no_auth',
        status: res.status,
        statusText: res.statusText,
        success: res.ok
      });
    } catch (err) {
      authTests.push({
        method: 'no_auth',
        error: err instanceof Error ? err.message : 'Unknown error',
        success: false
      });
    }

    // Test 2: API Key variants
    if (wahaApiKey || wahaApiKeyPlain) {
      const keyToUse = (wahaApiKeyPlain && wahaApiKeyPlain.length > 0) ? wahaApiKeyPlain : (wahaApiKey as string);
      const apiKeyVariants: Array<Record<string, string>> = [
        { 'X-Api-Key': keyToUse },
        { 'X-API-Key': keyToUse },
        { 'X-API-KEY': keyToUse },
        { 'x-api-key': keyToUse },
        { 'Authorization': `Bearer ${keyToUse}` },
        { 'Authorization': `ApiKey ${keyToUse}` }
      ];

      for (let i = 0; i < apiKeyVariants.length; i++) {
        try {
          const res = await fetch(`${wahaBaseUrl}/api/sessions`, {
            headers: new Headers(apiKeyVariants[i])
          });
          authTests.push({
            method: `api_key_variant_${i + 1}`,
            headers: Object.keys(apiKeyVariants[i]),
            status: res.status,
            statusText: res.statusText,
            success: res.ok
          });
        } catch (err) {
          authTests.push({
            method: `api_key_variant_${i + 1}`,
            headers: Object.keys(apiKeyVariants[i]),
            error: err instanceof Error ? err.message : 'Unknown error',
            success: false
          });
        }
      }
    }

    // Test 3: Basic auth
    if (wahaDashUser && wahaDashPass) {
      try {
        const basic = `Basic ${btoa(`${wahaDashUser}:${wahaDashPass}`)}`;
        const res = await fetch(`${wahaBaseUrl}/api/sessions`, {
          headers: { 'Authorization': basic }
        });
        authTests.push({
          method: 'basic_auth',
          status: res.status,
          statusText: res.statusText,
          success: res.ok
        });
      } catch (err) {
        authTests.push({
          method: 'basic_auth',
          error: err instanceof Error ? err.message : 'Unknown error',
          success: false
        });
      }
    }

    // Test 4: Try to access WAHA dashboard directly
    try {
      const res = await fetch(wahaBaseUrl);
      authTests.push({
        method: 'dashboard_access',
        status: res.status,
        statusText: res.statusText,
        success: res.ok
      });
    } catch (err) {
      authTests.push({
        method: 'dashboard_access',
        error: err instanceof Error ? err.message : 'Unknown error',
        success: false
      });
    }

    return new Response(JSON.stringify({
      success: true,
      wahaBaseUrl,
      authTests,
      workingMethods: authTests.filter(test => test.success),
      recommendations: authTests.some(test => test.success) 
        ? 'At least one auth method works!' 
        : 'No auth methods work. Check WAHA server status and credentials.'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Health check error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});