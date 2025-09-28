import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OfferConfig {
  type: 'personnel' | 'entreprise' | 'b2b' | 'b2c' | 'c2c';
  targetAudience: string;
  industry: string;
  tone: string;
  keyFeatures: string[];
}

const getOfferPrompt = (config: OfferConfig): string => {
  const typeDescriptions = {
    personnel: "une offre personnalisée pour un profil individuel",
    entreprise: "une offre commerciale pour une entreprise",
    b2b: "une offre B2B (Business to Business) pour des entreprises clientes",
    b2c: "une offre B2C (Business to Consumer) pour des consommateurs finaux",
    c2c: "une offre C2C (Consumer to Consumer) pour une plateforme d'échange entre particuliers"
  };

  const toneInstructions = {
    professionnel: "Utilisez un ton professionnel, formel et rassurant",
    convivial: "Adoptez un ton convivial, accessible et chaleureux",
    technique: "Employez un vocabulaire technique précis et détaillé",
    commercial: "Utilisez un ton persuasif et orienté vente",
    premium: "Adoptez un ton premium, exclusif et haut de gamme"
  };

  return `
Vous êtes un expert en rédaction d'offres commerciales. Générez ${typeDescriptions[config.type]} avec les spécifications suivantes :

**Audience cible :** ${config.targetAudience}
**Secteur d'activité :** ${config.industry}
**Ton de communication :** ${toneInstructions[config.tone]}
**Caractéristiques clés à inclure :** ${config.keyFeatures.join(', ')}

**Structure demandée :**
1. **Titre accrocheur** - Un titre qui capte l'attention
2. **Introduction** - Présentation du problème/besoin
3. **Notre solution** - Description de l'offre
4. **Caractéristiques principales** - Liste des fonctionnalités clés
5. **Bénéfices clients** - Avantages concrets pour le client
6. **Tarification** - Structure tarifaire adaptée
7. **Appel à l'action** - Prochaines étapes claires

**Instructions spécifiques :**
- Adaptez le vocabulaire au type d'offre (${config.type})
- Intégrez naturellement les caractéristiques mentionnées
- Créez un contenu persuasif et structuré
- Incluez des éléments de réassurance (garanties, témoignages, etc.)
- Proposez une offre concrète avec des prix indicatifs
- Terminez par un appel à l'action fort

Générez un contenu complet et professionnel d'environ 800-1200 mots.
`;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      console.error('OpenAI API key not found');
      return new Response(
        JSON.stringify({ error: 'Configuration de l\'IA manquante' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { config, userId } = await req.json();
    
    if (!config || !config.targetAudience || !config.industry) {
      return new Response(
        JSON.stringify({ error: 'Configuration incomplète' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Génération d\'offre commerciale pour:', {
      type: config.type,
      targetAudience: config.targetAudience,
      industry: config.industry,
      userId
    });

    const prompt = getOfferPrompt(config);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Vous êtes un expert en rédaction commerciale spécialisé dans la création d\'offres persuasives et professionnelles. Vous maîtrisez tous les types de communications commerciales (B2B, B2C, C2C) et savez adapter votre ton selon l\'audience cible.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2500
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Erreur OpenAI:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedContent = data.choices[0].message.content;

    console.log('Offre commerciale générée avec succès');

    return new Response(
      JSON.stringify({ 
        generatedContent,
        config,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Erreur dans generate-commercial-offer:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erreur lors de la génération de l\'offre commerciale',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});