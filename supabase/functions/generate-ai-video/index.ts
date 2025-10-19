import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to extract image from various API response formats
function extractImageFromResponse(data: any, fallbackUrl?: string): string | null {
  console.log('🔍 Extracting image from response structure...');
  console.log('Response data structure:', JSON.stringify(data, null, 2).substring(0, 500));
  
  // Try multiple possible paths
  const possiblePaths = [
    // Gemini image generation format
    () => data.choices?.[0]?.message?.images?.[0]?.image_url?.url,
    // Alternative format
    () => data.choices?.[0]?.message?.content?.[0]?.image_url?.url,
    // Direct image URL
    () => data.image_url,
    () => data.url,
    // Check if content is an array with image
    () => {
      const content = data.choices?.[0]?.message?.content;
      if (Array.isArray(content)) {
        const imageContent = content.find((c: any) => c.type === 'image_url');
        return imageContent?.image_url?.url;
      }
      return null;
    }
  ];

  for (const pathGetter of possiblePaths) {
    try {
      const result = pathGetter();
      if (result && typeof result === 'string') {
        console.log('✅ Image extracted successfully, type:', result.startsWith('data:') ? 'base64' : 'URL');
        console.log('Image preview:', result.substring(0, 100));
        return result;
      }
    } catch (e) {
      // Continue to next path
    }
  }

  console.warn('⚠️ No image found in any known path, using fallback');
  return fallbackUrl || null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let body;
    try {
      body = await req.json();
    } catch (jsonError) {
      console.error('Invalid JSON body:', jsonError);
      return new Response(
        JSON.stringify({ error: 'Corps de requête JSON invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
    } = body;

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

      const enhancementPrompt = prompt || `Extract and enhance ONLY the product from this image with COMPLETE BACKGROUND REMOVAL:

Product: ${description || 'product in image'}
Video Type: ${videoType}
Visual Style: ${videoStyle}
Camera Effect: ${cameraEffect}
Export Format: ${exportFormat}

CRITICAL REQUIREMENTS FOR ${videoType.toUpperCase()}:
1. BACKGROUND REMOVAL (PRIORITY #1):
   - COMPLETELY REMOVE all background - must be 100% transparent
   - Extract ONLY the product object itself
   - No white background, no colored background - ONLY transparent
   - Clean cutout edges with perfect anti-aliasing
   - Product must be isolated for compositing
   
2. Product Enhancement:
   - Ultra high resolution and maximum sharpness
   - Optimize colors, contrast, and lighting for ${videoStyle} aesthetic
   - Professional product photography quality
   - Studio-grade color grading
   - Remove noise, blur, and imperfections from product only
   
3. Composition for ${videoType}:
   ${videoType === 'product-showcase' ? '- Center product perfectly for luxury presentation' : ''}
   ${videoType === 'story-telling' ? '- Position for contextual narrative placement' : ''}
   ${videoType === 'dynamic-ad' ? '- Dynamic composition for energetic movement' : ''}
   ${videoType === 'minimal-elegant' ? '- Clean, centered composition for minimalist design' : ''}
   - Perfect aspect ratio for ${exportFormat} format
   - Maximize product detail visibility

OUTPUT: High-quality product cutout with TRANSPARENT BACKGROUND, ready for ${videoType} video composition in ${exportFormat} format.`;

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
          modalities: ['image', 'text'],
          background: 'transparent',
          output_format: 'png'
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
      console.log('📦 API Response received for enhance-product');
      console.log('Response structure:', JSON.stringify({
        hasChoices: !!data.choices,
        choicesLength: data.choices?.length,
        hasMessage: !!data.choices?.[0]?.message,
        hasImages: !!data.choices?.[0]?.message?.images,
        imagesLength: data.choices?.[0]?.message?.images?.length
      }));
      
      const enhancedImageUrl = extractImageFromResponse(data, image);
      
      if (!enhancedImageUrl) {
        console.error('❌ Failed to extract enhanced image from response');
        throw new Error('No enhanced image in API response');
      }

      console.log('✅ Product enhanced successfully');

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
      console.log('📦 API Response received for generate-environment');
      
      const environmentImageUrl = extractImageFromResponse(data);

      if (!environmentImageUrl) {
        console.error('❌ Failed to extract environment image from response');
        throw new Error('No environment image generated by API');
      }

      console.log('✅ Environment generated successfully');

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
    if (step === 'generate-elements') {
      // Vérifier si les éléments sont vraiment demandés
      if (!generateElements) {
        return new Response(
          JSON.stringify({
            elementsImage: null,
            step: 'generate-elements',
            processed: true,
            skipped: true,
            message: 'Génération d\'éléments désactivée'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
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
      console.log('📦 API Response received for generate-elements');
      
      const elementsImageUrl = extractImageFromResponse(data);

      console.log('✅ Elements generated successfully');

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

      const compositionPrompt = `Compose a professional ${videoType} video frame by combining these TWO images:

IMAGE 1 (PRODUCT with TRANSPARENT/WHITE BACKGROUND): Enhanced product cutout
IMAGE 2 (ENVIRONMENT): Professional ${videoType} background scene

Video Type: ${videoType}
Composition Style: ${videoTypeComposition[videoType]}
Camera Effect: ${cameraEffect}
Format: ${exportFormat}

CRITICAL COMPOSITION STEPS FOR ${videoType.toUpperCase()}:

1. BACKGROUND REPLACEMENT (HIGHEST PRIORITY):
   - COMPLETELY REMOVE any white, transparent, or checkerboard background from the product image
   - REPLACE 100% of the product's background with the environment image
   - The product must be seamlessly integrated into the environment scene
   - NO white squares, NO transparency artifacts, NO background remnants visible
   - Product should appear as if photographed directly in this environment

2. Product Placement:
${videoType === 'product-showcase' ? '   - Center product perfectly for luxury presentation on the environment' : ''}
${videoType === 'story-telling' ? '   - Place product naturally within the environmental scene context' : ''}
${videoType === 'dynamic-ad' ? '   - Position product dynamically and prominently on the environment' : ''}
${videoType === 'minimal-elegant' ? '   - Center product with minimalist sophistication on clean background' : ''}
   - Product must be the clear focal point
   - Professional depth of field - product sharp, environment complementary

3. Visual Integration:
   - Match lighting between product and environment perfectly
   - Harmonious color grading and coherence
   - Natural shadows and reflections where appropriate
   - Professional commercial photography quality
   - Optimized for ${cameraEffect} camera animation
   - ${exportFormat} format for social media
${textOverlay ? `\n   - Leave space for text overlay: ${textOverlay.title ? 'Title area' : ''} ${textOverlay.subtitle ? 'Subtitle area' : ''} ${textOverlay.cta ? 'CTA area' : ''}` : ''}

OUTPUT: Seamless ${videoType} composition with product fully integrated into environment - ZERO white/transparent background visible, ${exportFormat} format.`;

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
      console.log('📦 API Response received for compose-final');
      
      const finalImageUrl = extractImageFromResponse(data);

      if (!finalImageUrl) {
        console.error('❌ Failed to extract composed image from response');
        throw new Error('No composed image generated by API');
      }

      console.log('✅ Final composition completed successfully');

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
    
    // Provide more detailed error messages
    let errorMessage = 'Erreur inconnue';
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Handle specific error types
      if (errorMessage.includes('timeout') || errorMessage.includes('fetch')) {
        errorMessage = 'Délai d\'attente dépassé. Veuillez réessayer.';
        statusCode = 504;
      } else if (errorMessage.includes('API key')) {
        errorMessage = 'Erreur de configuration API';
        statusCode = 500;
      } else if (errorMessage.includes('Invalid')) {
        errorMessage = 'Données invalides envoyées';
        statusCode = 400;
      }
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error instanceof Error ? error.message : String(error)
      }),
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
