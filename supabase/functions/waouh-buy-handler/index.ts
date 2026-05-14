import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { phone, message, location } = await req.json();
    if (!phone || !message) {
      return new Response(JSON.stringify({ error: 'phone & message required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Upsert buyer
    const { data: existing } = await supabase.from('waouh_users').select('*').eq('phone', phone).maybeSingle();
    let userId = existing?.id;
    if (!userId) {
      const { data: created } = await supabase.from('waouh_users').insert({ phone }).select().single();
      userId = created.id;
    }

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

    // Save buyer profile
    await supabase.from('waouh_buyer_profiles').insert({
      user_id: userId,
      query_text: message,
      keywords: q.keywords || [],
      price_min: q.price_min,
      price_max: q.price_max,
      location: location ? `SRID=4326;POINT(${location.lng} ${location.lat})` : null,
      radius_km: q.radius_km || 30,
      is_active: true,
    });

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
