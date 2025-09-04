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

    console.log('Testing WAHA authentication...');
    
    // Test 1: Dashboard login with Basic Auth
    console.log('=== TEST 1: Dashboard Basic Auth ===');
    
    const credentials = btoa(`${wahaDashUser}:${wahaDashPass}`);
    const authHeader = `Basic ${credentials}`;
    console.log('Using Basic Auth for:', wahaDashUser);
    
    const dashboardUrl = `${wahaBaseUrl}/dashboard/`;
    console.log('Dashboard URL:', dashboardUrl);
    
    const loginRes = await fetch(dashboardUrl, {
      method: 'GET',
      headers: { 
        'Authorization': authHeader,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (compatible; WAHA-Test/1.0)'
      },
      redirect: 'manual'
    });
    
    console.log('Login response status:', loginRes.status);
    console.log('Login response headers:', Object.fromEntries(loginRes.headers.entries()));
    
    const cookie = loginRes.headers.get('set-cookie');
    console.log('Cookie received:', !!cookie);
    if (cookie) console.log('Cookie preview:', cookie.substring(0, 100));
    
    // Test 2: Try API call with Basic Auth (and cookie if available)
    console.log('=== TEST 2: API Call with Basic Auth ===');
    const apiUrl = `${wahaBaseUrl}/api/sessions`;
    console.log('API URL:', apiUrl);
    
    const apiHeaders: Record<string, string> = {
      'Authorization': authHeader,
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; WAHA-Test/1.0)'
    };
    
    if (cookie) {
      apiHeaders['Cookie'] = cookie;
    }
    
    const apiRes = await fetch(apiUrl, {
      method: 'GET',
      headers: apiHeaders
    });
      
      console.log('API response status:', apiRes.status);
      console.log('API response headers:', Object.fromEntries(apiRes.headers.entries()));
      
      if (apiRes.ok) {
        const data = await apiRes.json();
        console.log('API response data:', data);
      } else {
        const text = await apiRes.text();
        console.log('API error response:', text.substring(0, 200));
      }
    
    // Test 3: Direct dashboard access with Basic Auth
    console.log('=== TEST 3: Dashboard Access with Basic Auth ===');
    const dashboardRes = await fetch(`${wahaBaseUrl}/dashboard/`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (compatible; WAHA-Test/1.0)'
      },
      redirect: 'manual'
    });
    
    console.log('Dashboard access status:', dashboardRes.status);
    console.log('Dashboard response headers:', Object.fromEntries(dashboardRes.headers.entries()));

    return new Response(JSON.stringify({
      success: true,
      tests: {
        login: {
          status: loginRes.status,
          hasCookie: !!cookie,
          useBasicAuth: true
        },
        api: {
          status: apiRes.status,
          authenticated: 'basic_auth_and_cookie'
        },
        dashboard: {
          status: dashboardRes.status
        }
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Test error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});