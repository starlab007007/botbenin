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

    const { videoId, frames, config } = await req.json();

    console.log('🎬 Starting Shotstack render:', { videoId });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const shotstackApiKey = Deno.env.get('SHOTSTACK_API_KEY')!;

    if (!shotstackApiKey) {
      throw new Error('SHOTSTACK_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Vérifier l'authentification
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Not authenticated');
    }

    // Construire le JSON Shotstack
    const timeline = {
      soundtrack: config.musicId ? {
        src: `https://example.com/music/${config.musicId}.mp3`,
        effect: "fadeInFadeOut",
        volume: config.musicVolume
      } : undefined,
      tracks: [
        {
          clips: [
            {
              asset: {
                type: "image",
                src: frames.hero
              },
              start: 0,
              length: 2.5,
              fit: "cover",
              scale: 1,
              transition: {
                in: "fade",
                out: "fade"
              }
            },
            {
              asset: {
                type: "image",
                src: frames.demo
              },
              start: 2.5,
              length: 2.5,
              fit: "cover",
              scale: 1,
              transition: {
                in: "fade",
                out: "fade"
              }
            },
            {
              asset: {
                type: "image",
                src: frames.result
              },
              start: 5,
              length: 2.5,
              fit: "cover",
              scale: 1,
              transition: {
                in: "fade",
                out: "fade"
              }
            },
            {
              asset: {
                type: "image",
                src: frames.cta
              },
              start: 7.5,
              length: 2.5,
              fit: "cover",
              scale: 1,
              transition: {
                in: "fade",
                out: "fade"
              }
            }
          ]
        }
      ]
    };

    const shotstackPayload = {
      timeline,
      output: {
        format: "mp4",
        resolution: "hd",
        aspectRatio: "9:16",
        size: {
          width: 1080,
          height: 1920
        },
        fps: 30,
        scaleTo: "preview"
      }
    };

    console.log('📤 Sending to Shotstack API...');

    // Envoyer à l'API Shotstack
    const shotstackResponse = await fetch('https://api.shotstack.io/v1/render', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': shotstackApiKey
      },
      body: JSON.stringify(shotstackPayload)
    });

    if (!shotstackResponse.ok) {
      const errorText = await shotstackResponse.text();
      console.error('❌ Shotstack API error:', errorText);
      throw new Error(`Shotstack API error: ${shotstackResponse.status}`);
    }

    const shotstackResult = await shotstackResponse.json();
    console.log('✅ Shotstack render initiated:', shotstackResult);

    const renderId = shotstackResult.response?.id;
    if (!renderId) {
      throw new Error('No render ID returned from Shotstack');
    }

    // Mettre à jour la base de données avec le render ID
    const { error: updateError } = await supabase
      .from('generated_videos')
      .update({
        shotstack_render_id: renderId,
        render_status: 'processing'
      })
      .eq('video_id', videoId);

    if (updateError) {
      console.error('❌ Database update error:', updateError);
      throw updateError;
    }

    console.log('✅ Database updated with render ID');

    return new Response(
      JSON.stringify({
        success: true,
        renderId,
        status: 'processing',
        message: 'Rendu vidéo en cours avec Shotstack. Rafraîchissez dans quelques minutes.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in render-with-shotstack:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Erreur lors du rendu Shotstack'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
