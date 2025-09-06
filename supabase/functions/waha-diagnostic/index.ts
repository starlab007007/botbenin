import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user authentication
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

    const wahaUrl = Deno.env.get('WAHA_BASE_URL') || 'https://waha.bot.bj';
    console.log('🔧 Using WAHA URL:', wahaUrl);
    const wahaUsername = Deno.env.get('WAHA_DASHBOARD_USERNAME') || 'admin';
    const wahaPassword = Deno.env.get('WAHA_DASHBOARD_PASSWORD') || 'Starlab@007';
    const wahaApiKey = Deno.env.get('WAHA_API_KEY');

    console.log('🔍 WAHA Diagnostic - Starting comprehensive test...');
    
    const diagnosticResults: any[] = [];

    // Test 1: Check WAHA server availability
    try {
      const pingResponse = await fetch(`${wahaUrl}/`, {
        method: 'GET',
        headers: { 'User-Agent': 'WAHA-Diagnostic-Tool' }
      });
      
      diagnosticResults.push({
        test: 'server_availability',
        success: pingResponse.ok,
        status: pingResponse.status,
        details: `Server response: ${pingResponse.status} ${pingResponse.statusText}`
      });
    } catch (error) {
      diagnosticResults.push({
        test: 'server_availability',
        success: false,
        error: error.message,
        details: 'Failed to connect to WAHA server'
      });
    }

    // Test 2: Dashboard authentication
    try {
      const basicAuth = btoa(`${wahaUsername}:${wahaPassword}`);
      const dashboardResponse = await fetch(`${wahaUrl}/dashboard`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const cookies = dashboardResponse.headers.get('set-cookie') || '';
      
      diagnosticResults.push({
        test: 'dashboard_auth',
        success: dashboardResponse.ok,
        status: dashboardResponse.status,
        details: `Dashboard access: ${dashboardResponse.status}, Cookies: ${cookies ? 'Present' : 'None'}`,
        cookies: cookies
      });
    } catch (error) {
      diagnosticResults.push({
        test: 'dashboard_auth',
        success: false,
        error: error.message
      });
    }

    // Test 3: API Key authentication (if available)
    if (wahaApiKey) {
      try {
        const apiKeyResponse = await fetch(`${wahaUrl}/api/sessions`, {
          method: 'GET',
          headers: {
            'X-Api-Key': wahaApiKey,
            'Accept': 'application/json'
          }
        });

        diagnosticResults.push({
          test: 'api_key_auth',
          success: apiKeyResponse.ok,
          status: apiKeyResponse.status,
          details: `API Key test: ${apiKeyResponse.status}`,
          responseBody: apiKeyResponse.ok ? await apiKeyResponse.text() : 'Failed'
        });
      } catch (error) {
        diagnosticResults.push({
          test: 'api_key_auth',
          success: false,
          error: error.message
        });
      }
    } else {
      diagnosticResults.push({
        test: 'api_key_auth',
        success: false,
        details: 'No API Key configured'
      });
    }

    // Test 4: Bearer token authentication (if API key available)
    if (wahaApiKey) {
      try {
        const bearerResponse = await fetch(`${wahaUrl}/api/sessions`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${wahaApiKey}`,
            'Accept': 'application/json'
          }
        });

        diagnosticResults.push({
          test: 'bearer_auth',
          success: bearerResponse.ok,
          status: bearerResponse.status,
          details: `Bearer test: ${bearerResponse.status}`
        });
      } catch (error) {
        diagnosticResults.push({
          test: 'bearer_auth',
          success: false,
          error: error.message
        });
      }
    }

    // Test 5: Basic Auth direct API
    try {
      const basicAuth = btoa(`${wahaUsername}:${wahaPassword}`);
      const basicResponse = await fetch(`${wahaUrl}/api/sessions`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Accept': 'application/json'
        }
      });

      const responseText = await basicResponse.text();
      
      diagnosticResults.push({
        test: 'basic_auth_api',
        success: basicResponse.ok,
        status: basicResponse.status,
        details: `Basic auth API: ${basicResponse.status}`,
        responseBody: basicResponse.ok ? responseText : responseText.substring(0, 200)
      });
    } catch (error) {
      diagnosticResults.push({
        test: 'basic_auth_api',
        success: false,
        error: error.message
      });
    }

    // Test 6: Alternative endpoints
    const alternativeEndpoints = [
      '/api/v2/sessions',
      '/api/health',
      '/api/version',
      '/api/status'
    ];

    for (const endpoint of alternativeEndpoints) {
      try {
        const testResponse = await fetch(`${wahaUrl}${endpoint}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });

        diagnosticResults.push({
          test: `endpoint_${endpoint.replace(/\//g, '_')}`,
          success: testResponse.ok,
          status: testResponse.status,
          details: `${endpoint}: ${testResponse.status}`
        });
      } catch (error) {
        diagnosticResults.push({
          test: `endpoint_${endpoint.replace(/\//g, '_')}`,
          success: false,
          error: error.message
        });
      }
    }

    // Test 7: Check WAHA documentation or help endpoint
    try {
      const helpResponse = await fetch(`${wahaUrl}/docs`, {
        method: 'GET'
      });
      
      diagnosticResults.push({
        test: 'documentation_available',
        success: helpResponse.ok,
        status: helpResponse.status,
        details: `Documentation: ${helpResponse.status}`
      });
    } catch (error) {
      diagnosticResults.push({
        test: 'documentation_available',
        success: false,
        error: error.message
      });
    }

    // Summary and recommendations
    const summary = {
      total_tests: diagnosticResults.length,
      successful_tests: diagnosticResults.filter(r => r.success).length,
      failed_tests: diagnosticResults.filter(r => !r.success).length,
      recommendations: []
    };

    // Generate recommendations
    const serverAvailable = diagnosticResults.find(r => r.test === 'server_availability')?.success;
    const dashboardAuth = diagnosticResults.find(r => r.test === 'dashboard_auth')?.success;
    const apiKeyAuth = diagnosticResults.find(r => r.test === 'api_key_auth')?.success;

    if (!serverAvailable) {
      summary.recommendations.push('🔴 WAHA server is not accessible. Check the WAHA_BASE_URL configuration.');
    }

    if (!dashboardAuth) {
      summary.recommendations.push('🔴 Dashboard authentication failed. Check WAHA_DASHBOARD_USERNAME and WAHA_DASHBOARD_PASSWORD.');
    }

    if (!apiKeyAuth && wahaApiKey) {
      summary.recommendations.push('🔴 API Key authentication failed. Verify the WAHA_API_KEY is valid.');
    }

    if (!wahaApiKey) {
      summary.recommendations.push('🟡 No API Key configured. Consider adding WAHA_API_KEY for better authentication.');
    }

    if (summary.successful_tests === 0) {
      summary.recommendations.push('🔴 All authentication methods failed. The WAHA server may require different credentials or be misconfigured.');
    }

    console.log('🔍 Diagnostic complete:', summary);

    return new Response(JSON.stringify({
      timestamp: new Date().toISOString(),
      waha_config: {
        url: wahaUrl,
        username: wahaUsername ? 'SET' : 'NOT SET',
        password: wahaPassword ? 'SET' : 'NOT SET',
        api_key: wahaApiKey ? 'SET' : 'NOT SET'
      },
      diagnostic_results: diagnosticResults,
      summary: summary
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Diagnostic error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Diagnostic failed', 
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