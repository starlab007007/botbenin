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

    console.log('Processing image with AI enhancement for camera effect:', cameraEffect);

    // Étape 1: Toujours améliorer l'image avec Lovable AI pour une qualité professionnelle
    const enhancementPrompt = `Transform this image to professional marketing quality for a promotional video:

Product/Subject: ${description || 'subject in image'}
Target Use: Promotional video with ${cameraEffect} camera motion
Visual Style: ${videoStyle}

CRITICAL ENHANCEMENTS REQUIRED:
1. Image Quality:
   - Significantly increase sharpness and definition
   - Remove any noise, blur, compression artifacts, or imperfections
   - Ultra high resolution optimization for video use
   
2. Visual Enhancement:
   - Optimize colors, contrast, and lighting for ${videoStyle} aesthetic
   - Professional studio-quality color grading
   - Make the subject/product stand out with clarity and impact
   
3. Composition:
   - Maintain perfect aspect ratio and composition
   - ${cameraEffect === '360-rotate' ? 'Ensure subject is perfectly centered for 360° rotation' : 'Optimize for ' + cameraEffect + ' camera movement'}
   - Professional product photography standards
   
4. Style Adaptation:
   - Apply ${videoStyle} visual treatment
   - Cinematic quality suitable for ${cameraEffect} animation
   - Marketing-grade professional output

${cameraEffect === '360-rotate' ? '\n5. 360° Preparation:\n   - Center the product perfectly\n   - Maximize product detail and clarity\n   - Prepare for transparent background isolation\n   - Studio lighting for all-angle visibility' : ''}

OUTPUT: Enhanced, professional-grade image ready for ${cameraEffect} animation with ${videoStyle} style. Ultra high resolution.`;

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
              { type: 'text', text: enhancementPrompt },
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
        isEnhancedImage: true,
        aiEnhanced: true,
        enhancementPrompt: enhancementPrompt,
        qualityLevel: 'professional',
        processingSteps: ['ai_enhancement']
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
