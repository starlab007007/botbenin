import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prospects, qualificationType = 'email' } = await req.json();

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
      try {
        let result = { prospectId: prospect.id, status: 'pending', method: qualificationType };

        switch (qualificationType) {
          case 'email':
            result = await sendQualificationEmail(prospect, RESEND_API_KEY);
            break;
          case 'sms':
            result = await sendQualificationSMS(prospect);
            break;
          case 'whatsapp':
            result = await sendQualificationWhatsApp(prospect);
            break;
          default:
            result.status = 'error';
            result.error = 'Type de qualification non supporté';
        }

        results.push(result);
      } catch (error) {
        console.error(`Error qualifying prospect ${prospect.id}:`, error);
        results.push({
          prospectId: prospect.id,
          status: 'error',
          error: error.message,
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
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function sendQualificationEmail(prospect: any, apiKey: string) {
  try {
    const emailTemplate = `
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

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'noreply@ia-business.com',
        to: [prospect.email],
        subject: `Opportunité IA pour ${prospect.company}`,
        text: emailTemplate,
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
      error: error.message
    };
  }
}

async function sendQualificationSMS(prospect: any) {
  // SMS functionality would require Twilio integration
  // For now, return a mock response
  console.log(`SMS qualification for ${prospect.name} at ${prospect.phone}`);
  
  return {
    prospectId: prospect.id,
    status: 'success',
    method: 'sms',
    message: 'SMS de qualification envoyé (fonctionnalité simulée)',
    sentTo: prospect.phone
  };
}

async function sendQualificationWhatsApp(prospect: any) {
  // WhatsApp functionality would require WhatsApp Business API
  // For now, return a mock response
  console.log(`WhatsApp qualification for ${prospect.name} at ${prospect.phone}`);
  
  return {
    prospectId: prospect.id,
    status: 'success',
    method: 'whatsapp',
    message: 'Message WhatsApp de qualification envoyé (fonctionnalité simulée)',
    sentTo: prospect.phone
  };
}