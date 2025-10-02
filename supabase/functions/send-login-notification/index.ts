import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface LoginNotificationRequest {
  email: string;
  name: string;
  provider: string;
  loginTime: string;
  ipAddress?: string;
  userAgent?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      email, 
      name, 
      provider, 
      loginTime,
      ipAddress,
      userAgent 
    }: LoginNotificationRequest = await req.json();

    const emailResponse = await resend.emails.send({
      from: "Bot.bj <onboarding@resend.dev>",
      to: [email],
      subject: "✅ Connexion réussie à Bot.bj",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                text-align: center;
                border-radius: 10px 10px 0 0;
              }
              .content {
                background: #ffffff;
                padding: 30px;
                border: 1px solid #e1e4e8;
                border-top: none;
              }
              .info-box {
                background: #f6f8fa;
                border-left: 4px solid #667eea;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
              }
              .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e1e4e8;
                color: #666;
                font-size: 12px;
              }
              .button {
                display: inline-block;
                padding: 12px 24px;
                background: #667eea;
                color: white;
                text-decoration: none;
                border-radius: 6px;
                margin: 20px 0;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>🎉 Connexion Réussie</h1>
            </div>
            <div class="content">
              <h2>Bonjour ${name || 'Utilisateur'} !</h2>
              
              <p>Nous vous confirmons que vous venez de vous connecter avec succès à votre compte <strong>Bot.bj</strong>.</p>
              
              <div class="info-box">
                <p style="margin: 5px 0;"><strong>📅 Date et heure :</strong> ${new Date(loginTime).toLocaleString('fr-FR')}</p>
                <p style="margin: 5px 0;"><strong>🔐 Méthode :</strong> ${provider === 'google' ? 'Google OAuth' : provider}</p>
                ${ipAddress ? `<p style="margin: 5px 0;"><strong>🌐 Adresse IP :</strong> ${ipAddress}</p>` : ''}
                ${userAgent ? `<p style="margin: 5px 0;"><strong>💻 Appareil :</strong> ${userAgent.substring(0, 50)}...</p>` : ''}
              </div>
              
              <p>Si cette connexion n'était pas vous, veuillez sécuriser votre compte immédiatement en changeant votre mot de passe.</p>
              
              <center>
                <a href="https://ia.bot.bj" class="button">Accéder à votre tableau de bord</a>
              </center>
              
              <p style="margin-top: 30px;">Vous avez maintenant accès à toutes les fonctionnalités de Bot.bj pour créer et gérer vos assistants IA intelligents.</p>
            </div>
            
            <div class="footer">
              <p>Cet email a été envoyé automatiquement par <strong>Bot.bj</strong></p>
              <p>© ${new Date().getFullYear()} Bot.bj - Tous droits réservés</p>
            </div>
          </body>
        </html>
      `,
    });

    if (emailResponse.error) {
      throw emailResponse.error;
    }

    console.log("Login notification sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true,
      messageId: emailResponse.data?.id 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending login notification:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);
