import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface ContactRequest {
  sessionName: string;
  phoneNumber: string;
  action: 'block' | 'unblock' | 'get_info' | 'get_profile_picture';
}

interface ContactResponse {
  success: boolean;
  data?: any;
  error?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get configuration from environment
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const wahaBaseUrl = Deno.env.get('WAHA_BASE_URL') || 'https://waha.bot.bj';
    const wahaApiKey = Deno.env.get('WAHA_API_KEY');

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user session
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid auth token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { sessionName, phoneNumber, action }: ContactRequest = await req.json();

    if (!sessionName || !phoneNumber || !action) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Helper function to make WAHA API calls
    const wahaFetch = async (endpoint: string, options: RequestInit = {}) => {
      const url = `${wahaBaseUrl}/api${endpoint}`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...((options.headers as Record<string, string>) || {}),
      };

      // Add authentication if available
      if (wahaApiKey) {
        headers['X-Api-Key'] = wahaApiKey;
      }

      console.log(`Making WAHA API call to: ${url}`);

      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`WAHA API error (${response.status}):`, errorText);
        throw new Error(`WAHA API error: ${response.status} - ${errorText}`);
      }

      return response.json();
    };

    let result: ContactResponse;

    try {
      switch (action) {
        case 'block':
          // Block contact in WAHA
          await wahaFetch(`/${sessionName}/contacts/block`, {
            method: 'POST',
            body: JSON.stringify({
              contactId: phoneNumber,
            }),
          });

          // Update contact in database
          await supabase
            .from('whatsapp_contacts')
            .upsert({
              session_name: sessionName,
              phone_number: phoneNumber,
              is_blocked: true,
              metadata: { blocked_at: new Date().toISOString() },
            });

          result = { success: true, data: { blocked: true } };
          break;

        case 'unblock':
          // Unblock contact in WAHA
          await wahaFetch(`/${sessionName}/contacts/unblock`, {
            method: 'POST',
            body: JSON.stringify({
              contactId: phoneNumber,
            }),
          });

          // Update contact in database
          await supabase
            .from('whatsapp_contacts')
            .update({
              is_blocked: false,
              metadata: { unblocked_at: new Date().toISOString() },
            })
            .eq('session_name', sessionName)
            .eq('phone_number', phoneNumber);

          result = { success: true, data: { blocked: false } };
          break;

        case 'get_info':
          // Get contact info from WAHA
          const contactInfo = await wahaFetch(`/${sessionName}/contacts/${phoneNumber}`);

          // Update contact in database
          await supabase
            .from('whatsapp_contacts')
            .upsert({
              session_name: sessionName,
              phone_number: phoneNumber,
              name: contactInfo.name || contactInfo.pushname,
              is_contact: contactInfo.isContact || false,
              metadata: contactInfo,
              last_seen: new Date().toISOString(),
            });

          result = { success: true, data: contactInfo };
          break;

        case 'get_profile_picture':
          // Get profile picture from WAHA
          const profilePic = await wahaFetch(`/${sessionName}/contacts/${phoneNumber}/profile-picture`);

          // Update contact with profile picture
          await supabase
            .from('whatsapp_contacts')
            .update({
              profile_picture: profilePic.url,
            })
            .eq('session_name', sessionName)
            .eq('phone_number', phoneNumber);

          result = { success: true, data: profilePic };
          break;

        default:
          result = { success: false, error: `Unknown action: ${action}` };
      }

    } catch (wahaError: any) {
      console.error(`WAHA operation failed for ${action}:`, wahaError);
      result = {
        success: false,
        error: `WAHA operation failed: ${wahaError.message}`,
      };
    }

    return new Response(
      JSON.stringify(result),
      {
        status: result.success ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Contact management error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});