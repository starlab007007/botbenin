import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WAHAAuthResponse {
  success: boolean;
  authenticated?: boolean;
  dashboardAccess?: boolean;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const wahaBaseUrl = Deno.env.get('WAHA_BASE_URL');

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization')!;
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid user session');
    }

    console.log(`WAHA Auto Auth for user: ${user.id}`);

    if (!wahaBaseUrl) {
      throw new Error('WAHA_BASE_URL not configured');
    }

    // Credentials for auto-authentication
    const apiCredentials = {
      username: 'admin',
      password: 'Starlab@007'
    };

    const dashboardCredentials = {
      username: 'admin', 
      password: 'Starlab@007'
    };

    // Test WAHA API authentication
    console.log('Testing WAHA API authentication...');
    
    const apiAuthData = new URLSearchParams();
    apiAuthData.append('username', apiCredentials.username);
    apiAuthData.append('password', apiCredentials.password);

    const apiResponse = await fetch(`${wahaBaseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: apiAuthData
    });

    let apiAuthenticated = false;
    if (apiResponse.ok) {
      apiAuthenticated = true;
      console.log('WAHA API authentication successful');
    } else {
      console.log('WAHA API authentication failed:', apiResponse.status);
    }

    // Test WAHA Dashboard authentication
    console.log('Testing WAHA Dashboard authentication...');
    
    const dashboardAuthData = new URLSearchParams();
    dashboardAuthData.append('username', dashboardCredentials.username);
    dashboardAuthData.append('password', dashboardCredentials.password);

    const dashboardResponse = await fetch(`${wahaBaseUrl}/dashboard/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: dashboardAuthData
    });

    let dashboardAuthenticated = false;
    if (dashboardResponse.ok) {
      dashboardAuthenticated = true;
      console.log('WAHA Dashboard authentication successful');
    } else {
      console.log('WAHA Dashboard authentication failed:', dashboardResponse.status);
    }

    // Store authentication status for user session
    const { error: updateError } = await supabase
      .from('whatsapp_accounts')
      .upsert({
        user_id: user.id,
        session_name: `user_${user.id.substring(0, 8)}_main`,
        waha_authenticated: apiAuthenticated,
        dashboard_authenticated: dashboardAuthenticated,
        last_auth_attempt: new Date().toISOString()
      }, {
        onConflict: 'user_id,session_name'
      });

    if (updateError) {
      console.warn('Failed to update user auth status:', updateError);
    }

    const response: WAHAAuthResponse = {
      success: apiAuthenticated || dashboardAuthenticated,
      authenticated: apiAuthenticated,
      dashboardAccess: dashboardAuthenticated,
      error: (!apiAuthenticated && !dashboardAuthenticated) ? 
        'Authentication failed for both API and Dashboard' : undefined
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('WAHA Auto Auth Error:', error);
    
    const response: WAHAAuthResponse = {
      success: false,
      error: error.message || 'Authentication failed'
    };

    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});