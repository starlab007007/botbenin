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
      phone, message, photos = [], location,
      source_channel = 'waouh_app',
      partner_id = null,
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

    // Resolve seller waouh_users.id (by phone or by provided id)
    let userId = waouh_user_id;
    if (!userId && normalizedPhone) {
      const { data: existing } = await supabase.from('waouh_users').select('id').eq('phone', normalizedPhone).maybeSingle();
      userId = existing?.id;
      if (!userId) {
        const { data: created, error } = await supabase.from('waouh_users').insert({
          phone: normalizedPhone,
          location: location ? `SRID=4326;POINT(${location.lng} ${location.lat})` : null,
          city: location?.city || null,
        }).select().single();
        if (error) throw error;
        userId = created.id;
      }
    }

    // Rehost all incoming photos to our stable bucket so the SAME URLs are
    // used in WhatsApp messages and in-app cards.
    const stablePhotos = await rehostPhotos(supabase, photos, { wahaBaseUrl: WAHA_BASE_URL, wahaApiKey: WAHA_API_KEY });

    // AI extraction
    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: 'Tu extrais des annonces de vente. Réponds UNIQUEMENT en JSON avec: title, category (smartphone|ordinateur|vetement|vehicule|electromenager|meuble|autre), brand, model, condition (neuf|tres_bon|bon|moyen|use), price (number FCFA), description.' },
          { role: 'user', content: message },
        ],
        response_format: { type: 'json_object' },
      }),
    });
    if (!aiRes.ok) {
      const t = await aiRes.text();
      return new Response(JSON.stringify({ error: 'AI failed', detail: t }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const aiData = await aiRes.json();
    const extracted = JSON.parse(aiData.choices[0].message.content);

    // Insert article with channel-aware contact identity
    const { data: article, error: artErr } = await supabase.from('waouh_articles').insert({
      seller_id: userId,
      title: extracted.title,
      category: extracted.category || 'autre',
      brand: extracted.brand,
      model: extracted.model,
      condition: extracted.condition || 'bon',
      price: extracted.price || 0,
      currency: 'XOF',
      photos: stablePhotos,
      location: location ? `SRID=4326;POINT(${location.lng} ${location.lat})` : null,
      city: location?.city,
      status: 'active',
      expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      source_channel,
      contact_whatsapp: normalizedPhone,
      partner_id,
    }).select().single();
    if (artErr) throw artErr;

    // Confirmation to the seller (same photos, right channel) — fire & forget
    fetch(`${SUPABASE_URL}/functions/v1/waouh-notify-dispatch`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${SERVICE_ROLE}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'sale_published', article_id: article.id, recipient: 'seller' }),
    }).catch(() => {});

    // Match buyers
    fetch(`${SUPABASE_URL}/functions/v1/waouh-notify-buyers`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${SERVICE_ROLE}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ article_id: article.id }),
    }).catch(() => {});

    return new Response(JSON.stringify({
      success: true,
      article,
      reply: `✅ Annonce publiée !\n📦 ${article.title}\n💰 ${article.price} FCFA\n⏱️ Valide 7 jours`,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
