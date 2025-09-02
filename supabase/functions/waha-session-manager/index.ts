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
    const wahaBaseUrl = Deno.env.get('WAHA_BASE_URL');
    const wahaApiKey = Deno.env.get('WAHA_API_KEY');

    if (!wahaBaseUrl || !wahaApiKey) {
      throw new Error('WAHA configuration missing');
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

    // Build multiple auth header variants to handle different WAHA setups
    const buildHeaders = (extra: Record<string, string> = {}) => [
      { 'Content-Type': 'application/json', 'X-API-Key': wahaApiKey!, ...extra },
      { 'Content-Type': 'application/json', 'X-API-KEY': wahaApiKey!, ...extra },
      { 'Content-Type': 'application/json', 'x-api-key': wahaApiKey!, ...extra },
      { 'Content-Type': 'application/json', 'Authorization': `Bearer ${wahaApiKey}`!, ...extra },
    ];

    const wahaFetch = async (endpoint: string, init: RequestInit = {}) => {
      // Try all header variants; return on first non-401/403 or last response
      let lastRes: Response | null = null;
      for (const headers of buildHeaders(init.headers as Record<string,string>)) {
        const res = await fetch(`${wahaBaseUrl}${endpoint}`, { ...init, headers });
        if (res.status !== 401 && res.status !== 403) return res;
        lastRes = res;
      }
      return lastRes!;
    };

    let wahaResponse: WAHAResponse = { success: false };
    switch (action) {
      case 'create':
        // Create session in WAHA
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
        } else {
          const errorData = await createResponse.text();
          console.error('WAHA create failed:', createResponse.status, errorData);
          wahaResponse = { success: false, error: `WAHA create failed: ${errorData}`, data: { status: createResponse.status } };
        }
        break;

      case 'start':
        // Start session in WAHA
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
          wahaResponse = { success: false, error: `WAHA start failed: ${errorData}`, data: { status: startResponse.status } };
        }
        break;

      case 'qr':
        // Get QR code from WAHA
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
          wahaResponse = { success: false, error: `QR fetch failed: ${errorData}`, data: { status: qrResponse.status } };
        }
        break;

      case 'status':
        // Get session status from WAHA
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
          wahaResponse = { success: false, error: 'Session not found', data: { status: statusResponse.status } };
        }
        break;

      case 'stop':
        // Stop session in WAHA
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
          wahaResponse = { success: false, error: `WAHA stop failed: ${errorData}`, data: { status: stopResponse.status } };
        }
        break;

      case 'delete':
        // Delete session from WAHA
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
          wahaResponse = { success: false, error: `WAHA delete failed: ${errorData}`, data: { status: deleteResponse.status } };
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