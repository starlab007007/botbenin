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
    const { variants } = await req.json();
    
    if (!variants || !Array.isArray(variants)) {
      return new Response(
        JSON.stringify({ error: 'Les variantes sont requises' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY non configurée');
    }

    console.log('🎨 Génération de', variants.length, 'variantes en parallèle');

    // Générer toutes les variantes en parallèle
    const promises = variants.map(async (variant: { name: string; prompt: string }) => {
      try {
        console.log(`📸 Génération ${variant.name}...`);
        
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
                content: [{ type: 'text', text: variant.prompt }]
              }
            ],
            modalities: ['image', 'text']
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Erreur ${variant.name}:`, response.status, errorText);
          
          return {
            name: variant.name,
            success: false,
            error: `Erreur API: ${response.status}`,
            imageUrl: null
          };
        }

        const data = await response.json();
        const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        
        if (!imageUrl) {
          return {
            name: variant.name,
            success: false,
            error: 'Aucune image générée',
            imageUrl: null
          };
        }

        console.log(`✅ ${variant.name} générée avec succès`);
        
        return {
          name: variant.name,
          success: true,
          imageUrl,
          prompt: variant.prompt
        };

      } catch (error) {
        console.error(`❌ Exception ${variant.name}:`, error);
        return {
          name: variant.name,
          success: false,
          error: error instanceof Error ? error.message : 'Erreur inconnue',
          imageUrl: null
        };
      }
    });

    const results = await Promise.all(promises);
    
    const successCount = results.filter(r => r.success).length;
    console.log(`✅ ${successCount}/${results.length} variantes générées avec succès`);

    return new Response(
      JSON.stringify({ 
        success: true,
        results,
        summary: {
          total: results.length,
          successful: successCount,
          failed: results.length - successCount
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Erreur génération variantes:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
