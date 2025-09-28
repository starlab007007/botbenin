import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_SERVICE_ACCOUNT_KEY = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    
    if (!GOOGLE_SERVICE_ACCOUNT_KEY) {
      return new Response(
        JSON.stringify({ 
          error: 'GOOGLE_SERVICE_ACCOUNT_KEY non configuré',
          instructions: 'Veuillez configurer la clé de compte de service Google dans les secrets Supabase'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    let serviceAccount;
    try {
      serviceAccount = JSON.parse(GOOGLE_SERVICE_ACCOUNT_KEY);
    } catch (parseError) {
      return new Response(
        JSON.stringify({ 
          error: 'Format JSON invalide pour GOOGLE_SERVICE_ACCOUNT_KEY',
          details: parseError.message
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!serviceAccount.client_email) {
      return new Response(
        JSON.stringify({ 
          error: 'client_email manquant dans la clé de service',
          availableFields: Object.keys(serviceAccount)
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Informations du service account:', {
      client_email: serviceAccount.client_email,
      project_id: serviceAccount.project_id,
      type: serviceAccount.type
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        service_account_email: serviceAccount.client_email,
        project_id: serviceAccount.project_id,
        type: serviceAccount.type,
        instructions: {
          step1: "Copiez l'email du service account ci-dessus",
          step2: "Ouvrez votre document Google: https://docs.google.com/document/d/1TXeYy0iEw8HTiGkzv8HZzDShg0Vmjnn7kcIE8SpIhmg/edit",
          step3: "Cliquez sur 'Partager' en haut à droite",
          step4: "Collez l'email du service account et donnez les permissions 'Éditeur'",
          step5: "Cliquez sur 'Envoyer' pour partager le document"
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Erreur dans google-account-info:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erreur lors de la récupération des informations du compte de service',
        details: error?.message || 'Erreur inconnue'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});