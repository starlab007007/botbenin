import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { docId, content, userId } = await req.json();
    
    if (!docId || !content) {
      return new Response(
        JSON.stringify({ error: 'ID du document ou contenu manquant' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Écriture dans le Google Doc:', {
      docId,
      contentLength: content.length,
      userId
    });

    // Pour le moment, on simule l'écriture dans un document
    // En production, ceci devrait utiliser l'API Google Docs avec OAuth
    
    // Simulation d'un délai d'écriture
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('Contenu simulé sauvegardé avec succès');

    return new Response(
      JSON.stringify({ 
        success: true,
        docId,
        userId,
        timestamp: new Date().toISOString(),
        message: 'Document synchronisé avec succès (mode simulation)'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Erreur dans google-docs-writer:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erreur lors de l\'écriture du document Google',
        details: error?.message || 'Erreur inconnue'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});