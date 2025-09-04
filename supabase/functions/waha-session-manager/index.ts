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
    let wahaBaseUrl = Deno.env.get('WAHA_BASE_URL');
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
    
    if (!wahaBaseUrl) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'WAHA configuration missing: WAHA_BASE_URL' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

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

    // Function to authenticate with WAHA dashboard first
    const authenticateWithDashboard = async (): Promise<string | null> => {
      try {
        console.log('Authenticating with WAHA dashboard...');
        
        // First, authenticate with the dashboard
        const loginResponse = await fetch(`${wahaBaseUrl}/dashboard/auth`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            username: wahaDashUser,
            password: wahaDashPass,
          }),
        });

        if (!loginResponse.ok) {
          console.log(`Dashboard auth failed: ${loginResponse.status} ${loginResponse.statusText}`);
          return null;
        }

        // Extract session cookies
        const cookies = loginResponse.headers.get('set-cookie');
        console.log('Dashboard authentication successful, got cookies');
        return cookies;
      } catch (error) {
        console.log(`Dashboard authentication error: ${error}`);
        return null;
      }
    };

    // Enhanced WAHA request function with dashboard authentication first
    const wahaFetch = async (endpoint: string, init: RequestInit = {}) => {
      console.log(`Attempting WAHA request to ${wahaBaseUrl}${endpoint}`);
      
      // Method 1: First authenticate with dashboard to get session
      const dashboardCookies = await authenticateWithDashboard();
      
      if (dashboardCookies) {
        console.log('Using dashboard session for API calls');
        try {
          const response = await fetch(`${wahaBaseUrl}${endpoint}`, {
            ...init,
            headers: {
              'Content-Type': 'application/json',
              'Cookie': dashboardCookies,
              ...init.headers,
            },
          });
          
          console.log(`Dashboard session request: ${response.status} ${response.statusText}`);
          
          if (response.ok) {
            return response;
          }
        } catch (error) {
          console.log(`Dashboard session request error: ${error}`);
        }
      }

      // Method 2: Try API key methods as fallback
      const authVariants = [];
      
      if (wahaApiKey || wahaApiKeyPlain) {
        const keyToUse = (wahaApiKeyPlain && wahaApiKeyPlain.length > 0) ? wahaApiKeyPlain : (wahaApiKey as string);
        authVariants.push(
          { 'X-Api-Key': keyToUse },
          { 'X-API-Key': keyToUse },
          { 'X-API-KEY': keyToUse },
          { 'x-api-key': keyToUse },
          { 'Authorization': `Bearer ${keyToUse}` },
          { 'Authorization': `ApiKey ${keyToUse}` }
        );
      }

      console.log(`Trying ${authVariants.length} API key variants as fallback...`);
      
      // Try each authentication variant
      for (let i = 0; i < authVariants.length; i++) {
        const headers = authVariants[i];
        console.log(`Trying auth variant ${i + 1}:`, Object.keys(headers).join(', '));
        
        try {
          const response = await fetch(`${wahaBaseUrl}${endpoint}`, {
            ...init,
            headers: {
              'Content-Type': 'application/json',
              ...init.headers,
              ...headers,
            },
          });
          
          console.log(`Auth variant ${i + 1} response: ${response.status} ${response.statusText}`);
          
          if (response.ok) {
            return response;
          }
        } catch (error) {
          console.log(`Auth variant ${i + 1} failed: ${error}`);
        }
      }
      
      // Method 3: Final attempt without authentication
      console.log('All auth methods failed, trying without authentication...');
      return fetch(`${wahaBaseUrl}${endpoint}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...init.headers,
        },
      });
    };

    let wahaResponse: WAHAResponse = { success: false };
    switch (action) {
      case 'create':
        console.log('Creating WAHA session...');
        const createResponse = await wahaFetch(`/api/sessions`, {
          method: 'POST',
          body: JSON.stringify({
            name: sessionName,
            config: {
              webhooks: [
                {
                  url: `${supabaseUrl}/functions/v1/waha-webhook`,
                  events: ['message', 'session.status'],
                },
              ],
            },
          }),
        });

        if (createResponse.ok) {
          const sessionData = await createResponse.json();
          console.log('WAHA session created successfully:', sessionData);
          
          // Save session to database
          const { error: dbError } = await supabase
            .from('whatsapp_accounts')
            .upsert({
              user_id: user.id,
              session_name: sessionName,
              phone_number: phoneNumber,
              status: 'disconnected',
              webhook_url: `${supabaseUrl}/functions/v1/waha-webhook`,
              waha_session_data: sessionData,
              last_activity: new Date().toISOString(),
            });

          if (dbError) {
            console.error('Database error:', dbError);
            throw dbError;
          }

          wahaResponse = { success: true, data: sessionData };
        } else if (createResponse.status === 409) {
          // Session already exists, that's OK
          console.log('Session already exists, proceeding...');
          wahaResponse = { success: true, data: { name: sessionName, status: 'existing' } };
        } else {
          const errorData = await createResponse.text();
          console.error('WAHA create failed:', createResponse.status, errorData);
          wahaResponse = { success: false, error: `WAHA create failed: ${errorData}` };
        }
        break;

      case 'start':
        console.log('Starting WAHA session...');
        const startResponse = await wahaFetch(`/api/sessions/${sessionName}/start`, {
          method: 'POST',
        });

        if (startResponse.ok) {
          const startData = await startResponse.json();
          
          // Update database status
          await supabase
            .from('whatsapp_accounts')
            .update({
              status: 'connecting',
              last_activity: new Date().toISOString(),
            })
            .eq('user_id', user.id)
            .eq('session_name', sessionName);

          wahaResponse = { success: true, data: startData };
        } else {
          const errorData = await startResponse.text();
          console.error('WAHA start failed:', startResponse.status, errorData);
          wahaResponse = { success: false, error: `WAHA start failed: ${errorData}` };
        }
        break;

      case 'qr':
        console.log('Getting QR code from WAHA session...');
        const qrResponse = await wahaFetch(`/api/sessions/${sessionName}/auth/qr`, {
          method: 'GET',
        });

        if (qrResponse.ok) {
          const qrData = await qrResponse.json();
          
          // Update database with QR code
          await supabase
            .from('whatsapp_accounts')
            .update({
              qr_code: qrData.qr || qrData.base64,
              last_activity: new Date().toISOString(),
            })
            .eq('user_id', user.id)
            .eq('session_name', sessionName);

          wahaResponse = { 
            success: true, 
            data: qrData,
            qrCode: qrData.qr || qrData.base64 
          };
        } else {
          const errorData = await qrResponse.text();
          console.error('QR fetch failed:', qrResponse.status, errorData);
          wahaResponse = { success: false, error: `QR fetch failed: ${errorData}` };
        }
        break;

      case 'status':
        console.log('Getting WAHA session status...');
        const statusResponse = await wahaFetch(`/api/sessions/${sessionName}`, {
          method: 'GET',
        });

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          
          // Update database with current status
          await supabase
            .from('whatsapp_accounts')
            .update({
              status: statusData.status || 'disconnected',
              waha_session_data: statusData,
              last_activity: new Date().toISOString(),
            })
            .eq('user_id', user.id)
            .eq('session_name', sessionName);

          wahaResponse = { success: true, data: statusData };
        } else {
          const errorText = await statusResponse.text();
          console.error('WAHA status failed:', statusResponse.status, errorText);
          wahaResponse = { success: false, error: 'Session not found' };
        }
        break;

      case 'stop':
        console.log('Stopping WAHA session...');
        const stopResponse = await wahaFetch(`/api/sessions/${sessionName}/stop`, {
          method: 'POST',
        });

        if (stopResponse.ok) {
          // Update database status
          await supabase
            .from('whatsapp_accounts')
            .update({
              status: 'disconnected',
              qr_code: null,
              last_activity: new Date().toISOString(),
            })
            .eq('user_id', user.id)
            .eq('session_name', sessionName);

          wahaResponse = { success: true };
        } else {
          const errorData = await stopResponse.text();
          console.error('WAHA stop failed:', stopResponse.status, errorData);
          wahaResponse = { success: false, error: `WAHA stop failed: ${errorData}` };
        }
        break;

      case 'delete':
        console.log('Deleting WAHA session...');
        const deleteResponse = await wahaFetch(`/api/sessions/${sessionName}`, {
          method: 'DELETE',
        });

        if (deleteResponse.ok) {
          // Remove from database
          await supabase
            .from('whatsapp_accounts')
            .delete()
            .eq('user_id', user.id)
            .eq('session_name', sessionName);

          wahaResponse = { success: true };
        } else {
          const errorData = await deleteResponse.text();
          console.error('WAHA delete failed:', deleteResponse.status, errorData);
          wahaResponse = { success: false, error: `WAHA delete failed: ${errorData}` };
        }
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(wahaResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('WAHA session manager error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error as { message?: string }).message || 'Unknown error'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});