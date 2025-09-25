import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QualificationEmailRequest {
  to: string;
  subject: string;
  message: string;
  senderInfo: string;
  botLink: string;
  contactName: string;
  companyName: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestData: QualificationEmailRequest = await req.json();
    const { to, subject, message, senderInfo, botLink, contactName, companyName } = requestData;

    console.log('Envoi email qualification:', {
      to,
      subject,
      from: 'bot.bjdata@gmail.com',
      timestamp: new Date().toISOString()
    });

    // Construction du message email HTML
    const htmlMessage = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #fff; padding: 30px; border: 1px solid #ddd; }
        .bot-link { background: #667eea; color: white; padding: 15px 25px; text-align: center; border-radius: 8px; margin: 20px 0; }
        .bot-link a { color: white; text-decoration: none; font-weight: bold; }
        .footer { background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>🤖 Qualification Automatisée avec Bot IA</h2>
        </div>
        <div class="content">
            ${message.replace(/\n/g, '<br>').replace(botLink, `
            <div class="bot-link">
                <a href="${botLink}" target="_blank">
                    👉 Cliquez ici pour commencer la qualification avec notre Bot IA
                </a>
            </div>
            `)}
        </div>
        <div class="footer">
            <p>Cet email a été envoyé automatiquement par notre système de qualification IA.</p>
            <p>Pour vous désabonner, répondez avec "STOP" à cet email.</p>
        </div>
    </div>
</body>
</html>`;

    // Vérifier que le mot de passe Gmail existe
    const gmailPassword = Deno.env.get('GMAIL_APP_PASSWORD');
    if (!gmailPassword) {
      throw new Error('GMAIL_APP_PASSWORD non configuré dans les secrets Supabase');
    }

    // Configuration SMTP Gmail
    const client = new SmtpClient();
    
    console.log('Tentative de connexion SMTP Gmail...');
    
    try {
      await client.connectTLS({
        hostname: "smtp.gmail.com",
        port: 587,
        username: "bot.bjdata@gmail.com",
        password: gmailPassword,
      });
      console.log('Connexion SMTP établie avec succès');

      // Envoi de l'email via SMTP
      console.log('Envoi de l\'email vers:', to);
      
      const emailResult = await client.send({
        from: "BJ Data <bot.bjdata@gmail.com>",
        to: to,
        subject: subject,
        content: message, // Message texte brut
        html: htmlMessage, // Version HTML
      });
      
      console.log('Email envoyé avec succès, résultat:', emailResult);
      
      await client.close();
      console.log('Connexion SMTP fermée');
      
    } catch (smtpError: any) {
      console.error('Erreur SMTP détaillée:', {
        message: smtpError.message,
        stack: smtpError.stack,
        code: smtpError.code
      });
      
      try {
        await client.close();
      } catch (closeError) {
        console.error('Erreur fermeture SMTP:', closeError);
      }
      
      throw new Error(`Échec envoi SMTP: ${smtpError.message}`);
    }

    console.log('Email envoyé avec succès:', to);

    // Logging de l'activité
    const { error: logError } = await supabase
      .from('qualification_emails')
      .insert({
        recipient_email: to,
        subject: subject,
        message: message,
        bot_link: botLink,
        contact_name: contactName,
        company_name: companyName,
        sender_info: senderInfo,
        sent_at: new Date().toISOString(),
        status: 'sent'
      });

    if (logError) {
      console.error('Erreur logging email:', logError);
      // Ne pas bloquer l'envoi même si le logging échoue
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email de qualification envoyé avec succès',
        recipient: to,
        bot_link: botLink
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Erreur dans send-qualification-email:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Erreur lors de l\'envoi de l\'email de qualification'
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);