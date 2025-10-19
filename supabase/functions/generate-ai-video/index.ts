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
    const { 
      image, 
      cameraEffect, 
      videoStyle, 
      duration, 
      description, 
      prompt,
      step = 'enhance-product',
      environmentPrompt,
      productImage,
      environmentImage
    } = await req.json();

    // Validation selon l'étape
    if (step === 'enhance-product' && !image) {
      return new Response(
        JSON.stringify({ error: 'Image requise pour amélioration produit' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (step === 'generate-environment' && !environmentPrompt) {
      return new Response(
        JSON.stringify({ error: 'Description d\'environnement requise' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (step === 'compose-final' && (!productImage || !environmentImage)) {
      return new Response(
        JSON.stringify({ error: 'Images produit et environnement requises pour composition' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY non configurée');
    }

    console.log(`Processing step: ${step}...`);

    // ============================================================
    // ÉTAPE 1: Amélioration du produit
    // ============================================================
    if (step === 'enhance-product') {
      const enhancementPrompt = prompt || `Enhance this product image to professional marketing quality:

Product: ${description || 'product in image'}
Target Use: Promotional Product Showcase video
Visual Style: ${videoStyle}
Camera Effect: ${cameraEffect}

CRITICAL ENHANCEMENTS:
1. Image Quality:
   - Ultra high resolution and sharpness
   - Remove noise, blur, and imperfections
   - Professional product photography standards
   
2. Visual Enhancement:
   - Optimize colors, contrast, and lighting for ${videoStyle} aesthetic
   - Make product stand out with clarity and impact
   - Professional studio-quality color grading
   
3. Composition:
   - Perfect aspect ratio and composition
   - Center product perfectly for Product Showcase
   - Maximize product detail visibility

OUTPUT: Professional-grade enhanced product image, ready for luxury environment composition.`;

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
                { type: 'image_url', image_url: { url: image } }
              ]
            }
          ],
          modalities: ['image', 'text']
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: 'Limite de taux dépassée, réessayez dans un moment' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: 'Crédits insuffisants, veuillez recharger' }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const errorText = await response.text();
        console.error('Product enhancement error:', response.status, errorText);
        throw new Error(`Product enhancement failed: ${response.status}`);
      }

      const data = await response.json();
      const enhancedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url || image;

      console.log('Product enhanced successfully');

      return new Response(
        JSON.stringify({
          enhancedImage: enhancedImageUrl,
          originalImage: image,
          step: 'enhance-product',
          processed: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================================
    // ÉTAPE 2: Génération de l'environnement
    // ============================================================
    if (step === 'generate-environment') {
      const envPrompt = `Create a professional luxury Product Showcase background environment for social media:

Environment Description: ${environmentPrompt}
Visual Style: ${videoStyle}
Format: Square 1080x1080 for Instagram/Social Media

REQUIREMENTS:
- Ultra high quality professional studio photography background
- Luxury and premium aesthetic with sophisticated elegance
- ${videoStyle} visual treatment and mood
- Smooth gradients and professional studio lighting
- Perfect for product overlay - complementary colors that enhance visibility
- Clean, elegant composition without distracting elements
- Subtle depth and dimension for visual interest
- Commercial photography quality
- 1080x1080 square format optimized

OUTPUT: Professional luxury background environment, 1080x1080, ready for product composition.`;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-image-preview',
          messages: [
            { role: 'user', content: envPrompt }
          ],
          modalities: ['image', 'text'],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: 'Limite de taux dépassée, réessayez dans un moment' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: 'Crédits insuffisants, veuillez recharger' }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const errorText = await response.text();
        console.error('Environment generation error:', response.status, errorText);
        throw new Error(`Environment generation failed: ${response.status}`);
      }

      const data = await response.json();
      const environmentImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (!environmentImageUrl) {
        throw new Error('No environment image generated');
      }

      console.log('Environment generated successfully');

      return new Response(
        JSON.stringify({
          environmentImage: environmentImageUrl,
          step: 'generate-environment',
          processed: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================================
    // ÉTAPE 3: Composition finale
    // ============================================================
    if (step === 'compose-final') {
      const compositionPrompt = `Compose a professional Product Showcase video frame by expertly combining these two images:

IMAGE 1 (PRODUCT - Foreground): High-quality enhanced product photo
IMAGE 2 (ENVIRONMENT - Background): Professional luxury background

COMPOSITION REQUIREMENTS:
- Product must be the clear focal point, perfectly centered and prominent
- Product in foreground with sharp focus and perfect detail preservation
- Environment as elegant backdrop that enhances without overpowering
- Professional depth of field effect - product sharp, background subtle
- Harmonious color integration and lighting coherence
- Balance composition following rule of thirds
- Natural placement - product appears professionally placed in luxury environment
- Camera Effect: ${cameraEffect} - optimize composition for this animation
- 1080x1080 square format for social media
- Ultra high resolution, commercial quality
- Ready for ${cameraEffect} camera animation overlay

OUTPUT: Complete professional Product Showcase frame, 1080x1080, product + environment perfectly composed.`;

      const messages = [
        {
          role: 'user',
          content: [
            { type: 'text', text: compositionPrompt },
            { type: 'image_url', image_url: { url: productImage } },
            { type: 'image_url', image_url: { url: environmentImage } }
          ]
        }
      ];

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-image-preview',
          messages: messages,
          modalities: ['image', 'text'],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: 'Limite de taux dépassée, réessayez dans un moment' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: 'Crédits insuffisants, veuillez recharger' }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const errorText = await response.text();
        console.error('Composition error:', response.status, errorText);
        throw new Error(`Composition failed: ${response.status}`);
      }

      const data = await response.json();
      const finalImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (!finalImageUrl) {
        throw new Error('No composed image generated');
      }

      console.log('Final composition completed successfully');

      return new Response(
        JSON.stringify({
          composedImage: finalImageUrl,
          step: 'compose-final',
          processed: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fallback: retour d'erreur pour étape inconnue
    return new Response(
      JSON.stringify({ error: `Unknown step: ${step}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
