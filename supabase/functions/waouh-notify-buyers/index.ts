// waouh-notify-buyers
// Pure matcher: notifies active buyer profiles when a new item is available.
//
// Two entrypoints (mutually exclusive payload):
//  - { article_id }   → matches a fresh waouh_articles row (C2C / radar promoted)
//  - { catalog_id }   → matches a fresh waouh_unified_catalog row
//                       (partner products, SerpAPI radar listings…)
//
// In both cases we delegate the actual push (in-app row + WAHA) to
// waouh-notify-dispatch so the payload (photos + channel) stays consistent.
//
// We do NOT notify the seller here: a keyword match is not an interest.
// The seller is only notified by waouh-channel-in / waouh-webhook when an
// actual buyer manifests his interest.

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

type Item = {
  id: string;
  source: 'article' | 'catalog';
  text: string;          // haystack used for keyword matching
  price: number | null;
  seller_id: string | null;
};

function matchProfile(p: any, item: Item): boolean {
  if (!Array.isArray(p.keywords) || p.keywords.length === 0) return false;
  const kwMatch = p.keywords.some((k: string) => k && item.text.includes(String(k).toLowerCase()));
  if (!kwMatch) return false;
  if (item.price != null) {
    if (p.price_min && item.price < p.price_min) return false;
    if (p.price_max && item.price > p.price_max) return false;
  }
  return true;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const articleId: string | null = body?.article_id ?? null;
    const catalogId: string | null = body?.catalog_id ?? null;
    if (!articleId && !catalogId) {
      return new Response(JSON.stringify({ error: 'article_id or catalog_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    let item: Item | null = null;

    if (articleId) {
      const { data: a } = await supabase.from('waouh_articles').select('*').eq('id', articleId).maybeSingle();
      if (!a) return new Response(JSON.stringify({ error: 'article not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      item = {
        id: a.id,
        source: 'article',
        text: ((a.title || '') + ' ' + (a.brand || '') + ' ' + (a.model || '') + ' ' + (a.description || '')).toLowerCase(),
        price: typeof a.price === 'number' ? a.price : null,
        seller_id: a.seller_id ?? null,
      };
    } else if (catalogId) {
      const { data: c } = await supabase
        .from('waouh_unified_catalog')
        .select('id, titre, description, categorie, tags, prix_min, prix_max, source, partner_id, business_id, source_ref_id, is_active')
        .eq('id', catalogId)
        .maybeSingle();
      if (!c || c.is_active === false) {
        return new Response(JSON.stringify({ error: 'catalog item not found or inactive' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const tags = Array.isArray((c as any).tags) ? (c as any).tags.join(' ') : '';
      item = {
        id: c.id,
        source: 'catalog',
        text: ((c.titre || '') + ' ' + (c.description || '') + ' ' + (c.categorie || '') + ' ' + tags).toLowerCase(),
        price: (typeof (c as any).prix_min === 'number' ? (c as any).prix_min : null)
            ?? (typeof (c as any).prix_max === 'number' ? (c as any).prix_max : null),
        // For partner items the seller is the business, not a waouh_users id.
        // We use source_ref_id to scope self-notification skip when applicable.
        seller_id: (c as any).source_ref_id ?? null,
      };
    }

    if (!item) {
      return new Response(JSON.stringify({ error: 'no item resolved' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: profiles } = await supabase.from('waouh_buyer_profiles').select('*').eq('is_active', true);
    const matched: string[] = [];
    const dispatchedRecipients = new Set<string>();

    for (const p of profiles || []) {
      // Skip self-notification when possible
      if (p.user_id && item.seller_id && p.user_id === item.seller_id) continue;
      if (!matchProfile(p, item)) continue;
      // Dedupe: notified_article_ids stores both article IDs and catalog IDs
      // (UUIDs from different tables don't collide).
      const already = Array.isArray(p.notified_article_ids) && p.notified_article_ids.includes(item.id);
      if (already) continue;

      // Mark as notified up-front to avoid retries on transient errors
      await supabase.from('waouh_buyer_profiles').update({
        notified_article_ids: [...(p.notified_article_ids || []), item.id],
      }).eq('id', p.id);

      const recipientKey = p.user_id || p.contact_phone || p.id;
      if (dispatchedRecipients.has(recipientKey)) continue;
      dispatchedRecipients.add(recipientKey);

      const dispatchBody: Record<string, any> = {
        kind: 'match',
        buyer_profile_id: p.id,
        recipient: 'buyer',
      };
      if (item.source === 'article') dispatchBody.article_id = item.id;
      else dispatchBody.catalog_id = item.id;

      fetch(`${SUPABASE_URL}/functions/v1/waouh-notify-dispatch`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${SERVICE_ROLE}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(dispatchBody),
      }).catch(() => {});

      matched.push(p.id);
    }

    return new Response(JSON.stringify({ success: true, notified: matched.length, source: item.source }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
