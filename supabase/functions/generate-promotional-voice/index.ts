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

    const { text, voiceId, speed = 1.0, videoId, frameType } = await req.json();

    console.log('🎤 Generating voice with ElevenLabs:', { videoId, frameType, voiceId });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');

    if (!elevenLabsApiKey) {
      throw new Error('ELEVENLABS_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Vérifier l'authentification
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Not authenticated');
    }

    // Mapper les voiceId vers les vrais IDs ElevenLabs
    const voiceMapping: Record<string, string> = {
      'antoine-professional': '21m00Tcm4TlvDq8ikWAM', // Adam (ElevenLabs)
      'charlotte-dynamic': 'EXAVITQu4vr4xnSDxMaL', // Bella (ElevenLabs)
      'pierre-mature': 'pNInz6obpgDQGcFmaJgB', // Adam (deep voice)
      'amelie-gentle': '9BWtsMINqrJLrRacOk9x', // Aria (ElevenLabs)
    };

    const elevenLabsVoiceId = voiceMapping[voiceId] || voiceMapping['antoine-professional'];

    // Générer l'audio avec ElevenLabs
    const elevenLabsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': elevenLabsApiKey,
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.5,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!elevenLabsResponse.ok) {
      const errorText = await elevenLabsResponse.text();
      console.error('ElevenLabs API error:', errorText);
      throw new Error(`ElevenLabs error: ${elevenLabsResponse.status}`);
    }

    // Récupérer l'audio
    const audioBlob = await elevenLabsResponse.arrayBuffer();
    const audioSize = audioBlob.byteLength;
    
    console.log('✅ Audio generated, size:', audioSize);

    // Uploader vers Supabase Storage
    const fileName = `${user.id}/${videoId}/${frameType || 'summary'}.mp3`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('video-audio-assets')
      .upload(fileName, audioBlob, {
        contentType: 'audio/mpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw uploadError;
    }

    // Obtenir l'URL publique
    const { data: { publicUrl } } = supabase.storage
      .from('video-audio-assets')
      .getPublicUrl(fileName);

    console.log('📤 Audio uploaded:', publicUrl);

    // Estimer la durée (approximativement 150 mots/minute, ~2 caractères par mot)
    const estimatedDuration = (text.length / 300) * 60; // Très approximatif

    // Sauvegarder les métadonnées en base
    const { error: insertError } = await supabase
      .from('video_audio_tracks')
      .insert({
        video_id: videoId,
        frame_type: frameType,
        audio_url: publicUrl,
        audio_duration: estimatedDuration,
        audio_size_bytes: audioSize,
        voice_id: voiceId,
        voice_name: voiceId.split('-')[0],
        text_content: text,
        language: 'fr-FR',
        speed: speed,
        user_id: user.id,
      });

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw insertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        audioUrl: publicUrl,
        audioDuration: estimatedDuration,
        audioSize: audioSize,
        voiceUsed: voiceId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in generate-promotional-voice:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Erreur lors de la génération vocale'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
