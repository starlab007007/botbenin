import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendMessageRequest {
  sessionName: string;
  to: string;
  message: string;
  messageType?: 'text' | 'image' | 'file';
  mediaUrl?: string;
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
    const wahaDashUser = Deno.env.get('WAHA_DASHBOARD_USERNAME');
    const wahaDashPass = Deno.env.get('WAHA_DASHBOARD_PASSWORD');

    // Clean base URL (remove trailing slash and /dashboard path)
    if (wahaBaseUrl) {
      wahaBaseUrl = wahaBaseUrl.replace(/\/$/, '').replace(/\/dashboard$/, '');
    }

    if (!wahaBaseUrl || (!wahaApiKey && !wahaApiKeyPlain && !(wahaDashUser && wahaDashPass))) {
      throw new Error('WAHA configuration missing: set WAHA_API_KEY or WAHA_API_KEY_PLAIN or dashboard credentials');
    }

    const buildHeaders = (extra: Record<string, string> = {}) => {
      const variants: Record<string, string>[] = [];
      const keyToUse = (wahaApiKeyPlain && wahaApiKeyPlain.length > 0) ? wahaApiKeyPlain : (wahaApiKey || '');
      if (keyToUse) {
        variants.push(
          { 'Content-Type': 'application/json', 'X-Api-Key': keyToUse, ...extra },
          { 'Content-Type': 'application/json', 'X-API-Key': keyToUse, ...extra },
          { 'Content-Type': 'application/json', 'X-API-KEY': keyToUse, ...extra },
          { 'Content-Type': 'application/json', 'x-api-key': keyToUse, ...extra },
          { 'Content-Type': 'application/json', 'Authorization': `ApiKey ${keyToUse}`, ...extra },
          { 'Content-Type': 'application/json', 'Authorization': `Bearer ${keyToUse}`, ...extra },
        );
      }
      if (wahaDashUser && wahaDashPass) {
        const basic = `Basic ${btoa(`${wahaDashUser}:${wahaDashPass}`)}`;
        variants.push({ 'Content-Type': 'application/json', 'Authorization': basic, ...extra });
      }
      return variants;
    };

    const wahaFetch = async (endpoint: string, init: RequestInit = {}) => {
      const headersVariants = buildHeaders(init.headers as Record<string,string>);
      let lastRes: Response | null = null;
      for (let i = 0; i < headersVariants.length; i++) {
        const headers = headersVariants[i];
        try {
          const res = await fetch(`${wahaBaseUrl}${endpoint}`, { ...init, headers });
          if (res.ok || (res.status >= 400 && res.status < 500 && res.status !== 401 && res.status !== 403)) {
            return res;
          }
          lastRes = res;
        } catch (e) {
          if (i === headersVariants.length - 1) throw e;
        }
      }
      return lastRes!;
    };

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

    const { sessionName, to, message, messageType = 'text', mediaUrl }: SendMessageRequest = await req.json();

    // Verify user owns this WhatsApp session
    const { data: account, error: accountError } = await supabase
      .from('whatsapp_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('session_name', sessionName)
      .single();

    if (accountError || !account) {
      throw new Error('WhatsApp account not found or unauthorized');
    }

    let wahaEndpoint = '';
    let wahaPayload: any = {
      session: sessionName,
      chatId: to,
    };

    switch (messageType) {
      case 'text':
        wahaEndpoint = `/api/sendText`;
        wahaPayload.text = message;
        break;
      case 'image':
        wahaEndpoint = `/api/sendImage`;
        wahaPayload.file = { url: mediaUrl };
        wahaPayload.caption = message;
        break;
      case 'file':
        wahaEndpoint = `/api/sendFile`;
        wahaPayload.file = { url: mediaUrl };
        wahaPayload.caption = message;
        break;
      default:
        throw new Error(`Unsupported message type: ${messageType}`);
    }

    console.log(`Sending ${messageType} message via WAHA:`, wahaPayload);

    const wahaResponse = await wahaFetch(wahaEndpoint, {
      method: 'POST',
      body: JSON.stringify(wahaPayload),
    });

    if (!wahaResponse || !wahaResponse.ok) {
      const errorData = wahaResponse ? await wahaResponse.text() : 'no response';
      throw new Error(`WAHA send failed: ${errorData}`);
    }

    const sentData = await wahaResponse.json();
    console.log('Message sent successfully:', sentData);

    // Save sent message to database
    const { error: dbError } = await supabase
      .from('whatsapp_messages')
      .insert({
        whatsapp_account_id: account.id,
        message_id: sentData.id || `manual-${Date.now()}`,
        from_number: account.phone_number || sessionName,
        to_number: to,
        message_type: messageType,
        content: message,
        media_url: mediaUrl,
        is_from_me: true,
        is_bot_response: false,
        timestamp: new Date().toISOString(),
        waha_raw_data: sentData,
      });

    if (dbError) {
      console.error('Failed to save sent message:', dbError);
    }

    return new Response(JSON.stringify({
      success: true,
      data: sentData,
      messageId: sentData.id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('WAHA send message error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});