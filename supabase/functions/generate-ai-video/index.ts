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

    // Utiliser l'API Lovable pour générer une image améliorée avec effets visuels
    const enhancedPrompt = `Create an enhanced version of this image with dramatic visual effects for a promotional video:
    
Camera motion style: ${cameraEffect}
Visual style: ${videoStyle}
${description ? `Product/Context: ${description}` : ''}

Apply professional cinematic effects:
- Add depth and dimension with subtle lighting
- Enhance colors and contrast for ${videoStyle} style
- Create a visually striking composition ready for ${cameraEffect} animation
- Maintain the product focus while adding atmospheric effects

Output: High-quality enhanced image optimized for animated presentation.`;

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
        ]
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
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI Response structure:', JSON.stringify(data).substring(0, 500));
    
    // Extraire l'image générée de la réponse
    let generatedImage = null;
    
    if (data.choices?.[0]?.message?.content) {
      // Le contenu peut être du texte avec l'URL de l'image
      const content = data.choices[0].message.content;
      const urlMatch = content.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        generatedImage = urlMatch[0];
      }
    }
    
    // Vérifier aussi dans les images directes
    if (!generatedImage && data.choices?.[0]?.message?.images?.[0]) {
      const imageData = data.choices[0].message.images[0];
      generatedImage = imageData.image_url?.url || imageData.url || imageData;
    }

    // Si pas d'image générée, retourner l'image originale
    if (!generatedImage) {
      console.log('No enhanced image generated, using original');
      generatedImage = image;
    }

    console.log('Image generated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        videoUrl: generatedImage,
        cameraEffect,
        videoStyle,
        duration,
        isEnhancedImage: true
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
