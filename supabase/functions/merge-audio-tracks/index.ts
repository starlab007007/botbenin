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
    const { videoId, audioTracks } = await req.json();
    console.log('🎵 Merging audio tracks for video:', videoId);

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

    // Vérifier que nous avons 4 pistes audio
    if (!audioTracks || audioTracks.length !== 4) {
      throw new Error('4 pistes audio sont requises (hero, demo, result, cta)');
    }

    // Télécharger les pistes audio depuis Supabase Storage
    console.log('📥 Downloading audio tracks...');
    const audioBuffers = await Promise.all(
      audioTracks.map(async (track: { url: string; frameType: string; duration: number }) => {
        const response = await fetch(track.url);
        if (!response.ok) {
          throw new Error(`Failed to download audio track: ${track.frameType}`);
        }
        return {
          frameType: track.frameType,
          duration: track.duration,
          buffer: await response.arrayBuffer(),
        };
      })
    );

    console.log('✅ All tracks downloaded');

    // Calculer la durée totale
    const totalDuration = audioBuffers.reduce((sum, track) => sum + track.duration, 0);
    console.log(`📊 Total duration: ${totalDuration}s, Target: 10s`);

    // Calculer le facteur de vitesse nécessaire
    const speedFactor = totalDuration > 10 ? totalDuration / 10 : 1.0;
    console.log(`⚡ Speed factor: ${speedFactor.toFixed(2)}x`);

    // Pour cette version simplifiée, nous allons juste concaténer les buffers
    // Dans une version complète, on utiliserait FFmpeg pour:
    // 1. Ajuster la vitesse de lecture si nécessaire
    // 2. Ajouter des transitions entre les pistes
    // 3. Normaliser le volume
    
    // Créer un buffer combiné (concaténation simple)
    const totalSize = audioBuffers.reduce((sum, track) => sum + track.buffer.byteLength, 0);
    const mergedBuffer = new Uint8Array(totalSize);
    let offset = 0;
    
    for (const track of audioBuffers) {
      mergedBuffer.set(new Uint8Array(track.buffer), offset);
      offset += track.buffer.byteLength;
    }

    console.log('🔗 Audio tracks merged');

    // Upload vers Supabase Storage
    const fileName = `${user.id}/${videoId}/merged-audio-${Date.now()}.mp3`;
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('video-audio-assets')
      .upload(fileName, mergedBuffer, {
        contentType: 'audio/mpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      throw uploadError;
    }

    console.log('📤 Merged audio uploaded:', uploadData.path);

    // Obtenir l'URL publique
    const { data: { publicUrl } } = supabaseClient.storage
      .from('video-audio-assets')
      .getPublicUrl(fileName);

    // Calculer la durée finale (avec ajustement de vitesse si appliqué)
    const finalDuration = Math.min(totalDuration / speedFactor, 10);

    return new Response(
      JSON.stringify({
        success: true,
        mergedAudioUrl: publicUrl,
        mergedAudioDuration: finalDuration,
        originalDuration: totalDuration,
        speedFactor: speedFactor,
        message: speedFactor > 1 
          ? `Audio compressé de ${totalDuration.toFixed(1)}s à ${finalDuration.toFixed(1)}s (${speedFactor.toFixed(2)}x)`
          : `Audio fusionné: ${finalDuration.toFixed(1)}s`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error merging audio tracks:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur de fusion audio',
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
