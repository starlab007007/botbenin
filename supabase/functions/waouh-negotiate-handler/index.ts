import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { geminiJson } from '../_shared/gemini.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

    const deterministicCounter = Math.round((Number(article.price || 0) + Number(offered_price || 0)) / 2);
    const negotiation: any = await geminiJson(
      'Tu négocies des prix au Bénin. Réponds JSON: { fair_price, counter_offer, advice (court, en français) }.',
      `Article: ${article.title} ${article.brand || ''} ${article.model || ''}, prix demandé: ${article.price} FCFA. Acheteur propose: ${offered_price} FCFA. Marché ${article.market_price_min || '?'}-${article.market_price_max || '?'}. Message: ${message || ''}`,
      { fair_price: deterministicCounter, counter_offer: deterministicCounter, advice: 'Proposition calculée entre le prix affiché et votre offre.' },
    );

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
