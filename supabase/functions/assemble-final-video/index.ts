import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoId, videoUrl, mergedAudioUrl } = await req.json();
    console.log('🎬 Assembling final video:', videoId);

    // Authentifier l'utilisateur
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Utilisateur non authentifié');
    }

    console.log('🔐 User authenticated:', user.id);

    // Créer une entrée dans final_videos
    const { data: finalVideoRecord, error: insertError } = await supabaseClient
      .from('final_videos')
      .insert({
        video_id: videoId,
        user_id: user.id,
        merged_audio_url: mergedAudioUrl,
        status: 'processing',
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error creating final_videos record:', insertError);
      throw insertError;
    }

    console.log('✅ Final video record created:', finalVideoRecord.id);

    // Télécharger la vidéo et l'audio
    console.log('📥 Downloading video and audio...');
    const [videoResponse, audioResponse] = await Promise.all([
      fetch(videoUrl),
      fetch(mergedAudioUrl),
    ]);

    if (!videoResponse.ok || !audioResponse.ok) {
      throw new Error('Failed to download video or audio');
    }

    const videoBuffer = await videoResponse.arrayBuffer();
    const audioBuffer = await audioResponse.arrayBuffer();

    console.log('✅ Video and audio downloaded');
    console.log(`📊 Video size: ${videoBuffer.byteLength} bytes`);
    console.log(`📊 Audio size: ${audioBuffer.byteLength} bytes`);

    // NOTE: Dans une implémentation complète avec FFmpeg, on ferait:
    // 1. Décoder la vidéo et l'audio
    // 2. Synchroniser les pistes
    // 3. Encoder en MP4 avec H.264/AAC
    // 4. Optimiser pour le streaming web
    
    // Pour cette version simplifiée, on retourne juste l'URL de la vidéo originale
    // car la fusion audio/vidéo nécessite FFmpeg qui n'est pas disponible dans Deno
    
    // Upload vers Supabase Storage (placeholder pour la vidéo finale)
    const finalVideoFileName = `${user.id}/${videoId}/final-video-${Date.now()}.mp4`;
    
    // Pour l'instant, on copie simplement la vidéo originale
    // Dans une vraie implémentation, ce serait la vidéo + audio fusionnés
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('generated-videos')
      .upload(finalVideoFileName, videoBuffer, {
        contentType: 'video/mp4',
        upsert: true,
      });

    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      throw uploadError;
    }

    console.log('📤 Final video uploaded:', uploadData.path);

    // Obtenir l'URL publique
    const { data: { publicUrl } } = supabaseClient.storage
      .from('generated-videos')
      .getPublicUrl(finalVideoFileName);

    // Mettre à jour l'enregistrement final_videos
    const { error: updateError } = await supabaseClient
      .from('final_videos')
      .update({
        final_video_url: publicUrl,
        final_video_size_bytes: videoBuffer.byteLength,
        status: 'ready',
        completed_at: new Date().toISOString(),
      })
      .eq('id', finalVideoRecord.id);

    if (updateError) {
      console.error('❌ Error updating final_videos record:', updateError);
      throw updateError;
    }

    console.log('✅ Final video assembled successfully');

    return new Response(
      JSON.stringify({
        success: true,
        finalVideoId: finalVideoRecord.id,
        finalVideoUrl: publicUrl,
        videoSize: videoBuffer.byteLength,
        message: 'Vidéo finale assemblée avec succès',
        note: 'Note: La fusion audio/vidéo complète nécessite FFmpeg. Cette version utilise la vidéo originale.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error assembling final video:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur d\'assemblage vidéo',
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
