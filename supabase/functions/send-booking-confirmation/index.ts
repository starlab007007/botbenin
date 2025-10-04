import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BookingConfirmationRequest {
  name: string;
  email: string;
  phone: string;
  isCompany: string;
  companyType?: string;
  date: string;
  time: string;
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
    // Vérifier que la clé Resend existe
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY non configuré dans les secrets Supabase');
    }

    const resend = new Resend(resendApiKey);
    const requestData: BookingConfirmationRequest = await req.json();
    const { name, email, phone, isCompany, companyType, date, time } = requestData;

    console.log('Envoi email de confirmation de réservation:', {
      name,
      email,
      date,
      time,
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
        .info-row { margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 4px; }
        .label { font-weight: bold; color: #667eea; }
        .footer { background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>🎯 Nouvelle Réservation d'Audit IA</h2>
        </div>
        <div class="content">
            <h3>Informations de la réservation :</h3>
            
            <div class="info-row">
                <span class="label">👤 Nom :</span> ${name}
            </div>
            
            <div class="info-row">
                <span class="label">📧 Email :</span> ${email}
            </div>
            
            <div class="info-row">
                <span class="label">📱 Téléphone :</span> ${phone}
            </div>
            
            <div class="info-row">
                <span class="label">🏢 Type :</span> ${isCompany === 'oui' ? 'Entreprise' : companyType || 'Particulier'}
            </div>
            
            <div class="info-row">
                <span class="label">📅 Date :</span> ${date}
            </div>
            
            <div class="info-row">
                <span class="label">⏰ Heure :</span> ${time}
            </div>
            
            <div class="info-row">
                <span class="label">💻 Plateforme :</span> Google Meet
            </div>
            
            <div class="info-row">
                <span class="label">⏱️ Durée :</span> 45 minutes
            </div>
        </div>
        <div class="footer">
            <p>Cet email a été envoyé automatiquement depuis le système de réservation BJ Data.</p>
            <p><strong>Important :</strong> Pensez à créer le lien Google Meet et à contacter le client pour confirmer.</p>
        </div>
    </div>
</body>
</html>`;

    // Envoi de l'email via Resend
    console.log('Tentative d\'envoi via Resend à bot.bjdata@gmail.com...');
    
    const emailResult = await resend.emails.send({
      from: "BJ Data <onboarding@resend.dev>",
      to: ["bot.bjdata@gmail.com"],
      subject: `🎯 Nouvelle Réservation Audit IA - ${name} - ${date} à ${time}`,
      text: `Nouvelle réservation d'audit IA\n\nNom: ${name}\nEmail: ${email}\nTéléphone: ${phone}\nType: ${isCompany === 'oui' ? 'Entreprise' : companyType || 'Particulier'}\nDate: ${date}\nHeure: ${time}\nDurée: 45min\nPlateforme: Google Meet`,
      html: htmlMessage,
      headers: {
        'X-Entity-Ref-ID': `booking-${Date.now()}`,
      },
    });

    console.log('Email envoyé avec succès via Resend:', emailResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email de confirmation envoyé avec succès',
        email_id: emailResult.data?.id
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Erreur dans send-booking-confirmation:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Erreur lors de l\'envoi de l\'email de confirmation'
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
