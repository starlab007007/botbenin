import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { article_id, buyer_phone, offered_price, message } = await req.json();
    if (!article_id || !buyer_phone) {
      return new Response(JSON.stringify({ error: 'article_id & buyer_phone required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: article } = await supabase.from('waouh_articles').select('*').eq('id', article_id).single();
    if (!article) {
      return new Response(JSON.stringify({ error: 'article not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // AI suggest counter
    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Tu négocies des prix au Bénin. Réponds JSON: { fair_price, counter_offer, advice (court, en français) }.' },
          { role: 'user', content: `Article: ${article.title} ${article.brand || ''} ${article.model || ''}, prix demandé: ${article.price} FCFA. Acheteur propose: ${offered_price} FCFA. Marché ${article.market_price_min || '?'}-${article.market_price_max || '?'}. Message: ${message || ''}` },
        ],
        response_format: { type: 'json_object' },
      }),
    });
    const aiData = await aiRes.json();
    const negotiation = JSON.parse(aiData.choices[0].message.content);

    return new Response(JSON.stringify({
      success: true,
      article_price: article.price,
      offered_price,
      ...negotiation,
      reply: `💬 ${negotiation.advice}\n💡 Contre-offre suggérée: ${negotiation.counter_offer} FCFA`,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
