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
    const { logType = 'auth' } = await req.json()
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing environment variables')
    }

    // Utiliser l'endpoint REST Analytics de Supabase
    let endpoint = ''
    if (logType === 'auth') {
      endpoint = `${supabaseUrl}/rest/v1/rpc/auth_logs`
    } else if (logType === 'postgres') {
      endpoint = `${supabaseUrl}/rest/v1/rpc/postgres_logs`
    } else {
      throw new Error('Invalid log type')
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({})
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Supabase API error:', errorText)
      throw new Error(`Failed to fetch logs: ${response.status} - ${errorText}`)
    }

    const data = await response.json()

    return new Response(
      JSON.stringify({ data: data || [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in supabase-analytics-query:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        data: [] 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})
