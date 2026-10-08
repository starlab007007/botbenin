import { acceptExternalReceipt, trustedWahaWebhook } from '../_shared/waouh-external-receipt.ts';
import { CENTRAL_WAHA_SESSION, isWahaInbound } from '../_shared/waouh-central-whatsapp.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WAHAWebhookMessage {
  [key: string]: any;
  event: string;
  session: string;
  me?: {
    id: string;
    pushName: string;
  };
  payload?: {
    [key: string]: any;
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

const normalizeBeninPhone = (value?: string) => {
  const raw = String(value || '').replace(/@c\.us|@lid/g, '');
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('229')) return digits;
  if (digits.length === 8 || (digits.length === 10 && digits.startsWith('01'))) return `229${digits}`;
  return /^[1-9]\d{8,14}$/.test(digits) ? digits : null;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const wahaBaseUrl = Deno.env.get('WAHA_BASE_URL');
    const wahaApiKey = Deno.env.get('WAHA_API_KEY');
    const waouhSession = CENTRAL_WAHA_SESSION.toLowerCase();
    const waouhBusinessPhone = normalizeBeninPhone(Deno.env.get('WAOUH_BUSINESS_PHONE') || '65653468');

    // Use service role key for webhook processing
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const webhookData: WAHAWebhookMessage = await req.json();
    console.log('WAHA event', { event: webhookData.event, session: webhookData.session });

    const sessionName = webhookData.session;
    const payloadTo = normalizeBeninPhone(webhookData.payload?.to || webhookData.me?.id || '');
    const isWaouhTarget =
      String(sessionName || '').toLowerCase() === waouhSession;

    if (isWaouhTarget && !await trustedWahaWebhook(supabase, req, sessionName)) {
      return new Response('Unauthorized webhook', { status: 401, headers: corsHeaders });
    }

    // WAOUH has its own commerce engine. If the WAHA session is the WAOUH number,
    // forward the incoming WhatsApp event directly to the WAOUH channel handler.
    if (
      isWahaInbound(webhookData.event, webhookData.payload) &&
      isWaouhTarget
    ) {
      const waouhRes = await fetch(`${supabaseUrl}/functions/v1/waouh-channel-in`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${supabaseServiceKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookData),
      });
      console.log('Forwarded WAOUH WhatsApp message:', waouhRes.status);

      // Bridge: insert in-app notification for this WhatsApp inbound message.
      try {
        const waouhJson: any = await waouhRes.json().catch(() => ({}));
        const wahaMsgId: string = String(webhookData.payload?.id || '');
        const fromPhone = normalizeBeninPhone(webhookData.payload?.from || '');
        const text = webhookData.payload?.body || '';
        const convId = waouhJson?.conversation_id || null;
        const targetUserId = waouhJson?.user_id || null;

        if (wahaMsgId && targetUserId) {
          const dedupeKey = `wa_inbound:${wahaMsgId}`;
          const { error: notifErr } = await supabase.from('waouh_notifications').insert({
            user_id: targetUserId,
            conversation_id: convId,
            notification_type: 'wa_inbound',
            channel: 'whatsapp',
            dedupe_key: dedupeKey,
            payload: {
              text,
              from_phone: fromPhone,
              waha_message_id: wahaMsgId,
              conversation_id: convId,
              inbound_message_id: waouhJson?.inbound_message_id || null,
            },
          });
          if (notifErr && notifErr.code !== '23505') {
            console.error('wa_inbound notif insert failed:', notifErr);
          }
        }
      } catch (e) {
        console.error('wa_inbound notif bridge failed:', e);
      }

      return new Response(waouhRes.ok ? 'OK' : 'Relay failed', { status: waouhRes.ok ? 200 : 502, headers: corsHeaders });
    }

    // ===== WAOUH AI Agent bridge: if the session matches a user-created AI agent, forward =====
    if (
      webhookData.event === 'message' &&
      webhookData.payload &&
      !webhookData.payload.fromMe
    ) {
      const { data: agent } = await supabase
        .from('waouh_ai_agents')
        .select('id')
        .eq('waha_session_name', sessionName)
        .eq('status', 'active')
        .maybeSingle();
      if (agent?.id) {
        fetch(`${supabaseUrl}/functions/v1/waouh-agent-webhook`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${supabaseServiceKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent_id: agent.id, session: sessionName, payload: webhookData.payload }),
        }).catch((e) => console.error('agent webhook forward failed', e));
        return new Response('OK', { headers: corsHeaders });
      }
    }

    // ===== ACK events: update wa_send_jobs delivery / read status =====
    // WAHA ack codes: -1=ERROR, 0=PENDING, 1=SERVER(sent), 2=DEVICE(delivered), 3=READ, 4=PLAYED
    if (webhookData.event === 'message.ack' || String(webhookData.event || '').includes('ack')) {
      await acceptExternalReceipt(supabase,req,sessionName,webhookData.payload || {});
      const p: any = webhookData.payload || {};
      const msgId: string | null =
        (typeof p.id === 'string' ? p.id : null) ??
        p?.id?._serialized ?? p?.messageId ?? p?.ack?.id ?? null;
      const ackRaw = p?.ack ?? p?.ackName ?? p?.status;
      const ackNum = typeof ackRaw === 'string' ? parseInt(ackRaw) : ackRaw;
      const ackName = String(p?.ackName ?? '').toLowerCase();

      let status: string | null = null;
      const update: any = {};
      if (ackNum === 1 || ackName === 'server' || ackName === 'sent') { status = 'sent'; update.sent_at = new Date().toISOString(); }
      else if (ackNum === 2 || ackName === 'device' || ackName === 'delivered') { status = 'delivered'; update.delivered_at = new Date().toISOString(); }
      else if (ackNum === 3 || ackNum === 4 || ackName === 'read' || ackName === 'played') { status = 'read'; update.read_at = new Date().toISOString(); update.delivered_at = update.delivered_at ?? new Date().toISOString(); }
      else if (ackNum === -1 || ackName === 'error') { status = 'failed'; update.last_error = 'WAHA ack error'; }

      if (status && msgId) {
        update.status = status;
        const { error: ackErr } = await supabase
          .from('wa_send_jobs')
          .update(update)
          .eq('waha_message_id', msgId);
        if (ackErr) console.error('ack update failed:', ackErr);
        else console.log(`ACK ${status} applied to message ${msgId}`);
      }
      return new Response('OK', { headers: corsHeaders });
    }

    // ===== Inbound message (reply detection) =====
    if (
      (webhookData.event === 'message' || webhookData.event === 'message.any') &&
      webhookData.payload && webhookData.payload.fromMe === false
    ) {
      const from = String(webhookData.payload.from || '').replace(/@c\.us|@lid/g, '').replace(/\D/g, '');
      if (from) {
        const { data: rj } = await supabase
          .from('wa_send_jobs')
          .select('id')
          .or(`to_phone.eq.${from},to_phone.eq.+${from}`)
          .in('status', ['sent', 'delivered', 'read'])
          .order('sent_at', { ascending: false })
          .limit(1);
        if (rj && rj[0]) {
          await supabase.from('wa_send_jobs').update({
            status: 'replied',
            replied_at: new Date().toISOString(),
          }).eq('id', rj[0].id);
        }
      }
    }

    // Find the WhatsApp account for this session
    const { data: account, error: accountError } = await supabase
      .from('whatsapp_accounts')
      .select('*')
      .eq('session_name', sessionName)
      .single();

    if (accountError || !account) {
      console.log('No whatsapp_account for session (ok for diffusion-only):', sessionName);
      return new Response('OK', { headers: corsHeaders });
    }

    // Handle different webhook events
    switch (webhookData.event) {
      case 'session.status': {
        // WAHA 2026 emits the canonical state in payload.status. Keep body/state
        // as backward-compatible fallbacks for older engines.
        const rawStatus = String(
          webhookData.payload?.status ??
          webhookData.payload?.state ??
          webhookData.payload?.body ??
          webhookData.status ??
          'UNKNOWN'
        ).trim().toUpperCase();
        const connectedStates = new Set(['WORKING', 'AUTHENTICATED', 'READY', 'CONNECTED']);
        const connectingStates = new Set(['SCAN_QR_CODE', 'STARTING', 'CONNECTING']);
        const databaseStatus = connectedStates.has(rawStatus)
          ? 'connected'
          : connectingStates.has(rawStatus)
            ? 'connecting'
            : rawStatus === 'FAILED' || rawStatus === 'ERROR'
              ? 'error'
              : 'disconnected';

        console.log(`Session ${sessionName} status changed`, {
          raw_status: rawStatus,
          database_status: databaseStatus,
        });
        
        await supabase
          .from('whatsapp_accounts')
          .update({
            status: databaseStatus,
            phone_number: webhookData.me?.id || account.phone_number,
            last_activity: new Date().toISOString(),
          })
          .eq('id', account.id);
        break;
      }

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
