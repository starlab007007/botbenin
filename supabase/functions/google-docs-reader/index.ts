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
    const { docId } = await req.json();
    
    if (!docId) {
      return new Response(
        JSON.stringify({ error: 'ID du document manquant' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Lecture du Google Doc:', docId);

    // Pour le moment, on simule la lecture d'un document
    // En production, ceci devrait utiliser l'API Google Docs avec OAuth
    const simulatedContent = `OFFRE COMMERCIALE

MÉMO POUR L'ÉQUIPE COMMERCIALE

PROPOSITION DE VALEUR
Une équipe d'agents IA qui propulse votre entreprise en automatisant les tâches répétitives pour libérer du temps stratégique.

CIBLES IDÉALES
Entreprises qui :
• Perdent du temps sur des processus manuels répétitifs
• Ont des équipes surchargées par l'opérationnel
• Cherchent à améliorer leur productivité
• Ont des difficultés de recrutement
• Veulent rester compétitives mais manquent de temps pour se former à l'IA

MÉTHODE EN 3 ÉTAPES
1. Audit gratuit : Analyse des processus et identification des opportunités
2. Développement : Création de workflows intelligents intégrés aux outils existants
3. Déploiement : Mise en place rapide avec documentation et suivi continu

TARIFS
• Audit : Gratuit (30 minutes)
• Premier test : À partir de 50 000 cfa
• Solution complète : Sur devis
• Coûts typiques : 200 000 -300 000 cfa initial + 40 000-100 000 cfa/semaine`;

    console.log('Contenu simulé chargé avec succès');

    return new Response(
      JSON.stringify({ 
        content: simulatedContent,
        docId,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Erreur dans google-docs-reader:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erreur lors de la lecture du document Google',
        details: error?.message || 'Erreur inconnue'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});