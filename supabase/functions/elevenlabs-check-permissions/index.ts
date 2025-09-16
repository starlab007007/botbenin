import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔍 Vérification des permissions ElevenLabs...')

    const apiKey = Deno.env.get('ELEVENLABS_API_KEY')
    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY not configured')
    }

    // Test 1: Vérifier les informations du compte
    console.log('👤 Test des informations utilisateur...')
    const userResponse = await fetch('https://api.elevenlabs.io/v1/user', {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
      },
    })

    const userInfo = await userResponse.json()
    console.log('👤 Infos utilisateur:', userInfo)

    if (!userResponse.ok) {
      throw new Error(`Clé API invalide: ${userResponse.status} - ${JSON.stringify(userInfo)}`)
    }

    // Test 2: Vérifier les permissions Conversational AI
    console.log('🤖 Test des permissions Conversational AI...')
    const convaiResponse = await fetch('https://api.elevenlabs.io/v1/convai/agents', {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
      },
    })

    const convaiData = convaiResponse.ok ? await convaiResponse.json() : await convaiResponse.text()
    console.log('🤖 Réponse Convai:', convaiData)

    // Test 3: Tester l'accès à un agent spécifique
    const agentId = 'agent_6201k518xhz2eemtsrbf38fmjq7p'
    console.log('🎯 Test de l\'agent spécifique:', agentId)
    
    const agentResponse = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': apiKey,
        },
      }
    )

    const agentResult = agentResponse.ok ? await agentResponse.json() : await agentResponse.text()
    console.log('🎯 Résultat agent:', agentResult)

    // Analyser les résultats
    const permissions = {
      basic_api: userResponse.ok,
      convai_read: convaiResponse.ok,
      convai_write: agentResponse.ok,
      agent_access: agentResponse.ok && typeof agentResult === 'object' && agentResult.signed_url
    }

    const recommendations = []
    
    if (!permissions.basic_api) {
      recommendations.push('❌ Clé API invalide - Vérifiez votre clé API ElevenLabs')
    }
    
    if (!permissions.convai_read) {
      recommendations.push('❌ Permission convai_read manquante - Activez Conversational AI dans vos paramètres ElevenLabs')
    }
    
    if (!permissions.convai_write) {
      recommendations.push('❌ Permission convai_write manquante - Demandez l\'accès API Conversational AI à ElevenLabs')
    }
    
    if (!permissions.agent_access) {
      recommendations.push('❌ Accès agent refusé - Vérifiez que l\'agent existe et est accessible')
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Toutes les permissions sont correctes !')
    }

    return new Response(
      JSON.stringify({
        success: permissions.convai_write,
        userInfo: userInfo,
        permissions: permissions,
        recommendations: recommendations,
        testResults: {
          userResponse: { status: userResponse.status, data: userInfo },
          convaiResponse: { status: convaiResponse.status, data: convaiData },
          agentResponse: { status: agentResponse.status, data: agentResult }
        }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('❌ Erreur vérification permissions:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        recommendations: [
          '1. Vérifiez votre clé API ElevenLabs',
          '2. Activez les permissions Conversational AI',
          '3. Contactez le support ElevenLabs si nécessaire'
        ]
      }),
      {
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    )
  }
})