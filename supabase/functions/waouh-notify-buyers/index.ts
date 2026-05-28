// waouh-notify-buyers
// Pure matcher: finds buyer profiles matching a freshly-published article,
// then delegates the actual notification (photos + channel) to
// waouh-notify-dispatch so the same payload reaches WhatsApp + in-app.

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { article_id } = await req.json();
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: article } = await supabase.from('waouh_articles').select('*').eq('id', article_id).maybeSingle();
    if (!article) {
      return new Response(JSON.stringify({ error: 'not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: profiles } = await supabase.from('waouh_buyer_profiles').select('*').eq('is_active', true);
    const matched: string[] = [];

    for (const p of profiles || []) {
      const text = (article.title + ' ' + (article.brand || '') + ' ' + (article.model || '')).toLowerCase();
      const kwMatch = !p.keywords?.length || p.keywords.some((k: string) => text.includes(k.toLowerCase()));
      const priceMatch = (!p.price_min || article.price >= p.price_min) && (!p.price_max || article.price <= p.price_max);
      const already = p.notified_article_ids?.includes(article_id);
      if (!kwMatch || !priceMatch || already) continue;

      // Mark notified BEFORE dispatch to avoid double-send on retry
      await supabase.from('waouh_buyer_profiles').update({
        notified_article_ids: [...(p.notified_article_ids || []), article_id],
      }).eq('id', p.id);

      // Dispatch to buyer (carries photos + right channel)
      fetch(`${SUPABASE_URL}/functions/v1/waouh-notify-dispatch`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${SERVICE_ROLE}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'match', article_id, buyer_profile_id: p.id, recipient: 'buyer',
        }),
      }).catch(() => {});

      // Dispatch to seller — "nouvel acheteur trouvé !"
      fetch(`${SUPABASE_URL}/functions/v1/waouh-notify-dispatch`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${SERVICE_ROLE}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'new_buyer', article_id, buyer_profile_id: p.id, recipient: 'seller',
        }),
      }).catch(() => {});

      matched.push(p.id);
    }

    return new Response(JSON.stringify({ success: true, notified: matched.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
