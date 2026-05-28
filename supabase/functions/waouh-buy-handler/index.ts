import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { rehostPhotos, normalizeBeninPhone } from '../_shared/waouhContact.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const WAHA_BASE_URL = Deno.env.get('WAHA_BASE_URL') || '';
const WAHA_API_KEY = Deno.env.get('WAHA_API_KEY') || '';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await req.json();
    const {
      phone, message, location,
      reference_photos = [],
      source_channel = 'waouh_app',
      waouh_user_id = null,
    } = body || {};

    if (!phone && !waouh_user_id) {
      return new Response(JSON.stringify({ error: 'phone or waouh_user_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!message) {
      return new Response(JSON.stringify({ error: 'message required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const normalizedPhone = phone ? normalizeBeninPhone(phone) : null;

    // Upsert buyer
    let userId = waouh_user_id;
    if (!userId && normalizedPhone) {
      const { data: existing } = await supabase.from('waouh_users').select('*').eq('phone', normalizedPhone).maybeSingle();
      userId = existing?.id;
      if (!userId) {
        const { data: created } = await supabase.from('waouh_users').insert({ phone: normalizedPhone }).select().single();
        userId = created.id;
      }
    }

    // Rehost reference photos to stable bucket (kept identical across channels)
    const stableRefs = await rehostPhotos(supabase, reference_photos, { wahaBaseUrl: WAHA_BASE_URL, wahaApiKey: WAHA_API_KEY });

    // AI parse query
    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Tu extrais une recherche d\'achat. JSON: keywords (array), category, price_min, price_max, radius_km (default 30).' },
          { role: 'user', content: message },
        ],
        response_format: { type: 'json_object' },
      }),
    });
    const aiData = await aiRes.json();
    const q = JSON.parse(aiData.choices[0].message.content);

    // Save buyer profile with channel + contact + reference photos
    const { data: profile } = await supabase.from('waouh_buyer_profiles').insert({
      user_id: userId,
      query_text: message,
      keywords: q.keywords || [],
      price_min: q.price_min,
      price_max: q.price_max,
      location: location ? `SRID=4326;POINT(${location.lng} ${location.lat})` : null,
      radius_km: q.radius_km || 30,
      is_active: true,
      source_channel,
      contact_whatsapp: normalizedPhone,
      reference_photos: stableRefs,
    }).select().single();

    // Search active articles
    let query = supabase.from('waouh_articles').select('*').eq('status', 'active');
    if (q.category) query = query.eq('category', q.category);
    if (q.price_min) query = query.gte('price', q.price_min);
    if (q.price_max) query = query.lte('price', q.price_max);
    const { data: articles } = await query.limit(10);

    const matches = (articles || []).filter(a =>
      !q.keywords?.length || q.keywords.some((k: string) =>
        (a.title + ' ' + (a.brand || '') + ' ' + (a.model || '')).toLowerCase().includes(k.toLowerCase())
      )
    );

    // For each match, dispatch a notification carrying the same photos[] to
    // both seller (new_buyer) and buyer (match) on the correct channels.
    for (const a of matches.slice(0, 5)) {
      fetch(`${SUPABASE_URL}/functions/v1/waouh-notify-dispatch`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${SERVICE_ROLE}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'match', article_id: a.id, buyer_profile_id: profile?.id, recipient: 'buyer' }),
      }).catch(() => {});
      fetch(`${SUPABASE_URL}/functions/v1/waouh-notify-dispatch`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${SERVICE_ROLE}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'new_buyer', article_id: a.id, buyer_profile_id: profile?.id, recipient: 'seller' }),
      }).catch(() => {});
    }

    const reply = matches.length
      ? `🔎 ${matches.length} résultat(s):\n` + matches.slice(0, 5).map(a => `• ${a.title} - ${a.price} FCFA (${a.city || 'N/A'})`).join('\n')
      : `🕵️ Aucun résultat pour le moment. Tu seras notifié dès qu\'une annonce correspond.`;

    return new Response(JSON.stringify({ success: true, matches, reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
