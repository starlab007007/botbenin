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
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let query = '';
    
    if (logType === 'auth') {
      query = `
        select id, auth_logs.timestamp, event_message, metadata.level, metadata.status, metadata.path, metadata.msg as msg, metadata.error from auth_logs
        cross join unnest(metadata) as metadata
        order by timestamp desc
        limit 100
      `;
    } else if (logType === 'postgres') {
      query = `
        select identifier, postgres_logs.timestamp, id, event_message, parsed.error_severity from postgres_logs
        cross join unnest(metadata) as m
        cross join unnest(m.parsed) as parsed
        order by timestamp desc
        limit 100
      `;
    }

    const { data, error } = await supabaseClient.rpc('pg_stat_statements_analytics', {
      query_text: query
    })

    if (error) throw error

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
