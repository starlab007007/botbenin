import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { article_id, query } = await req.json();
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    let context = query;
    let article: any = null;
    if (article_id) {
      const { data } = await supabase.from('waouh_articles').select('*').eq('id', article_id).single();
      article = data;
      context = `${data.title} ${data.brand || ''} ${data.model || ''} état ${data.condition}`;
    }

    // Cache check
    const cacheKey = `price:${context}`.slice(0, 200);
    const { data: cached } = await supabase.from('waouh_cache').select('value, expires_at').eq('cache_key', cacheKey).maybeSingle();
    if (cached && new Date(cached.expires_at) > new Date()) {
      return new Response(JSON.stringify({ success: true, cached: true, ...(cached.value as any) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // AI estimate
    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Tu estimes les prix marché au Bénin (FCFA/XOF). JSON: { min, max, average, sources (array de string), notes }.' },
          { role: 'user', content: `Estime le prix marché de: ${context}` },
        ],
        response_format: { type: 'json_object' },
      }),
    });
    const aiData = await aiRes.json();
    const estimate = JSON.parse(aiData.choices[0].message.content);

    // Cache 24h
    await supabase.from('waouh_cache').upsert({
      cache_key: cacheKey,
      value: estimate,
      expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    });

    if (article) {
      await supabase.from('waouh_articles').update({
        market_price_min: estimate.min, market_price_max: estimate.max,
      }).eq('id', article.id);
    }

    return new Response(JSON.stringify({
      success: true,
      ...estimate,
      reply: `📊 Prix marché: ${estimate.min} - ${estimate.max} FCFA (moy. ${estimate.average})\n${estimate.notes || ''}`,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
