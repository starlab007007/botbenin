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
    const dispatchedRecipients = new Set<string>(); // dedupe per recipient

    for (const p of profiles || []) {
      // Skip self-notification: the buyer profile belongs to the seller
      if (p.user_id && article.seller_id && p.user_id === article.seller_id) continue;
      // CRITICAL: skip profiles without keywords (they would match every article → spam)
      if (!Array.isArray(p.keywords) || p.keywords.length === 0) continue;
      const text = (article.title + ' ' + (article.brand || '') + ' ' + (article.model || '')).toLowerCase();
      const kwMatch = p.keywords.some((k: string) => k && text.includes(String(k).toLowerCase()));
      const priceMatch = (!p.price_min || article.price >= p.price_min) && (!p.price_max || article.price <= p.price_max);
      const already = p.notified_article_ids?.includes(article_id);
      if (!kwMatch || !priceMatch || already) continue;

      // Always mark this profile as notified to prevent retries
      await supabase.from('waouh_buyer_profiles').update({
        notified_article_ids: [...(p.notified_article_ids || []), article_id],
      }).eq('id', p.id);

      // Dedupe per recipient (same buyer with several matching profiles → 1 notif)
      const recipientKey = p.user_id || p.contact_phone || p.id;
      if (dispatchedRecipients.has(recipientKey)) continue;
      dispatchedRecipients.add(recipientKey);

      // Dispatch to BUYER only (carries photos + right channel).
      // We DO NOT notify the seller here: a keyword match is not a real interest.
      // The seller is notified by waouh-channel-in only when an actual buyer
      // sends a message in the article-scoped chat.
      fetch(`${SUPABASE_URL}/functions/v1/waouh-notify-dispatch`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${SERVICE_ROLE}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'match', article_id, buyer_profile_id: p.id, recipient: 'buyer',
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
