import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { phone, message, photos = [], location } = await req.json();
    if (!phone || !message) {
      return new Response(JSON.stringify({ error: 'phone & message required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Upsert seller
    const { data: existing } = await supabase.from('waouh_users').select('*').eq('phone', phone).maybeSingle();
    let userId = existing?.id;
    if (!userId) {
      const { data: created, error } = await supabase.from('waouh_users').insert({
        phone,
        location: location ? `SRID=4326;POINT(${location.lng} ${location.lat})` : null,
        city: location?.city || null,
      }).select().single();
      if (error) throw error;
      userId = created.id;
    }

    // AI extraction
    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
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

    // Insert article
    const { data: article, error: artErr } = await supabase.from('waouh_articles').insert({
      seller_id: userId,
      title: extracted.title,
      category: extracted.category || 'autre',
      brand: extracted.brand,
      model: extracted.model,
      condition: extracted.condition || 'bon',
      price: extracted.price || 0,
      currency: 'XOF',
      photos,
      location: location ? `SRID=4326;POINT(${location.lng} ${location.lat})` : null,
      city: location?.city,
      status: 'active',
      expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    }).select().single();
    if (artErr) throw artErr;

    // Trigger buyer notification (fire & forget)
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
