import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    
    // Utiliser l'API Analytics de Supabase directement
    const analyticsUrl = `${Deno.env.get('SUPABASE_URL')}/rest/v1/rpc/${logType === 'auth' ? 'auth_logs' : 'postgres_logs'}`
    
    let query = '';
    if (logType === 'auth') {
      query = 'select=id,timestamp,event_message,metadata&order=timestamp.desc&limit=100'
    } else if (logType === 'postgres') {
      query = 'select=identifier,timestamp,id,event_message&order=timestamp.desc&limit=100'
    }

    const response = await fetch(`${analyticsUrl}?${query}`, {
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'apikey': Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        'Content-Type': 'application/json'
      }
    })

    const data = await response.json()

    return new Response(
      JSON.stringify({ data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in supabase-analytics-query:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
