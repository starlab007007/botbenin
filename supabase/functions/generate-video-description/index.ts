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
    const { frames, duration = 'medium', platform = 'tiktok' } = await req.json();
    
    if (!frames || !frames.hero || !frames.demo || !frames.result || !frames.cta) {
      throw new Error('Les 4 frames (hero, demo, result, cta) sont requises');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY non configurée');
    }

    // Définir la durée cible en secondes
    const durationMap: Record<string, number> = {
      'short': 15,
      'medium': 30,
      'long': 45
    };
    const targetDuration = durationMap[duration] || 30;

    // Construire le prompt optimisé pour la génération de script
    const prompt = `Génère un script promotionnel captivant de ${targetDuration} secondes pour une vidéo ${platform}.

Contexte visuel :
- Hero (Accroche) : ${frames.hero}
- Démonstration : ${frames.demo}
- Résultat : ${frames.result}
- Call-to-Action : ${frames.cta}

Le script doit :
1. Commencer par un hook ultra-accrocheur (3-5 secondes)
2. Présenter rapidement le problème et la solution
3. Montrer les bénéfices clés
4. Finir par un CTA clair et motivant

Style : dynamique, enthousiaste, professionnel
Ton : conversationnel, engageant
Format : 1 paragraphe fluide, optimisé pour TTS (pas de bullet points)
Longueur : environ ${Math.floor(targetDuration * 2.5)} mots pour ${targetDuration} secondes de lecture naturelle

Génère uniquement le texte du script, sans intro ni explication.`;

    console.log('Génération du script avec Lovable AI...');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'Tu es un expert en création de scripts promotionnels pour vidéos courtes (TikTok, Instagram Reels, YouTube Shorts). Tu génères des textes percutants, engageants et optimisés pour la lecture vocale.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erreur Lovable AI:', response.status, errorText);
      throw new Error(`Erreur Lovable AI: ${response.status}`);
    }

    const data = await response.json();
    const scriptText = data.choices?.[0]?.message?.content;

    if (!scriptText) {
      throw new Error('Aucun script généré');
    }

    console.log('Script généré avec succès');

    // Calculer les métadonnées
    const wordCount = scriptText.split(/\s+/).length;
    const estimatedDuration = Math.round((wordCount / 2.5) * 10) / 10; // 2.5 mots/seconde

    return new Response(
      JSON.stringify({
        scriptText: scriptText.trim(),
        duration: duration,
        targetDuration,
        estimatedDuration,
        wordCount,
        platform,
        characterCount: scriptText.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );

  } catch (error) {
    console.error('Erreur génération description:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur lors de la génération' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
