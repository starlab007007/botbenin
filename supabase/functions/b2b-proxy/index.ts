
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id, x-requested-with',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    console.log('=== B2B PROXY START ===')
    
    // Parse request body
    const requestBody = await req.json()
    console.log('Request body received:', JSON.stringify(requestBody, null, 2))
    
    // Extract request ID for tracking
    const requestId = req.headers.get('x-request-id') || `proxy_${Date.now()}`
    console.log('Request ID:', requestId)
    
    // N8N webhook URL
    const n8nWebhookUrl = 'https://ia.bot.bj/webhook/lead'
    console.log('Proxying to:', n8nWebhookUrl)
    
    // Forward request to n8n webhook
    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'B2B-Proxy-Supabase/1.0',
        'X-Request-ID': requestId,
        'X-Forwarded-For': req.headers.get('x-forwarded-for') || 'unknown',
        'X-Original-Origin': req.headers.get('origin') || 'lovable-project'
      },
      body: JSON.stringify(requestBody)
    })
    
    console.log('N8N Response status:', n8nResponse.status)
    console.log('N8N Response headers:', Object.fromEntries(n8nResponse.headers.entries()))
    
    // Get response content
    const contentType = n8nResponse.headers.get('content-type') || ''
    let responseData
    
    if (contentType.includes('application/json')) {
      responseData = await n8nResponse.json()
      console.log('N8N JSON Response:', JSON.stringify(responseData, null, 2))
    } else {
      responseData = await n8nResponse.text()
      console.log('N8N Text Response:', responseData)
    }
    
    // Return response with CORS headers
    return new Response(
      JSON.stringify({
        success: n8nResponse.ok,
        status: n8nResponse.status,
        data: responseData,
        requestId: requestId,
        timestamp: new Date().toISOString()
      }),
      { 
        status: n8nResponse.ok ? 200 : n8nResponse.status,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json'
        }
      }
    )
    
  } catch (error) {
    console.error('=== B2B PROXY ERROR ===')
    console.error('Error type:', error?.constructor?.name)
    console.error('Error message:', error?.message)
    console.error('Full error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Proxy error: ' + error?.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json'
        }
      }
    )
  } finally {
    console.log('=== B2B PROXY END ===')
  }
})
