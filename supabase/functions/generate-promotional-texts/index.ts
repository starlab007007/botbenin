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
    const body = await req.json()
    const { action } = body
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured')
    }

    // Health check endpoint
    if (action === 'health-check') {
      return new Response(
        JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate frame promotional text
    if (action === 'generate-frame-text') {
      const { frameType, framePrompt, style = 'epic', africaContext } = body
      
      const prompts: Record<string, string> = {
        hero: `Génère un texte promotionnel époustouflant de 20-30 mots pour une image d'accroche.

Contexte visuel : ${framePrompt}
Contexte culturel : ${africaContext || 'Afrique de l\'Ouest, Bénin, entrepreneurs locaux'}

Le texte doit :
- Capter IMMÉDIATEMENT l'attention
- Poser une question provocante OU présenter un problème urgent
- Utiliser un langage conversationnel africain ("On est ensemble", "Patron")
- Inclure 1 emoji percutant 🚀 💡 ⚡

Style : ${style}
Ton : Chaleureux mais impactant
Langue : Français avec expressions locales

Exemples de structures :
- "🚀 Patron, tu perds combien d'argent chaque jour sans ce système ?"
- "💡 Et si ton business tournait tout seul pendant que tu dors ?"
- "⚡ 2500 CFA pour transformer ton commerce. Tu attends quoi ?"

Génère UNIQUEMENT le texte promotionnel, sans commentaire.`,

        demo: `Génère un texte promotionnel de 25-35 mots montrant comment ça fonctionne.

Contexte visuel : ${framePrompt}
Contexte culturel : ${africaContext || 'Commerce africain moderne, Cotonou, digital'}

Le texte doit :
- Expliquer SIMPLEMENT la solution
- Montrer la facilité d'utilisation
- Utiliser "tu" ou "vous" selon le style
- Inclure des bénéfices concrets

Style : ${style}
Ton : Pédagogique mais enthousiasmant

Exemples :
- "📱 Tu installes en 5 minutes. Tes clients commandent sur WhatsApp. Tu reçois le paiement direct en Mobile Money."
- "Simple comme bonjour : connecte ton WhatsApp, active le bot, et laisse-le gérer tes commandes 24h/24."

Génère UNIQUEMENT le texte promotionnel, sans commentaire.`,

        result: `Génère un texte promotionnel de 20-30 mots montrant les résultats obtenus.

Contexte visuel : ${framePrompt}
Contexte culturel : ${africaContext || 'Success stories africaines, croissance business'}

Le texte doit :
- Présenter des résultats CHIFFRÉS et concrets
- Créer l'envie et la preuve sociale
- Utiliser des statistiques localement crédibles
- Montrer la transformation

Style : ${style}
Ton : Inspirant et factuel

Exemples :
- "✅ +120 commandes/mois. 0 client perdu. Plus de 450 000 CFA de ventes en plus."
- "Résultat : 3x plus de clients, temps divisé par 2, chiffre d'affaires qui explose."

Génère UNIQUEMENT le texte promotionnel, sans commentaire.`,

        cta: `Génère un CTA ultra-percutant de 15-25 mots pour pousser à l'action MAINTENANT.

Contexte visuel : ${framePrompt}
Contexte culturel : ${africaContext || 'Urgence commerciale africaine'}

Le texte doit :
- Créer l'URGENCE immédiate
- Inclure un prix en CFA si pertinent
- Donner une action claire et simple
- Lever les objections (essai gratuit, garantie)

Style : ${style}
Ton : Direct, urgent, sans pression excessive

Exemples :
- "🎯 Commence maintenant : 7 jours GRATUITS. Aucune carte bancaire. Appelle le +229 47 33 32 89"
- "Lance-toi aujourd'hui : 2500 CFA/mois. Satisfait ou remboursé. WhatsApp : wa.me/22947333289"

Génère UNIQUEMENT le texte promotionnel, sans commentaire.`
      }

      const systemPrompt = prompts[frameType] || prompts.hero

      console.log('Generating promotional text for frame:', frameType)

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
            { role: 'user', content: 'Génère le texte promotionnel maintenant.' }
          ],
          max_completion_tokens: 150
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Lovable AI error:', response.status, errorText)
        throw new Error(`AI generation failed: ${response.status}`)
      }

      const data = await response.json()
      const promotionalText = data.choices[0].message.content.trim()

      return new Response(
        JSON.stringify({
          frameType,
          promotionalText,
          characterCount: promotionalText.length,
          wordCount: promotionalText.split(/\s+/).length,
          style,
          generatedAt: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate video summary
    if (action === 'generate-video-summary') {
      const { heroText, demoText, resultText, ctaText, duration = 30 } = body
      
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
          max_completion_tokens: 200
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Lovable AI error:', response.status, errorText)
        throw new Error(`AI generation failed: ${response.status}`)
      }

      const data = await response.json()
      const promotionalSummary = data.choices[0].message.content.trim()

      return new Response(
        JSON.stringify({
          promotionalSummary,
          wordCount: promotionalSummary.split(/\s+/).length,
          characterCount: promotionalSummary.length,
          generatedAt: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error('Invalid action')
  } catch (error) {
    console.error('Error in generate-promotional-texts:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
