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

    const wahaHeaders = {
      'Content-Type': 'application/json',
      'X-API-Key': wahaApiKey,
    };

    let wahaEndpoint = '';
    let wahaPayload: any = {
      session: sessionName,
      chatId: to,
    };

    switch (messageType) {
      case 'text':
        wahaEndpoint = `${wahaBaseUrl}/api/sendText`;
        wahaPayload.text = message;
        break;
      
      case 'image':
        wahaEndpoint = `${wahaBaseUrl}/api/sendImage`;
        wahaPayload.file = { url: mediaUrl };
        wahaPayload.caption = message;
        break;
      
      case 'file':
        wahaEndpoint = `${wahaBaseUrl}/api/sendFile`;
        wahaPayload.file = { url: mediaUrl };
        wahaPayload.caption = message;
        break;
      
      default:
        throw new Error(`Unsupported message type: ${messageType}`);
    }

    console.log(`Sending ${messageType} message via WAHA:`, wahaPayload);

    const wahaResponse = await fetch(wahaEndpoint, {
      method: 'POST',
      headers: wahaHeaders,
      body: JSON.stringify(wahaPayload),
    });

    if (!wahaResponse.ok) {
      const errorData = await wahaResponse.text();
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
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});