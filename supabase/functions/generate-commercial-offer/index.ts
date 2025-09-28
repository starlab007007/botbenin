import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OfferConfig {
  type: 'personnel' | 'entreprise' | 'b2b' | 'b2c' | 'c2c';
  targetAudience: string;
  industry: string;
  tone: 'professionnel' | 'convivial' | 'technique' | 'commercial' | 'premium';
  keyFeatures: string[];
}

const getOfferPrompt = (config: OfferConfig): string => {
  const typeDescriptions = {
    personnel: 'un profil personnel spécialisé (consultant, freelance, expert)',
    entreprise: 'une entreprise commerciale avec équipe dédiée',
    b2b: 'des solutions d\'automatisation IA pour entreprises (B2B)',
    b2c: 'des services directs aux consommateurs (B2C)', 
    c2c: 'une plateforme d\'échange entre particuliers (C2C)'
  };

  const toneMapping = {
    professionnel: 'professionnel et structuré',
    convivial: 'convivial et accessible',
    technique: 'technique et détaillé',
    commercial: 'commercial et persuasif',
    premium: 'premium et exclusif'
  };

  const baseExample = `
OFFRE COMMERCIALE

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

  return `Tu es un expert en rédaction d'offres commerciales spécialisé dans l'IA et l'automatisation.

Génère une offre commerciale complète pour ${typeDescriptions[config.type]}.

Contexte et informations:
- Type d'offre: ${config.type.toUpperCase()}
- Audience cible: ${config.targetAudience}
- Secteur d'activité: ${config.industry}
- Ton souhaité: ${toneMapping[config.tone] || config.tone}
- Caractéristiques clés à intégrer: ${config.keyFeatures.join(', ')}

Utilise exactement cette structure (inspire-toi de l'exemple ci-dessous mais adapte-le) :

${baseExample}

INSTRUCTIONS SPÉCIFIQUES:
1. Garde la structure exacte: OFFRE COMMERCIALE, MÉMO POUR L'ÉQUIPE COMMERCIALE, PROPOSITION DE VALEUR, CIBLES IDÉALES, MÉTHODE EN 3 ÉTAPES, TARIFS
2. Adapte le contenu selon le type:
   - Personnel: Expertise individuelle, services conseil
   - Entreprise: Solutions d'équipe, processus structurés
   - B2B: ROI, efficacité, intégration systèmes
   - B2C: Bénéfices utilisateur, simplicité
   - C2C: Facilitation échanges, sécurité, commission
3. Intègre naturellement l'audience cible (${config.targetAudience}) et le secteur (${config.industry})
4. Utilise un ton ${toneMapping[config.tone] || config.tone}
5. Incorpore les caractéristiques clés dans la proposition de valeur
6. Adapte les tarifs au contexte africain (CFA) et au type d'offre
7. Rends le contenu actionnable et convaincant

Le résultat doit être en français, prêt à utiliser, et suivre exactement le format de l'exemple.`;
};

const generateWithGemini = async (prompt: string, apiKey: string) => {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    if (response.status === 429) {
      const retryAfter = errorData.error?.details?.find((d: any) => d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo')?.retryDelay;
      const retryAfterSeconds = retryAfter ? parseInt(retryAfter.replace('s', '')) : 3600;
      const retryAfterHours = Math.ceil(retryAfterSeconds / 3600);
      
      throw new Error(JSON.stringify({
        error: 'QUOTA_EXCEEDED',
        message: 'Quota Gemini API dépassé',
        details: `La limite de 50 requêtes par jour a été atteinte. Réessayez dans ${retryAfterHours}h.`,
        retryAfter: retryAfterSeconds,
        userMessage: `⚠️ Limite quotidienne atteinte\n\nL'API Gemini AI a une limite de 50 générations par jour qui a été dépassée.\n\nVous pourrez générer de nouvelles offres dans ${retryAfterHours} heure${retryAfterHours > 1 ? 's' : ''}.\n\nEn attendant, vous pouvez :\n• Éditer manuellement le contenu existant\n• Sauvegarder vos offres actuelles\n• Revenir plus tard pour de nouvelles générations`
      }));
    }
    throw new Error(`Gemini API error: ${response.status} - ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
    throw new Error('Réponse inattendue de l\'API Gemini');
  }

  return data.candidates[0].content.parts[0].text;
};

const generateWithOpenAI = async (prompt: string, apiKey: string) => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Tu es un expert en rédaction d\'offres commerciales spécialisé dans l\'IA et l\'automatisation.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error('Réponse inattendue de l\'API OpenAI');
  }

  return data.choices[0].message.content;
};

const generateWithMistral = async (prompt: string, apiKey: string) => {
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'mistral-large-latest',
      messages: [
        { role: 'system', content: 'Tu es un expert en rédaction d\'offres commerciales spécialisé dans l\'IA et l\'automatisation.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Mistral API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
  }

  const data = await response.json();
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error('Réponse inattendue de l\'API Mistral');
  }

  return data.choices[0].message.content;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let config, userId, apiProvider, apiKey;
    try {
      const body = await req.json();
      config = body.config;
      userId = body.userId;
      apiProvider = body.apiProvider || 'gemini';
      apiKey = body.apiKey;
    } catch (error) {
      console.error('Error parsing request body:', error);
      return new Response(
        JSON.stringify({ error: 'Format de requête invalide' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    if (!config || !config.targetAudience || !config.industry) {
      return new Response(
        JSON.stringify({ error: 'Configuration incomplète' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: `Clé API ${apiProvider.toUpperCase()} manquante` }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Génération d\'offre commerciale avec', apiProvider.toUpperCase(), 'pour:', {
      type: config.type,
      targetAudience: config.targetAudience,
      industry: config.industry,
      userId
    });

    const prompt = getOfferPrompt(config);
    let generatedContent;

    try {
      switch (apiProvider) {
        case 'gemini':
          generatedContent = await generateWithGemini(prompt, apiKey);
          break;
        case 'openai':
          generatedContent = await generateWithOpenAI(prompt, apiKey);
          break;
        case 'mistral':
          generatedContent = await generateWithMistral(prompt, apiKey);
          break;
        default:
          throw new Error(`API provider non supporté: ${apiProvider}`);
      }
    } catch (error) {
      console.error(`Erreur ${apiProvider.toUpperCase()} API:`, error);
      
      // Gestion spéciale pour Gemini quota exceeded
      if (apiProvider === 'gemini' && (error as Error).message.includes('QUOTA_EXCEEDED')) {
        try {
          const errorObj = JSON.parse((error as Error).message);
          return new Response(JSON.stringify(errorObj), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (parseError) {
          // Fallback si le parsing échoue
          return new Response(
            JSON.stringify({ 
              error: 'QUOTA_EXCEEDED',
              message: 'Quota Gemini API dépassé',
              userMessage: 'Limite quotidienne atteinte. Réessayez plus tard.'
            }),
            {
              status: 429,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
      }
      
      throw error;
    }

    console.log('Offre commerciale générée avec succès via', apiProvider.toUpperCase());
    console.log('Preview:', generatedContent.substring(0, 200) + '...');

    return new Response(
      JSON.stringify({ 
        generatedContent,
        config,
        apiProvider,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Erreur dans generate-commercial-offer:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erreur lors de la génération de l\'offre commerciale',
        details: error?.message || 'Erreur inconnue'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});