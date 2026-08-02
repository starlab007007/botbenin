import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { rehostPhotos, normalizeBeninPhone } from '../_shared/waouhContact.ts';
import { distanceKm, formatDistance } from '../_shared/waouh-format.ts';
import { geminiJson } from '../_shared/gemini.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const WAHA_BASE_URL = Deno.env.get('WAHA_BASE_URL') || '';
const WAHA_API_KEY = Deno.env.get('WAHA_API_KEY') || '';

// Parse PostGIS WKB hex or text "POINT(lng lat)" — fast path for both formats.
function parsePoint(loc: any): { lat: number; lng: number } | null {
  if (!loc) return null;
  if (typeof loc === 'object') {
    if (typeof loc.coordinates?.[0] === 'number' && typeof loc.coordinates?.[1] === 'number') {
      return { lng: loc.coordinates[0], lat: loc.coordinates[1] };
    }
  }
  if (typeof loc === 'string') {
    const m = loc.match(/POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)/i);
    if (m) return { lng: parseFloat(m[1]), lat: parseFloat(m[2]) };
  }
  return null;
}

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

    // Rehost reference photos (async-friendly but kept inline because matches reference them).
    const stableRefs = await rehostPhotos(supabase, reference_photos, { wahaBaseUrl: WAHA_BASE_URL, wahaApiKey: WAHA_API_KEY });

    const fallbackKeywords = String(message).toLowerCase().match(/[\p{L}\d-]{3,}/gu)?.slice(0, 5) || [];
    const q: any = await geminiJson(
      'Extrais une recherche d\'achat. JSON: keywords (array), category, price_min, price_max, radius_km (default 30).',
      message,
      { keywords: fallbackKeywords, category: null, price_min: null, price_max: null, radius_km: 30 },
    );

    // Save buyer profile
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

    // Search active articles — select photos + location explicitly so the
    // client always gets images, and we can compute real distances.
    let query = supabase.from('waouh_articles')
      .select('id,title,brand,model,price,city,photos,location,seller_id')
      .eq('status', 'active');
    if (q.category) query = query.eq('category', q.category);
    if (q.price_min) query = query.gte('price', q.price_min);
    if (q.price_max) query = query.lte('price', q.price_max);
    const { data: articles } = await query.limit(20);

    const filtered = (articles || []).filter(a =>
      !q.keywords?.length || q.keywords.some((k: string) =>
        (a.title + ' ' + (a.brand || '') + ' ' + (a.model || '')).toLowerCase().includes(k.toLowerCase())
      )
    );

    // Compute real distance per article between buyer-supplied location
    // and article.location (PostGIS POINT). Sort closest first.
    const buyerLat = typeof location?.lat === 'number' ? location.lat : null;
    const buyerLng = typeof location?.lng === 'number' ? location.lng : null;
    const enriched = await Promise.all(filtered.map(async (a: any) => {
      const pt = parsePoint(a.location);
      let dKm = pt ? distanceKm(buyerLat, buyerLng, pt.lat, pt.lng) : null;
      if (buyerLat != null && buyerLng != null) {
        try {
          const { data } = await supabase.rpc('waouh_article_distance_km', {
            p_article: a.id,
            p_lat: buyerLat,
            p_lng: buyerLng,
          });
          if (typeof data === 'number') dKm = Math.round(data * 10) / 10;
        } catch (_) {}
      }
      return {
        ...a,
        lat: pt?.lat ?? null,
        lng: pt?.lng ?? null,
        distance_km: dKm,
      };
    }));
    enriched.sort((x: any, y: any) => {
      if (x.distance_km == null && y.distance_km == null) return 0;
      if (x.distance_km == null) return 1;
      if (y.distance_km == null) return -1;
      return x.distance_km - y.distance_km;
    });
    const matches = enriched.slice(0, 10);

    // Fire-and-forget BUYER-side match notifications only.
    // We intentionally do NOT dispatch `new_buyer` to the seller here:
    // a keyword search is not an explicit interest. The seller is only
    // notified when the buyer clicks "Intéressé" (waouh-buyer-interest)
    // or sends a real chat message tagged with article_id (waouh-channel-in).
    const dispatchAsync = (async () => {
      for (const a of matches.slice(0, 5)) {
        fetch(`${SUPABASE_URL}/functions/v1/waouh-notify-dispatch`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${SERVICE_ROLE}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind: 'match', article_id: a.id, buyer_profile_id: profile?.id, recipient: 'buyer' }),
        }).catch(() => {});
      }
    })();
    // @ts-ignore - EdgeRuntime is provided by Supabase Edge runtime
    if (typeof EdgeRuntime !== 'undefined' && (EdgeRuntime as any).waitUntil) {
      // @ts-ignore
      (EdgeRuntime as any).waitUntil(dispatchAsync);
    }

    // Enrichir chaque match avec une cover_photo (1ère photo http(s))
    const isHttpUrl = (u: any) => typeof u === "string" && /^https?:\/\//i.test(u) && !/^data:|^blob:/i.test(u);
    const enrichedMatches = matches.map((a: any) => ({
      ...a,
      cover_photo: Array.isArray(a.photos) ? (a.photos.find(isHttpUrl) ?? null) : null,
    }));
    // Attachments parallèles (jusqu'à 12) pour rendu image inline dans le chat
    const reply_attachments = enrichedMatches.slice(0, 5).flatMap((a: any) => {
      const photos: string[] = Array.isArray(a.photos) ? a.photos.filter(isHttpUrl) : [];
      return photos.slice(0, 4).map((url, k) => ({
        url,
        type: "image/jpeg",
        caption: `${a.title || "Produit"}${photos.length > 1 ? ` — photo ${k + 1}/${photos.length}` : ""}`,
      }));
    }).slice(0, 12);

    const reply = enrichedMatches.length
      ? `🔎 ${enrichedMatches.length} résultat(s):\n` + enrichedMatches.slice(0, 5).map((a: any) => {
          const dist = a.distance_km != null ? ` · ${formatDistance(a.distance_km).replace(/^📏\s*\*?|\*?$/g, '')}` : '';
          return `• ${a.title} - ${a.price} FCFA (${a.city || 'N/A'})${dist}`;
        }).join('\n')
      : `🕵️ Aucun résultat pour le moment. Tu seras notifié dès qu\'une annonce correspond.`;

    return new Response(JSON.stringify({ success: true, matches: enrichedMatches, reply, attachments: reply_attachments }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
