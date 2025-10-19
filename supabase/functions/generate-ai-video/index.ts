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
      environmentImage,
      videoType = 'product-showcase',
      generateElements = false,
      textOverlay,
      exportFormat = '1080x1080'
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

    console.log(`Processing step: ${step}, videoType: ${videoType}, format: ${exportFormat}...`);

    // ============================================================
    // ÉTAPE 1: Amélioration du produit
    // ============================================================
    if (step === 'enhance-product') {
      const videoTypeDescriptions = {
        'product-showcase': 'luxury Product Showcase presentation',
        'story-telling': 'narrative Story Telling context',
        'dynamic-ad': 'energetic Dynamic Advertisement',
        'minimal-elegant': 'sophisticated Minimal Elegant design'
      };

      const enhancementPrompt = prompt || `Enhance this product image to professional marketing quality for ${videoTypeDescriptions[videoType]}:

Product: ${description || 'product in image'}
Video Type: ${videoType}
Visual Style: ${videoStyle}
Camera Effect: ${cameraEffect}
Export Format: ${exportFormat}

CRITICAL ENHANCEMENTS FOR ${videoType.toUpperCase()}:
1. Image Quality:
   - Ultra high resolution and maximum sharpness
   - Remove all noise, blur, and imperfections
   - Professional product photography standards
   
2. Visual Enhancement:
   - Optimize colors, contrast, and lighting for ${videoStyle} aesthetic
   - Make product stand out with clarity and dramatic impact
   - Professional studio-quality color grading
   
3. Composition for ${videoType}:
   ${videoType === 'product-showcase' ? '- Center product perfectly for luxury presentation' : ''}
   ${videoType === 'story-telling' ? '- Position for contextual narrative placement' : ''}
   ${videoType === 'dynamic-ad' ? '- Dynamic composition for energetic movement' : ''}
   ${videoType === 'minimal-elegant' ? '- Clean, centered composition for minimalist design' : ''}
   - Perfect aspect ratio for ${exportFormat} format
   - Maximize product detail visibility

OUTPUT: Professional-grade enhanced product image optimized for ${videoType} video, ${exportFormat} format.`;

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
      const videoTypeEnvironments = {
        'product-showcase': 'Luxury professional studio background with premium aesthetic',
        'story-telling': 'Contextual realistic scene that tells a compelling story',
        'dynamic-ad': 'Energetic dynamic background with bold visual impact',
        'minimal-elegant': 'Minimalist abstract sophisticated background'
      };

      const formatDimensions = {
        '1080x1080': { width: 1080, height: 1080, name: 'Square (Instagram Feed)' },
        '1080x1920': { width: 1080, height: 1920, name: 'Vertical (Stories/Reels)' },
        '1920x1080': { width: 1920, height: 1080, name: 'Horizontal (YouTube/Facebook)' }
      };

      const format = formatDimensions[exportFormat] || formatDimensions['1080x1080'];

      const envPrompt = `Create a professional ${videoTypeEnvironments[videoType]} for social media promotional video:

Video Type: ${videoType}
Environment Description: ${environmentPrompt}
Visual Style: ${videoStyle}
Format: ${format.name} - ${format.width}x${format.height}

REQUIREMENTS FOR ${videoType.toUpperCase()}:
- Ultra high quality professional photography background
- ${videoTypeEnvironments[videoType]}
- ${videoStyle} visual treatment and mood
${videoType === 'product-showcase' ? '- Smooth gradients, professional studio lighting, luxury feel' : ''}
${videoType === 'story-telling' ? '- Realistic contextual scene, storytelling atmosphere' : ''}
${videoType === 'dynamic-ad' ? '- Bold colors, energetic patterns, high contrast' : ''}
${videoType === 'minimal-elegant' ? '- Clean lines, geometric shapes, sophisticated simplicity' : ''}
- Perfect for product overlay - complementary colors
- No distracting elements - focus on creating perfect backdrop
- Subtle depth and dimension for visual interest
- Commercial photography quality
- ${format.width}x${format.height} format optimized

OUTPUT: Professional ${videoType} background environment, ${format.width}x${format.height}, ready for product composition.`;

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
    // ÉTAPE 3: Génération des éléments visuels (si demandé)
    // ============================================================
    if (step === 'generate-elements' && generateElements) {
      const videoTypeElements = {
        'product-showcase': 'Subtle luxury particles, elegant light rays, premium bokeh effects',
        'story-telling': 'Contextual decorative elements that enhance the narrative',
        'dynamic-ad': 'Dynamic shapes, energetic particles, bold graphic elements',
        'minimal-elegant': 'Minimal geometric shapes, subtle lines, sophisticated accents'
      };

      const elementsPrompt = `Generate visual enhancement elements for ${videoType} promotional video:

Video Type: ${videoType}
Visual Style: ${videoStyle}
Elements: ${videoTypeElements[videoType]}

REQUIREMENTS:
- Transparent PNG with alpha channel
- Visual elements only (no text)
- ${videoTypeElements[videoType]}
- Complementary to ${videoStyle} aesthetic
- Non-intrusive - enhance without overpowering
- Professional commercial quality
- Format: ${exportFormat}

OUTPUT: Transparent PNG layer with enhancement elements for ${videoType}.`;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-image-preview',
          messages: [
            { role: 'user', content: elementsPrompt }
          ],
          modalities: ['image', 'text'],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Elements generation error:', response.status, errorText);
        // Ne pas échouer si les éléments ne se génèrent pas - c'est optionnel
        return new Response(
          JSON.stringify({
            elementsImage: null,
            step: 'generate-elements',
            processed: true,
            skipped: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      const elementsImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      console.log('Elements generated successfully');

      return new Response(
        JSON.stringify({
          elementsImage: elementsImageUrl,
          step: 'generate-elements',
          processed: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================================
    // ÉTAPE 4: Composition finale
    // ============================================================
    if (step === 'compose-final') {
      const videoTypeComposition = {
        'product-showcase': 'Luxury Product Showcase with product as clear focal point in premium setting',
        'story-telling': 'Story Telling composition with product naturally integrated in narrative scene',
        'dynamic-ad': 'Dynamic Advertisement with bold, energetic product presentation',
        'minimal-elegant': 'Minimal Elegant design with sophisticated simplicity and product emphasis'
      };

      const compositionPrompt = `Compose a professional ${videoType} video frame by expertly combining these images:

IMAGE 1 (PRODUCT - Foreground): High-quality enhanced product photo
IMAGE 2 (ENVIRONMENT - Background): Professional ${videoType} background

Video Type: ${videoType}
Composition Style: ${videoTypeComposition[videoType]}
Camera Effect: ${cameraEffect}
Format: ${exportFormat}

COMPOSITION REQUIREMENTS FOR ${videoType.toUpperCase()}:
- Product must be the clear focal point with perfect prominence
${videoType === 'product-showcase' ? '- Luxury presentation - product perfectly centered with premium aesthetic' : ''}
${videoType === 'story-telling' ? '- Natural contextual placement - product integrated seamlessly in scene' : ''}
${videoType === 'dynamic-ad' ? '- Bold dynamic placement - energetic and eye-catching positioning' : ''}
${videoType === 'minimal-elegant' ? '- Centered minimalist composition - clean and sophisticated' : ''}
- Professional depth of field effect - product sharp, background complementary
- Harmonious color integration and perfect lighting coherence
- Balance composition following rule of thirds where appropriate
- Product appears professionally placed in ${videoType} environment
- Optimized for ${cameraEffect} camera animation
- ${exportFormat} format for social media
- Ultra high resolution, commercial quality
${textOverlay ? `\n- Leave space for text overlay: ${textOverlay.title ? 'Title area' : ''} ${textOverlay.subtitle ? 'Subtitle area' : ''} ${textOverlay.cta ? 'CTA area' : ''}` : ''}

OUTPUT: Complete professional ${videoType} frame, ${exportFormat}, product + environment perfectly composed.`;

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
