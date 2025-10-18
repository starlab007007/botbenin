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
    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ No authorization header');
      throw new Error('No authorization header');
    }

    const { videoId, videoTitle, frames, config, userId, templateId, musicId } = await req.json();

    console.log('📥 Request received:', { 
      videoId, 
      videoTitle, 
      hasFrames: !!frames,
      frameKeys: Object.keys(frames || {}),
      userId,
      templateId,
      musicId
    });

    // Initialiser DEUX clients Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Client 1: Avec JWT utilisateur pour vérifier l'auth
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Vérifier l'authentification
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ Auth error:', userError);
      throw new Error('Not authenticated');
    }

    console.log('🔐 User authenticated:', user.id, user.email);

    // Client 2: Avec service role pour opérations privilégiées
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Créer un montage de frames (collage d'images)
    console.log('🎬 Creating video from frames...');
    
    // Pour l'instant, nous allons créer une entrée avec les frames
    // et simuler le processus de création vidéo
    const timestamp = Date.now();
    const fileName = `${userId}/videos/${videoId}_${timestamp}.json`;
    
    // Sauvegarder les données de la vidéo dans Storage
    const videoData = {
      videoId,
      videoTitle,
      frames,
      config,
      templateId,
      musicId,
      createdAt: new Date().toISOString()
    };

    console.log('💾 Saving to storage:', fileName);
    
    const { error: uploadError } = await supabase.storage
      .from('video-assets')
      .upload(fileName, JSON.stringify(videoData), {
        contentType: 'application/json',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Storage upload error:', uploadError);
      throw uploadError;
    }
    
    console.log('✅ Storage upload successful');

    // 2. Créer l'entrée dans la base de données
    console.log('📊 Saving to database...');
    
    const { data: videoRecord, error: dbError } = await supabase
      .from('generated_videos')
      .insert({
        video_id: videoId,
        video_title: videoTitle,
        video_url: frames.hero, // Utiliser la première frame comme preview
        storage_path: fileName,
        size_bytes: JSON.stringify(videoData).length,
        template_id: templateId,
        music_id: musicId,
        user_id: user.id,
        status: 'completed'
      })
      .select()
      .single();

    if (dbError) {
      console.error('❌ Database error:', dbError);
      throw dbError;
    }

    console.log('✅ Video saved successfully:', videoRecord.id);

    return new Response(
      JSON.stringify({
        success: true,
        videoId: videoRecord.id,
        videoUrl: frames.hero,
        thumbnailUrl: frames.hero,
        allFrames: frames,
        size: JSON.stringify(videoData).length,
        duration: 10,
        format: 'frames',
        message: 'Vidéo sauvegardée avec succès dans l\'historique'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in assemble-video function:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Erreur lors du montage vidéo'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/* 
TODO: Implémentation complète FFmpeg

Étapes pour production:

1. Installer FFmpeg dans l'environnement Deno:
   - Utiliser un layer personnalisé
   - Ou déployer sur une infrastructure supportant FFmpeg

2. Script FFmpeg complet:
   
   ffmpeg -loop 1 -t 2.5 -i hero.png \
          -loop 1 -t 2.5 -i demo.png \
          -loop 1 -t 2.5 -i result.png \
          -loop 1 -t 2.5 -i cta.png \
          -i logo.png -i music.mp3 \
          -filter_complex "
            [0]fade=t=out:st=2:d=0.5[v0];
            [1]fade=t=in:st=0:d=0.5,fade=t=out:st=2:d=0.5[v1];
            [2]fade=t=in:st=0:d=0.5,fade=t=out:st=2:d=0.5[v2];
            [3]fade=t=in:st=0:d=0.5[v3];
            [v0][v1][v2][v3]concat=n=4:v=1:a=0[video];
            [video][4]overlay=W-w-10:10[video_logo];
            [video_logo]drawtext=text='${hook}':fontfile=/fonts/Poppins-Bold.ttf:fontsize=72:fontcolor=white:x=(w-text_w)/2:y=150:enable='between(t,0,2.5)'[final];
            [5]volume=${musicVolume}[audio]
          " \
          -map "[final]" -map "[audio]" \
          -t 10 -c:v libx264 -preset fast -crf 23 \
          -c:a aac -b:a 128k \
          -s 1080x1920 -r 30 output.mp4

3. Upload vers Supabase Storage:
   - Créer bucket 'video-production' si nécessaire
   - Upload avec supabase.storage.from('video-production').upload()
   - Retourner URL publique

Alternative: Utiliser API Shotstack
- Plus simple mais payant
- Documentation: https://shotstack.io/docs/
- Supporte templates JSON pour vidéos
*/
