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
    console.log('🔍 Starting ElevenLabs diagnostic...')
    const diagnostics: any[] = []

    // Test 1: Vérifier la clé API
    const apiKey = Deno.env.get('ELEVENLABS_API_KEY')
    diagnostics.push({
      test: 'API Key Check',
      status: apiKey ? 'PASS' : 'FAIL',
      details: apiKey ? 'API key is configured' : 'API key is missing',
      apiKeyLength: apiKey ? apiKey.length : 0
    })

    if (!apiKey) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'ELEVENLABS_API_KEY not configured',
          diagnostics 
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    }

    // Test 2: Vérifier la connectivité à ElevenLabs
    try {
      console.log('🌐 Testing ElevenLabs API connectivity...')
      const connectivityTest = await fetch('https://api.elevenlabs.io/v1/user', {
        method: 'GET',
        headers: {
          'xi-api-key': apiKey,
        },
      })

      diagnostics.push({
        test: 'ElevenLabs API Connectivity',
        status: connectivityTest.ok ? 'PASS' : 'FAIL',
        details: `Status: ${connectivityTest.status}`,
        responseHeaders: Object.fromEntries(connectivityTest.headers.entries())
      })

      if (connectivityTest.ok) {
        const userData = await connectivityTest.json()
        diagnostics.push({
          test: 'User Account Info',
          status: 'PASS',
          details: userData
        })
      }
    } catch (error) {
      diagnostics.push({
        test: 'ElevenLabs API Connectivity',
        status: 'FAIL',
        details: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }

    // Test 3: Tester l'agent spécifique
    const agentId = 'agent_6201k518xhz2eemtsrbf38fmjq7p'
    try {
      console.log('🤖 Testing specific agent:', agentId)
      const agentTest = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
        {
          method: 'GET',
          headers: {
            'xi-api-key': apiKey,
          },
        }
      )

      const agentData = agentTest.ok ? await agentTest.json() : await agentTest.text()
      
      diagnostics.push({
        test: 'Agent Signed URL Generation',
        status: agentTest.ok ? 'PASS' : 'FAIL',
        details: agentTest.ok ? 'Signed URL generated successfully' : `Error: ${agentData}`,
        statusCode: agentTest.status,
        response: agentData
      })
    } catch (error) {
      diagnostics.push({
        test: 'Agent Signed URL Generation',
        status: 'FAIL',
        details: `Request error: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }

    // Test 4: Vérifier les permissions
    try {
      console.log('🔐 Testing permissions...')
      const permissionsTest = await fetch('https://api.elevenlabs.io/v1/voices', {
        method: 'GET',
        headers: {
          'xi-api-key': apiKey,
        },
      })

      diagnostics.push({
        test: 'API Permissions',
        status: permissionsTest.ok ? 'PASS' : 'FAIL',
        details: permissionsTest.ok ? 'API permissions are valid' : `Permission error: ${permissionsTest.status}`,
        statusCode: permissionsTest.status
      })
    } catch (error) {
      diagnostics.push({
        test: 'API Permissions',
        status: 'FAIL',
        details: `Permission check error: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }

    console.log('✅ Diagnostic completed')

    return new Response(
      JSON.stringify({ 
        success: true,
        diagnostics,
        summary: {
          total: diagnostics.length,
          passed: diagnostics.filter(d => d.status === 'PASS').length,
          failed: diagnostics.filter(d => d.status === 'FAIL').length
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
    console.error('❌ Diagnostic error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        diagnostics: []
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