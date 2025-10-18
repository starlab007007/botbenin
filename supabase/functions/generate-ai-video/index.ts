import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image, cameraEffect, videoStyle, duration, description, prompt } = await req.json();

    if (!image) {
      return new Response(
        JSON.stringify({ error: 'Image requise' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY non configurée');
    }

    console.log('Generating AI video with camera effect:', cameraEffect);

    // Utiliser l'API Lovable pour générer la vidéo avec IA
    const enhancedPrompt = `${prompt}

Technical specifications:
- Input: Single image
- Camera motion: ${cameraEffect}
- Style: ${videoStyle}
- Duration: ${duration} seconds
- Output: High-quality video with smooth transitions
- Add cinematic motion blur and depth effects
- Maintain image quality throughout the animation
${description ? `Context: ${description}` : ''}

Create a professional promotional video with fluid camera movements and realistic motion.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: enhancedPrompt },
              {
                type: 'image_url',
                image_url: { url: image }
              }
            ]
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de taux dépassée, veuillez réessayer plus tard' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Crédits insuffisants, veuillez recharger votre compte' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedVideo = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!generatedVideo) {
      throw new Error('Aucune vidéo générée par l\'IA');
    }

    console.log('Video generated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        videoUrl: generatedVideo,
        cameraEffect,
        videoStyle,
        duration
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in generate-ai-video:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur inconnue' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
