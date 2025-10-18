import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { heroText, demoText, resultText, ctaText, duration = 30 } = await req.json()
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured')
    }

    const systemPrompt = `Génère un texte promotionnel narratif complet pour une vidéo de ${duration}s.

Textes des 4 frames :
1. Hero : ${heroText}
2. Demo : ${demoText}
3. Result : ${resultText}
4. CTA : ${ctaText}

Contexte : Vidéo promotionnelle TikTok/Reels pour entrepreneurs africains

Le texte doit :
- Créer une HISTOIRE cohérente du problème à la solution
- Enchaîner naturellement les 4 parties
- Maintenir le rythme et l'énergie
- Finir sur une note d'action forte
- 50-80 mots au total

Génère un paragraphe fluide qui raconte l'histoire complète. UNIQUEMENT le texte, sans commentaire.`

    console.log('Generating video summary from 4 frame texts')

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Génère le résumé vidéo maintenant.' }
        ],
        temperature: 0.7,
        max_tokens: 200
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Lovable AI error:', response.status, errorText)
      throw new Error(`AI generation failed: ${response.status}`)
    }

    const data = await response.json()
    const promotionalSummary = data.choices[0].message.content.trim()

    console.log('Generated summary:', promotionalSummary.substring(0, 50) + '...')

    return new Response(
      JSON.stringify({
        promotionalSummary,
        wordCount: promotionalSummary.split(/\s+/).length,
        characterCount: promotionalSummary.length,
        generatedAt: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Error in generate-video-promotional-summary:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
