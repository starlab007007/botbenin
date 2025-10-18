import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { renderId, videoId } = await req.json();

    console.log('🔍 Checking Shotstack render status:', renderId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const shotstackApiKey = Deno.env.get('SHOTSTACK_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Vérifier l'authentification
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Not authenticated');
    }

    // Vérifier le statut sur Shotstack
    const shotstackResponse = await fetch(`https://api.shotstack.io/v1/render/${renderId}`, {
      method: 'GET',
      headers: {
        'x-api-key': shotstackApiKey
      }
    });

    if (!shotstackResponse.ok) {
      throw new Error(`Shotstack API error: ${shotstackResponse.status}`);
    }

    const result = await shotstackResponse.json();
    const status = result.response?.status;
    const url = result.response?.url;

    console.log('📊 Shotstack status:', { status, url });

    // Mettre à jour la base de données si le rendu est terminé
    if (status === 'done' && url) {
      const { error: updateError } = await supabase
        .from('generated_videos')
        .update({
          rendered_video_url: url,
          render_status: 'completed'
        })
        .eq('video_id', videoId);

      if (updateError) {
        console.error('❌ Database update error:', updateError);
      } else {
        console.log('✅ Video URL saved to database');
      }
    } else if (status === 'failed') {
      await supabase
        .from('generated_videos')
        .update({
          render_status: 'failed'
        })
        .eq('video_id', videoId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        status,
        url: status === 'done' ? url : null,
        progress: result.response?.data?.progress || 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error checking Shotstack status:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Erreur lors de la vérification du statut'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
