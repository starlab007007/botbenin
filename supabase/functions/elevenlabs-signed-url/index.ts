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
    let body;
    try {
      body = await req.json()
      console.log('📥 Body reçu:', JSON.stringify(body))
    } catch (jsonError) {
      console.error('❌ JSON parsing error:', jsonError.message)
      const text = await req.text()
      console.log('📄 Raw body received:', text)
      throw new Error('Invalid JSON in request body')
    }
    const { agentId } = body
    
    console.log('🔑 Generating signed URL for agent:', agentId)
    console.log('🔍 Type of agentId:', typeof agentId)

    if (!agentId) {
      throw new Error('Agent ID is required')
    }

    const apiKey = Deno.env.get('ELEVENLABS_API_KEY')
    if (!apiKey) {
      console.error('❌ ELEVENLABS_API_KEY not found in environment')
      throw new Error('ElevenLabs API key not configured. Please add your API key in the Supabase Edge Functions settings.')
    }

    console.log('📡 Making request to ElevenLabs API...')
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': apiKey,
          'User-Agent': 'Kpakpato-Bot/1.0',
        },
      }
    )

    console.log('📊 ElevenLabs API Response Status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ ElevenLabs API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        headers: Object.fromEntries(response.headers.entries())
      })
      
      if (response.status === 401) {
        throw new Error('Invalid ElevenLabs API key. Please check your API key configuration.')
      } else if (response.status === 404) {
        throw new Error(`Agent ${agentId} not found. Please verify the agent ID.`)
      } else if (response.status === 403) {
        throw new Error('Access denied. Please check your ElevenLabs account permissions.')
      } else {
        throw new Error(`ElevenLabs API error (${response.status}): ${errorText}`)
      }
    }

    const data = await response.json()
    console.log('✅ Signed URL generated successfully')
    
    if (!data.signed_url) {
      console.error('❌ No signed_url in response:', data)
      throw new Error('No signed URL received from ElevenLabs API')
    }

    const responseData = {
      signedUrl: data.signed_url,
      success: true,
      agentId: agentId
    }
    
    console.log('📤 Sending response:', JSON.stringify(responseData).substring(0, 100) + '...')
    
    // Petit délai pour éviter l'EarlyDrop
    await new Promise(resolve => setTimeout(resolve, 50))
    
    return new Response(
      JSON.stringify(responseData),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('❌ Function error:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    })
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false,
        timestamp: new Date().toISOString()
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