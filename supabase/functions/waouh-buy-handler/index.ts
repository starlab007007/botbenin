import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { rehostPhotos, normalizeBeninPhone } from '../_shared/waouhContact.ts';
import { distanceKm, formatDistance } from '../_shared/waouh-format.ts';
import { extractFallbackKeywords, expandKeywordVariants, escapeIlikeToken, matchesAnyKeyword } from '../_shared/waouh-keywords.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
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

    // Fallback: si l'IA renvoie keywords vide, on tokenise le message brut.
    const aiKws: string[] = Array.isArray(q.keywords) ? q.keywords.filter((k: any) => typeof k === 'string' && k.length > 1) : [];
    const effectiveKws: string[] = aiKws.length > 0 ? aiKws : extractFallbackKeywords(message);
    console.log('[buy-handler]', { message, ai_keywords: aiKws, effectiveKws, category: q.category, price_max: q.price_max });

    // Garde anti-recherche-ouverte: sans keywords ET sans category ET sans prix
    // -> aucun résultat (évite de retourner toute la base + de spammer les vendeurs).
    if (effectiveKws.length === 0 && !q.category && !q.price_max) {
      return new Response(JSON.stringify({
        success: true,
        matches: [],
        reply: `🤔 Précisez votre recherche (ex: « je cherche iPhone 12 à Cotonou »).`,
        attachments: [],
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Variantes tolérantes (accents, pluriels, multi-mots) pour rappel large.
    const kwVariants = expandKeywordVariants(effectiveKws).map(escapeIlikeToken).filter((k) => k.length >= 2);

    // 1) waouh_articles (annonces chat)
    let query = supabase.from('waouh_articles')
      .select('id,title,brand,model,price,city,photos,location,seller_id,description')
      .eq('status', 'active');
    if (q.category) query = query.eq('category', q.category);
    if (q.price_min) query = query.gte('price', q.price_min);
    if (q.price_max) query = query.lte('price', q.price_max);
    if (kwVariants.length > 0) {
      const orFilter = kwVariants.map((k) => `title.ilike.%${k}%,brand.ilike.%${k}%,model.ilike.%${k}%,description.ilike.%${k}%`).join(",");
      query = query.or(orFilter);
    }
    const { data: articles } = await query.limit(20);

    // 2) waouh_unified_catalog (partenaires + imports + radar promus)
    // Souvent négligé jusqu'ici -> beaucoup de produits partenaires étaient invisibles.
    let partnerRows: any[] = [];
    try {
      let pq = supabase.from('waouh_unified_catalog')
        .select('id,titre,description,categorie,prix_min,prix_max,ville,quartier,vendeur_nom,vendeur_phone,vendeur_whatsapp,photos,source,partner_id,business_id,lat,lng')
        .eq('type', 'offer')
        .eq('is_active', true);
      if (q.price_max) pq = pq.lte('prix_min', q.price_max);
      if (kwVariants.length > 0) {
        const orFilter = kwVariants
          .map((k) => `titre.ilike.%${k}%,description.ilike.%${k}%,categorie.ilike.%${k}%,sous_categorie.ilike.%${k}%,vendeur_nom.ilike.%${k}%,tags.cs.{${k}}`)
          .join(",");
        pq = pq.or(orFilter);
      }
      const { data: pm } = await pq.order('priority_rank', { ascending: false }).limit(15);
      partnerRows = pm || [];
    } catch (e) { console.warn('[buy-handler unified catalog]', e); }

    // Normalisation partenaires -> même forme que waouh_articles
    const normalizedPartners = partnerRows.map((p: any) => ({
      id: p.id,
      title: p.titre,
      brand: null,
      model: null,
      price: Number(p.prix_min || p.prix_max || 0),
      city: p.ville || null,
      photos: Array.isArray(p.photos) ? p.photos : [],
      location: (typeof p.lat === 'number' && typeof p.lng === 'number') ? `SRID=4326;POINT(${p.lng} ${p.lat})` : null,
      seller_id: null,
      partner_id: p.partner_id || null,
      business_id: p.business_id || null,
      vendeur_nom: p.vendeur_nom || null,
      vendeur_phone: p.vendeur_phone || null,
      vendeur_whatsapp: p.vendeur_whatsapp || null,
      description: p.description || null,
      source: 'partner',
    }));

    const combined = [...(articles || []), ...normalizedPartners];

    // Filtre local strict : un token complet (>=3 chars) doit apparaître dans
    // les champs textuels. Empêche PostgREST de renvoyer des lignes hors-sujet.
    const strictKws = effectiveKws.filter((k) => typeof k === 'string' && k.length >= 3);
    const filtered = combined.filter((a: any) =>
      matchesAnyKeyword([a.title, a.brand, a.model, a.description, (a as any).categorie], strictKws)
    );

    // Dédoublonnage par (title,price) pour éviter doublons entre sources
    const seen = new Set<string>();
    const deduped = filtered.filter((a: any) => {
      const key = `${(a.title || '').trim().toLowerCase()}|${Math.round(Number(a.price || 0))}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Distances
    const buyerLat = typeof location?.lat === 'number' ? location.lat : null;
    const buyerLng = typeof location?.lng === 'number' ? location.lng : null;
    const enriched = deduped.map((a: any) => {
      const pt = parsePoint(a.location);
      const dKm = pt ? distanceKm(buyerLat, buyerLng, pt.lat, pt.lng) : null;
      return { ...a, lat: pt?.lat ?? null, lng: pt?.lng ?? null, distance_km: dKm };
    });
    enriched.sort((x: any, y: any) => {
      if (x.distance_km == null && y.distance_km == null) return 0;
      if (x.distance_km == null) return 1;
      if (y.distance_km == null) return -1;
      return x.distance_km - y.distance_km;
    });
    const matches = enriched.slice(0, 10);

    // Dispatch buyer-side (uniquement pour les articles officiels)
    const dispatchAsync = (async () => {
      for (const a of matches.slice(0, 5)) {
        if (!a.id || a.source === 'partner') continue;
        fetch(`${SUPABASE_URL}/functions/v1/waouh-notify-dispatch`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${SERVICE_ROLE}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind: 'match', article_id: a.id, buyer_profile_id: profile?.id, recipient: 'buyer' }),
        }).catch(() => {});
      }
    })();
    // @ts-ignore
    if (typeof EdgeRuntime !== 'undefined' && (EdgeRuntime as any).waitUntil) {
      // @ts-ignore
      (EdgeRuntime as any).waitUntil(dispatchAsync);
    }

    const isHttpUrl = (u: any) => typeof u === 'string' && /^https?:\/\//i.test(u) && !/^data:|^blob:/i.test(u);
    const enrichedMatches = matches.map((a: any) => ({
      ...a,
      cover_photo: Array.isArray(a.photos) ? (a.photos.find(isHttpUrl) ?? null) : null,
    }));

    // Captions préfixées « *N.* Titre · prix · ville » pour relier photo <-> article
    const fmtF = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} FCFA`;
    const reply_attachments = enrichedMatches.slice(0, 5).flatMap((a: any, i: number) => {
      const photos: string[] = Array.isArray(a.photos) ? a.photos.filter(isHttpUrl) : [];
      const take = photos.slice(0, 2);
      return take.map((url, k) => ({
        url,
        type: 'image/jpeg',
        caption: [
          `*${i + 1}.* ${a.title || 'Produit'}`,
          a.price ? fmtF(Number(a.price)) : '',
          a.city || '',
        ].filter(Boolean).join(' · ') + (take.length > 1 ? `  (photo ${k + 1}/${take.length})` : ''),
      }));
    }).slice(0, 12);

    const reply = enrichedMatches.length
      ? `🔎 ${enrichedMatches.length} résultat(s):\n` + enrichedMatches.slice(0, 5).map((a: any, i: number) => {
          const dist = a.distance_km != null ? ` · ${formatDistance(a.distance_km).replace(/^📏\s*\*?|\*?$/g, '')}` : '';
          const tag = a.source === 'partner' ? ' 🏪' : '';
          return `${i + 1}. ${a.title}${tag} - ${a.price} FCFA (${a.city || 'N/A'})${dist}`;
        }).join('\n') + `\n\n💡 Répondez « intéressé N » pour être mis en relation.`
      : `🕵️ Aucun résultat pour le moment. Tu seras notifié dès qu'une annonce correspond.`;

    return new Response(JSON.stringify({ success: true, matches: enrichedMatches, reply, attachments: reply_attachments }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
