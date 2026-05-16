import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WAHAWebhookMessage {
  event: string;
  session: string;
  me?: {
    id: string;
    pushName: string;
  };
  payload?: {
    id: string;
    timestamp: number;
    from: string;
    to: string;
    fromMe: boolean;
    body?: string;
    type: string;
    mediaUrl?: string;
  };
  engine?: string;
  environment?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const wahaBaseUrl = Deno.env.get('WAHA_BASE_URL');
    const wahaApiKey = Deno.env.get('WAHA_API_KEY');
    const waouhSession = (Deno.env.get('WAHA_SESSION') || 'WaouhApp').toLowerCase();

    // Use service role key for webhook processing
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const webhookData: WAHAWebhookMessage = await req.json();
    console.log('WAHA Webhook received:', JSON.stringify(webhookData, null, 2));

    const sessionName = webhookData.session;

    // WAOUH has its own commerce engine. If the WAHA session is the WAOUH number,
    // forward the incoming WhatsApp event directly to the WAOUH channel handler.
    if (
      webhookData.event === 'message' &&
      webhookData.payload &&
      !webhookData.payload.fromMe &&
      String(sessionName || '').toLowerCase() === waouhSession
    ) {
      const waouhRes = await fetch(`${supabaseUrl}/functions/v1/waouh-channel-in`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${supabaseServiceKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookData),
      });
      console.log('Forwarded WAOUH WhatsApp message:', waouhRes.status);
      return new Response('OK', { headers: corsHeaders });
    }

    // Find the WhatsApp account for this session
    const { data: account, error: accountError } = await supabase
      .from('whatsapp_accounts')
      .select('*')
      .eq('session_name', sessionName)
      .single();

    if (accountError || !account) {
      console.error('Account not found for session:', sessionName);
      return new Response('OK', { headers: corsHeaders });
    }

    // Handle different webhook events
    switch (webhookData.event) {
      case 'session.status':
        // Update session status
        const status = webhookData.payload?.body || 'unknown';
        console.log(`Session ${sessionName} status changed to: ${status}`);
        
        await supabase
          .from('whatsapp_accounts')
          .update({
            status: status === 'WORKING' ? 'connected' : 
                   status === 'SCAN_QR_CODE' ? 'connecting' : 'disconnected',
            phone_number: webhookData.me?.id || account.phone_number,
            last_activity: new Date().toISOString(),
          })
          .eq('id', account.id);
        break;

      case 'message':
        if (!webhookData.payload) break;

        const message = webhookData.payload;
        
        // Save message to database
        const { error: messageError } = await supabase
          .from('whatsapp_messages')
          .insert({
            whatsapp_account_id: account.id,
            message_id: message.id,
            from_number: message.from,
            to_number: message.to,
            message_type: message.type || 'text',
            content: message.body,
            media_url: message.mediaUrl,
            is_from_me: message.fromMe,
            is_bot_response: false,
            timestamp: new Date(message.timestamp * 1000).toISOString(),
            waha_raw_data: message,
          });

        if (messageError) {
          console.error('Failed to save message:', messageError);
        }

        // If message is not from user (incoming message), check for auto-response
        if (!message.fromMe) {
          // Get active bot links for this WhatsApp account
          const { data: botLinks } = await supabase
            .from('whatsapp_bot_links')
            .select(`
              *,
              bots (id, name, description, configuration)
            `)
            .eq('whatsapp_account_id', account.id)
            .eq('is_active', true)
            .eq('auto_response_enabled', true);

          if (botLinks && botLinks.length > 0) {
            // For now, use the first active bot link
            const botLink = botLinks[0];
            
            // Add delay before responding
            const delay = botLink.response_delay_seconds * 1000;
            
            setTimeout(async () => {
              try {
                // Send auto-response
                const responseMessage = botLink.welcome_message || 
                  `Bonjour! Je suis ${botLink.bots?.name || 'votre assistant IA'}. Comment puis-je vous aider?`;

                const sendResponse = await fetch(`${wahaBaseUrl}/api/sendText`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...(wahaApiKey ? { 'X-API-Key': wahaApiKey } : {}),
                  },
                  body: JSON.stringify({
                    session: sessionName,
                    chatId: message.from,
                    text: responseMessage,
                  }),
                });

                if (sendResponse.ok) {
                  const sentData = await sendResponse.json();
                  
                  // Save bot response to database
                  await supabase
                    .from('whatsapp_messages')
                    .insert({
                      whatsapp_account_id: account.id,
                      bot_link_id: botLink.id,
                      message_id: sentData.id || `bot-${Date.now()}`,
                      from_number: message.to,
                      to_number: message.from,
                      message_type: 'text',
                      content: responseMessage,
                      is_from_me: true,
                      is_bot_response: true,
                      timestamp: new Date().toISOString(),
                      waha_raw_data: sentData,
                    });

                  console.log(`Auto-response sent to ${message.from}`);
                }
              } catch (error) {
                console.error('Failed to send auto-response:', error);
              }
            }, delay);
          }
        }
        break;

      default:
        console.log('Unknown webhook event:', webhookData.event);
    }

    return new Response('OK', { headers: corsHeaders });

  } catch (error) {
    console.error('WAHA webhook error:', error);
    return new Response('Error', {
      status: 500,
      headers: corsHeaders,
    });
  }
});