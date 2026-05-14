import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { article_id } = await req.json();
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: article } = await supabase.from('waouh_articles').select('*').eq('id', article_id).single();
    if (!article) return new Response(JSON.stringify({ error: 'not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: profiles } = await supabase.from('waouh_buyer_profiles').select('*, user:waouh_users!user_id(*)').eq('is_active', true);
    const matched: any[] = [];
    for (const p of profiles || []) {
      const text = (article.title + ' ' + (article.brand || '') + ' ' + (article.model || '')).toLowerCase();
      const kwMatch = !p.keywords?.length || p.keywords.some((k: string) => text.includes(k.toLowerCase()));
      const priceMatch = (!p.price_min || article.price >= p.price_min) && (!p.price_max || article.price <= p.price_max);
      if (kwMatch && priceMatch && !p.notified_article_ids?.includes(article_id)) {
        matched.push(p);
        await supabase.from('waouh_notifications').insert({
          user_id: p.user_id, article_id, notification_type: 'match',
        });
        await supabase.from('waouh_buyer_profiles').update({
          notified_article_ids: [...(p.notified_article_ids || []), article_id],
        }).eq('id', p.id);
      }
    }
    return new Response(JSON.stringify({ success: true, notified: matched.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
