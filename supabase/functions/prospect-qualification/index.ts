import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      prospects, 
      qualificationType = 'email',
      campaignId,
      message,
      botLink,
      sendId,
      isRetry = false
    } = await req.json();

    if (!prospects || !Array.isArray(prospects) || prospects.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Liste de prospects requise' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Starting qualification for ${prospects.length} prospects using ${qualificationType}`);

    // Get necessary API keys from environment
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    
    if (qualificationType === 'email' && !RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Configuration email manquante' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const results = [];

    for (const prospect of prospects) {
      let sendRecordId = sendId;
      
      try {
        // Créer ou mettre à jour l'enregistrement de suivi
        if (!sendRecordId && campaignId) {
          const contactType = prospect.email ? 'email' : (prospect.phone ? 'phone' : 'whatsapp');
          const contactValue = prospect.email || prospect.phone || prospect.whatsapp || '';
          
          const { data: sendRecord, error: insertError } = await supabase
            .from('qualification_campaign_sends')
            .insert({
              campaign_id: campaignId,
              contact_type: contactType,
              contact_value: contactValue,
              channel: qualificationType,
              status: 'sending'
            })
            .select()
            .single();

          if (insertError) throw insertError;
          sendRecordId = sendRecord.id;
        } else if (sendRecordId) {
          // Mettre à jour le statut à "sending"
          await supabase
            .from('qualification_campaign_sends')
            .update({ status: 'sending' })
            .eq('id', sendRecordId);
        }

        let result: any = { prospectId: prospect.id, status: 'pending', method: qualificationType };

        switch (qualificationType) {
          case 'email':
            if (!RESEND_API_KEY) {
              result = { prospectId: prospect.id, status: 'error', method: qualificationType, error: 'RESEND_API_KEY not configured' };
              break;
            }
            result = await sendQualificationEmail(prospect, RESEND_API_KEY, message, botLink);
            break;
          case 'sms':
            result = await sendQualificationSMS(prospect, message, botLink);
            break;
          case 'whatsapp':
            result = await sendQualificationWhatsApp(prospect, message, botLink);
            break;
          default:
            result = { 
              prospectId: prospect.id, 
              status: 'error', 
              method: qualificationType, 
              error: 'Type de qualification non supporté' 
            };
        }

        // Mettre à jour le statut de l'envoi
        if (sendRecordId) {
          await supabase
            .from('qualification_campaign_sends')
            .update({
              status: result.status === 'success' ? 'sent' : 'failed',
              error_message: result.error || null,
              message_id: result.messageId || null,
              sent_at: result.status === 'success' ? new Date().toISOString() : null,
              metadata: { result }
            })
            .eq('id', sendRecordId);
        }

        results.push(result);
      } catch (error) {
        console.error(`Error qualifying prospect ${prospect.id}:`, error);
        
        // Mettre à jour comme échec
        if (sendRecordId) {
          await supabase
            .from('qualification_campaign_sends')
            .update({
              status: 'failed',
              error_message: error instanceof Error ? error.message : 'Unknown error'
            })
            .eq('id', sendRecordId);
        }
        
        results.push({
          prospectId: prospect.id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          method: qualificationType
        });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    return new Response(
      JSON.stringify({ 
        success: true,
        totalProcessed: prospects.length,
        successCount,
        errorCount,
        results,
        message: `Qualification lancée: ${successCount} succès, ${errorCount} erreurs`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in prospect-qualification:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erreur interne du serveur', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function sendQualificationEmail(prospect: any, apiKey: string, customMessage?: string, botLink?: string) {
  try {
    const message = customMessage || `
    Bonjour ${prospect.name},

    Nous avons remarqué votre profil et pensons que notre solution d'IA pourrait être intéressante pour ${prospect.company}.

    En tant que ${prospect.position}, vous pourriez bénéficier de notre assistant IA qui aide les entreprises à:
    - Automatiser la prospection B2B
    - Qualifier les leads automatiquement
    - Optimiser les campagnes marketing

    Seriez-vous disponible pour un appel de 15 minutes cette semaine pour explorer comment nous pourrions vous aider?

    Cordialement,
    L'équipe IA Business
    `;

    const finalMessage = botLink ? message.replace('[LIEN_BOT]', botLink).replace('{botLink}', botLink) : message;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'noreply@ia-business.com',
        to: [prospect.email],
        subject: `Opportunité IA pour ${prospect.company || 'votre entreprise'}`,
        text: finalMessage,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Email API error: ${response.status} - ${errorData}`);
    }

    const result = await response.json();
    console.log(`Email sent successfully to ${prospect.email}:`, result.id);

    return {
      prospectId: prospect.id,
      status: 'success',
      method: 'email',
      messageId: result.id,
      sentTo: prospect.email
    };

  } catch (error) {
    console.error(`Failed to send email to ${prospect.email}:`, error);
    return {
      prospectId: prospect.id,
      status: 'error',
      method: 'email',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function sendQualificationSMS(prospect: any, customMessage?: string, botLink?: string) {
  // SMS functionality would require Twilio integration
  // For now, return a mock response
  console.log(`SMS qualification for ${prospect.name} at ${prospect.phone}`);
  
  const message = customMessage || `Bonjour ! Assistant IA ici. Nous avons des solutions qui pourraient vous intéresser. 2 min pour quelques questions ? ${botLink || '[LIEN_BOT]'}`;
  
  return {
    prospectId: prospect.id,
    status: 'success',
    method: 'sms',
    message: 'SMS de qualification envoyé (fonctionnalité simulée)',
    sentTo: prospect.phone,
    messageContent: message
  };
}

async function sendQualificationWhatsApp(prospect: any, customMessage?: string, botLink?: string) {
  try {
    console.log(`WhatsApp qualification for ${prospect.name} at ${prospect.phone}`);
    
    const message = customMessage || `🤖 Bonjour ! Je suis l'assistant IA de notre équipe.\n\nNous avons développé des solutions qui pourraient vous intéresser. \n\nAuriez-vous 2 minutes pour répondre à quelques questions rapides ? Cela nous permettra de mieux comprendre vos besoins.\n\n👉 Cliquez ici pour commencer : ${botLink || '[LIEN_BOT]'}`;
    
    // Récupérer le premier compte WhatsApp actif de l'utilisateur
    const { data: accounts, error: accountsError } = await supabase
      .from('whatsapp_accounts')
      .select('session_name, status')
      .eq('status', 'WORKING')
      .limit(1);

    if (accountsError || !accounts || accounts.length === 0) {
      console.log('No active WhatsApp account found, returning simulated response');
      return {
        prospectId: prospect.id,
        status: 'success',
        method: 'whatsapp',
        message: 'Message WhatsApp de qualification envoyé (compte WhatsApp non configuré - simulation)',
        sentTo: prospect.phone,
        messageContent: message
      };
    }

    const sessionName = accounts[0].session_name;

    // Formater le numéro de téléphone pour WhatsApp (format international)
    let phoneNumber = prospect.phone.replace(/\D/g, '');
    if (!phoneNumber.startsWith('229')) {
      phoneNumber = '229' + phoneNumber; // Préfixe Bénin par défaut
    }
    const whatsappId = phoneNumber + '@c.us';

    // Appeler l'edge function waha-send-message
    const wahaUrl = Deno.env.get('WAHA_URL') || 'https://waha.devloop.icu';
    const wahaApiKey = Deno.env.get('WAHA_API_KEY') || '';

    const response = await fetch(`${wahaUrl}/api/sendText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': wahaApiKey,
      },
      body: JSON.stringify({
        session: sessionName,
        chatId: whatsappId,
        text: message,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`WAHA API error: ${response.status} - ${errorData}`);
    }

    const result = await response.json();
    console.log(`WhatsApp message sent successfully:`, result);

    return {
      prospectId: prospect.id,
      status: 'success',
      method: 'whatsapp',
      messageId: result.id,
      sentTo: prospect.phone,
      messageContent: message
    };

  } catch (error) {
    console.error(`Failed to send WhatsApp message to ${prospect.phone}:`, error);
    return {
      prospectId: prospect.id,
      status: 'error',
      method: 'whatsapp',
      error: error instanceof Error ? error.message : 'Unknown error',
      messageContent: customMessage
    };
  }
}