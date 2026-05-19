import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

function normalizeCategory(value: string | null | undefined) {
  const v = String(value || "").toLowerCase();
  if (/t[ée]l[ée]phone|smartphone|iphone|android/.test(v)) return "smartphone";
  if (/ordinateur|pc|laptop|macbook/.test(v)) return "ordinateur";
  if (/v[êe]tement|tissu|chaussure|mode|habit/.test(v)) return "vetement";
  if (/voiture|moto|v[ée]hicule|auto/.test(v)) return "vehicule";
  if (/frigo|cong[ée]lateur|machine|[ée]lectrom[ée]nager/.test(v)) return "electromenager";
  if (/maison|logement|immobilier|location|terrain|chambre|salon|meuble/.test(v)) return "meuble";
  return "autre";
}

function normalizeBeninPhone(value: string | null | undefined) {
  const original = String(value || "");
  if (original.includes("@lid")) return original.replace(/[^0-9@.a-z]/gi, "");
  const digits = original.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00229")) return digits.slice(2);
  if (digits.startsWith("229")) return digits;
  if (digits.length === 8 || (digits.length === 10 && digits.startsWith("01"))) return `229${digits}`;
  const last10 = digits.slice(-10);
  if (last10.length === 10 && last10.startsWith("01")) return `229${last10}`;
  const last8 = digits.slice(-8);
  return last8.length === 8 ? `229${last8}` : null;
}

async function promoteRadarSeller(sb: any, sig: any, fallbackCategory = "autre") {
  if (sig.promoted_article_id) {
    const { data: art } = await sb.from("waouh_articles").select("id,title,price,seller_id,photos,market_price_min,market_price_max").eq("id", sig.promoted_article_id).maybeSingle();
    if (art) return art;
  }
  const phone = normalizeBeninPhone(sig.contact_phone || sig.raw_text || sig.contact_handle);
  let sellerId: string | null = sig.waouh_user_id || null;
  if (!sellerId) {
    const { data: existing } = phone ? await sb.from("waouh_users").select("id").eq("phone_number", phone).maybeSingle() : { data: null };
    sellerId = existing?.id ?? null;
  }
  if (!sellerId) {
    const { data: created } = await sb.from("waouh_users").insert({
      phone_number: phone,
      display_name: sig.contact_handle || "Vendeur Radar IA",
      channel: "whatsapp",
      city: sig.city,
    }).select("id").single();
    sellerId = created?.id ?? null;
  }
  if (!sellerId) return null;
  const title = sig.product?.title || sig.product?.name || String(sig.raw_text || "Annonce Radar IA").slice(0, 120);
  const price = Number(sig.price || sig.product?.price || 0);
  const photo = sig.product?.image_url || sig.product?.image || null;
  const { data: existingArticle } = await sb.from("waouh_articles").select("id,title,price,seller_id,photos,market_price_min,market_price_max").eq("origin_signal_id", sig.id).maybeSingle();
  if (existingArticle) return existingArticle;
  const { data: art, error } = await sb.from("waouh_articles").insert({
    seller_id: sellerId,
    title,
    description: sig.raw_text,
    category: normalizeCategory(sig.category || sig.product?.category || fallbackCategory),
    price,
    currency: "XOF",
    city: sig.city,
    photos: photo ? [photo] : [],
    status: "active",
    origin: "radar",
    origin_signal_id: sig.id,
  }).select("id,title,price,seller_id,photos,market_price_min,market_price_max").single();
  if (error) { console.warn("[radar promote seller]", error); return null; }
  await sb.from("waouh_radar_signals").update({ promoted_article_id: art.id, waouh_user_id: sellerId, contact_phone: phone ?? sig.contact_phone, status: "notified" }).eq("id", sig.id);
  return art;
}

async function ai(system: string, user: string, json = true) {
  const res = await fetch(AI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  const data = await res.json();
  const txt = data?.choices?.[0]?.message?.content ?? "";
  if (json) { try { return JSON.parse(txt); } catch { return {}; } }
  return txt;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Meta WhatsApp verification (sprint 2)
  if (req.method === "GET") {
    const url = new URL(req.url);
    const challenge = url.searchParams.get("hub.challenge");
    const verifyToken = url.searchParams.get("hub.verify_token");
    const expected = Deno.env.get("WHATSAPP_VERIFY_TOKEN");
    if (verifyToken && expected && verifyToken === expected) {
      return new Response(challenge ?? "", { headers: corsHeaders });
    }
    return new Response("forbidden", { status: 403, headers: corsHeaders });
  }

  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json();

    const phone = body.phone_number || body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from;
    const webSessionId = body.web_session_id || null;
    const text = body.text || body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body || "";
    const lat = body.lat ?? 6.36;
    const lng = body.lng ?? 2.42;
    const city = body.city ?? "Cotonou";
    const channel = body.channel ?? (webSessionId ? "web" : "whatsapp");
    const attachments = Array.isArray(body.attachments) ? body.attachments : [];
    const passedUserId = body.user_id || null;

    if ((!phone && !webSessionId) || (!text && attachments.length === 0)) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Find/upsert user (prefer passed id, then web_session_id, then phone)
    let user: any = null;
    if (passedUserId) {
      const { data } = await sb.from("waouh_users").select("*").eq("id", passedUserId).maybeSingle();
      user = data;
    }
    if (!user && webSessionId) {
      const { data } = await sb.from("waouh_users").select("*").eq("web_session_id", webSessionId).maybeSingle();
      user = data;
    }
    if (!user && phone && !phone.startsWith("web:")) {
      const { data } = await sb.from("waouh_users").select("*").eq("phone_number", phone).maybeSingle();
      user = data;
    }
    if (!user) {
      const { data: created } = await sb.from("waouh_users").insert({
        phone_number: phone && !phone.startsWith("web:") ? phone : null,
        web_session_id: webSessionId,
        channel, city,
        location: `SRID=4326;POINT(${lng} ${lat})` as any,
      }).select().single();
      user = created;
    }

    // Pré-détection règles déterministes (avant AI)
    const lower = (text || "").toLowerCase();
    const numMatch = lower.match(/(?:n[°o]?\s*|#)(\d+)/i) || lower.match(/(?:int[ée]ress[ée]|interesse|choix|article)\s*(\d+)/i);
    const literalInterest = /int[ée]ress[ée]\s*n[°o]?\s*x/i.test(lower);
    const interestedKw = /(int[ée]ress[ée]|je veux|je prends|d'accord|ok\b|oui\b|acheter|contacte|contact)/i.test(lower);
    const payKw = /(payer|paiement|payement|momo|mobile money|j'ach[èe]te maintenant|\bje paye\b|\bje paie\b)/i.test(lower);
    const receivedKw = /(j.?ai\s+(bien\s+)?re[cç]u|re[cç]u\s+l.?article|livraison\s+re[cç]ue|confirmer\s+la\s+r[ée]ception)/i.test(lower);
    const sellKw = /\b(?:je\s+)?(?:vends?|vend|vendre|vente|publier|annonce)\b/i.test(lower);
    const buyKw = /\b(?:je\s+)?(?:cherche|recherche|besoin|acheter|ach[èe]te)\b/i.test(lower);
    const negotiateKw = /\b(?:n[ée]gocier|negocier|n[ée]gociation|marchander|proposer\s+un\s+prix)\b/i.test(lower);
    const operatorKw: "mtn" | "moov" | "sbin" | null =
      /\bmtn\b/i.test(lower) ? "mtn" :
      /\bmoov\b/i.test(lower) ? "moov" :
      /\bsbin\b/i.test(lower) ? "sbin" : null;
    const operatorOnlyPay = !!operatorKw && /^(mtn|moov|sbin)$/i.test(lower.trim());
    // Détection numéro Mobile Money (à exclure du parsing montant)
    const phoneCtx = /(num[ée]ro|num[ée]ro\s*:|num\b|tel|t[ée]l|whatsapp|momo|mtn|moov|mobile money)/i.test(lower);
    let paymentPhone: string | null = null;
    if (phoneCtx || payKw) {
      const phoneMatch = text.match(/(?:\+?229\s?)?\s*(0?\d(?:[\s.\-]?\d){7,12})/);
      if (phoneMatch) {
        const digits = phoneMatch[0].replace(/\D/g, "");
        if (digits.length >= 8) paymentPhone = digits;
      }
    }
    // N'extrait un montant QUE s'il est explicitement marqué FCFA/CFA ou précédé d'un mot d'offre
    const explicitOffer = lower.match(/(?:propose|offre|offre\s+de|prix|pour|à|a)\s*(\d{2,3}(?:[\s.,]?\d{3})+|\d{3,9})\s*(?:f|fcfa|cfa)?/i);
    const fcfaOffer = lower.match(/(\d{2,3}(?:[\s.,]?\d{3})+|\d{3,9})\s*(?:fcfa|cfa|f\s*cfa)\b/i);
    const offerMatch = (!payKw && (explicitOffer || fcfaOffer)) || null;

    let intent: any = {};
    if (receivedKw) intent = { intent: "CONFIRM_RECEIVED" };
    else if (numMatch && interestedKw) intent = { intent: "CONFIRM", article_index: parseInt(numMatch[1], 10) };
    else if (literalInterest) intent = { intent: "CONFIRM", article_index: 1 };
    else if (payKw || operatorOnlyPay) intent = { intent: "PAY", payment_phone: paymentPhone || (operatorOnlyPay ? "0165653468" : null), operator: operatorKw };
    else if (sellKw) intent = { intent: "SELL" };
    else if (buyKw) intent = { intent: "BUY" };
    else if (negotiateKw) intent = { intent: "NEGOTIATE" };
    else {
      intent = await ai(
        "Tu es WAOUH, assistant commerce IA. Détecte l'intention parmi: SELL, BUY, NEGOTIATE, PAY, CONFIRM, RATE, HELP, UNKNOWN. Retourne JSON {intent}.",
        text
      );
    }

    // Charge la conversation existante (pour récupérer le contexte des matches)
    const { data: conv } = await sb.from("waouh_conversations")
      .select("*")
      .eq("phone_number", phone || `web:${webSessionId}`)
      .maybeSingle();

    let reply = "Désolé, je n'ai pas compris. Tapez 'aide' pour les commandes.";
    let returnedArticleId: string | null = null;
    let returnedTransactionId: string | null = null;
    let replyAttachments: Array<{ url: string; type: string }> = [];
    let returnedActions: Array<{ id: string; label: string }> = [];
    let nextContext: any = conv?.context ?? {};

    const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";
    const paymentCard = (amount: number, txId?: string | null) =>
      `\n\n💳 *Carte de paiement WAOUH*\n• *Montant* : ${fmt(amount)}\n• *Sécurité* : escrow WAOUH (fonds bloqués)\n• *Statut* : en attente\n• *Référence* : ${txId ? txId.slice(0, 8).toUpperCase() : "créée"}`;
    // Petite phrase analytique IA sur le prix (best-effort, fail-soft)
    const marketNote = async (title: string, price: number, min: number, max: number, city: string): Promise<string> => {
      try {
        const r = await ai(
          `Tu es analyste prix marché Bénin. Rends UNE SEULE phrase concise (max 22 mots) qui qualifie le prix proposé par rapport au marché local (cher/correct/bonne affaire) avec un chiffre approximatif. JSON: {"note": string}`,
          `Produit: ${title}\nPrix proposé: ${price} FCFA\nFourchette marché: ${min} – ${max} FCFA\nVille: ${city}`
        );
        return typeof r?.note === "string" ? r.note.trim() : "";
      } catch { return ""; }
    };

    // Helper : envoie une notification système ET un message direct dans le chat de l'autre partie
    async function pushToOther(opts: {
      to_user_id: string;
      template: string;
      payload: any;
      image_url?: string | null;
      directText: string;
      directAtts?: Array<{ url: string; type: string }>;
      directMeta?: any;
      transaction_id?: string | null;
      dedupe_key?: string | null;
      event_type?: string | null;
    }) {
      const { data: target } = await sb.from("waouh_users")
        .select("id, phone_number, web_session_id, channel")
        .eq("id", opts.to_user_id).maybeSingle();
      if (!target) return;
      if (target.id === user?.id || (target.phone_number && phone && normalizeBeninPhone(target.phone_number) === normalizeBeninPhone(phone))) return;
      let insertedMsgId: string | null = null;
      if (target.web_session_id) {
        try {
          const { data: msg } = await sb.from("waouh_messages").insert({
            user_id: target.id,
            channel: "web",
            direction: "out",
            text: opts.directText,
            web_session_id: target.web_session_id,
            attachments: opts.directAtts ?? [],
            meta: { ...(opts.directMeta ?? {}), transaction_id: opts.transaction_id ?? opts.directMeta?.transaction_id ?? null },
          }).select("id").maybeSingle();
          insertedMsgId = msg?.id ?? null;
        } catch (e) { console.warn("[pushToOther] msg", e); }
      }
      try {
        const quickActions: Array<{ id: string; label: string }> = Array.isArray(opts.payload?.actions)
          ? opts.payload.actions.slice(0, 3)
          : [];
        await sb.rpc("waouh_enqueue_outbound_v2", {
          p_to_phone: target.phone_number,
          p_to_user_id: target.id,
          p_template: opts.template,
          p_payload: { ...(opts.payload || {}), text: opts.directText, actions: quickActions, message_id: insertedMsgId, transaction_id: opts.transaction_id ?? null },
          p_web_session_id: target.web_session_id,
          p_image_url: opts.image_url ?? null,
          p_channel: target.phone_number ? "whatsapp" : "web",
          p_message_id: insertedMsgId,
          p_transaction_id: opts.transaction_id ?? null,
          p_dedupe_key: opts.dedupe_key ?? null,
          p_event_type: opts.event_type ?? null,
        });
      } catch (e) { console.warn("[pushToOther] enqueue", e); }
    }


    if (intent.intent === "SELL") {
      const product = await ai(
        `Tu es WAOUH. Extrais d'un message vendeur la fiche produit en JSON: {title, category (smartphone/ordinateur/vetement/vehicule/electromenager/meuble/autre), brand, model, condition (new/like_new/good/fair/poor), price (number, FCFA), description, market_price_min, market_price_max, confidence (0-1)}.`,
        text
      );
      const productCategory = normalizeCategory(product.category);
      if ((product.confidence ?? 0) < 0.5 || !product.price) {
        reply = "🤔 Je n'ai pas tous les détails. Pouvez-vous préciser le produit, l'état et le prix ?";
      } else {
        const photoUrls = attachments
          .filter((a: any) => /^image\//i.test(String(a?.type || "image/jpeg")))
          .map((a: any) => a?.url)
          .filter((u: any) => typeof u === "string" && /^https?:\/\//i.test(u));
        const { data: art } = await sb.from("waouh_articles").insert({
          seller_id: user!.id,
          title: product.title || "Annonce",
          description: product.description,
          category: productCategory,
          brand: product.brand, model: product.model,
          condition: product.condition || "good",
          price: product.price, currency: "XOF",
          city: user!.city,
          location: `SRID=4326;POINT(${lng} ${lat})` as any,
          photos: photoUrls,
          market_price_min: product.market_price_min,
          market_price_max: product.market_price_max,
          origin: channel === "whatsapp" ? "whatsapp" : "chat",
        }).select().single();
        returnedArticleId = art?.id ?? null;
        replyAttachments = photoUrls.map((url: string) => ({ url, type: "image/jpeg" }));
        const photoLine = photoUrls.length > 0 ? `\n📸 ${photoUrls.length} photo${photoUrls.length > 1 ? "s" : ""} jointe${photoUrls.length > 1 ? "s" : ""}` : "";
        const min = product.market_price_min || product.price * 0.8;
        const max = product.market_price_max || product.price * 1.2;
        const aiNote = await marketNote(product.title || "", product.price, min, max, user!.city || "");
        const geoLine = (typeof lat === "number" && typeof lng === "number")
          ? `\n🗺️ *Localisation* : https://maps.google.com/?q=${lat},${lng}` : "";
        const noteLine = aiNote ? `\n\n🧠 *Analyse WAOUH* : ${aiNote}` : "";
        reply = `✅ *Annonce publiée*\n\n📦 *Produit* : ${product.title}\n💰 *Prix* : ${fmt(product.price)}\n📍 *Ville* : ${user!.city}${geoLine}${photoLine}\n\n📊 *Prix marché estimé*\n• Bas : ${fmt(min)}\n• Haut : ${fmt(max)}${noteLine}\n\n🔔 Les acheteurs intéressés dans votre zone seront notifiés automatiquement.`;
        // Une seule bulle WhatsApp pour la confirmation de publication, sans boutons.
        returnedActions = [];

        // 🛰️ Radar IA: contacter les acheteurs (signaux BUY) qui correspondent
        try {
          let bq = sb.from("waouh_radar_signals")
            .select("id,product,category,price,city,contact_phone,raw_text")
            .eq("intent", "BUY")
            .not("contact_phone", "is", null);
          if (productCategory) bq = bq.or(`category.ilike.%${productCategory}%,raw_text.ilike.%${productCategory}%`);
          const { data: buyerSignals } = await bq.order("captured_at", { ascending: false }).limit(10);
          for (const b of (buyerSignals || [])) {
            const e164 = normalizeBeninPhone(b.contact_phone || b.raw_text);
            if (!e164) continue;
            const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const { data: recent } = await sb.from("waouh_outbound_queue")
              .select("id").eq("to_phone", e164).eq("template", "radar_buyer_outreach")
              .gte("created_at", since).limit(1).maybeSingle();
            if (recent) continue;
            await sb.rpc("waouh_enqueue_outbound_v2", {
              p_to_phone: e164,
              p_to_user_id: null,
              p_template: "radar_buyer_outreach",
              p_payload: {
                text: `🎯 WAOUH a trouvé pour vous : *${product.title}* à ${fmt(product.price)} (${user!.city}). Répondez « OUI » pour être mis en relation avec le vendeur (paiement sécurisé escrow).`,
                article_id: art?.id,
                radar_signal_id: b.id,
              },
              p_image_url: photoUrls[0] || null,
              p_channel: "whatsapp",
            });
          }
        } catch (e) { console.warn("[radar buyer outreach]", e); }
      }
    } else if (intent.intent === "BUY") {
      const criteria = await ai(
        "Extrais les critères d'achat en JSON: {keywords (array de mots-clés produit, ex: ['lenovo','ordinateur']), category (smartphone/ordinateur/vetement/vehicule/electromenager/meuble/autre), price_max (number FCFA), condition_min, radius_km}.",
        text
      );
      const criteriaCategory = normalizeCategory(criteria.category || text);
      // Recherche filtrée
      let q = sb.from("waouh_articles")
        .select("id,title,price,city,brand,condition,category,seller_id,photos,market_price_min,market_price_max")
        .eq("status", "active");
      if (criteriaCategory) q = q.eq("category", criteriaCategory);
      if (criteria.price_max) q = q.lte("price", criteria.price_max);
      const kws: string[] = Array.isArray(criteria.keywords) ? criteria.keywords.filter((k: any) => typeof k === "string" && k.length > 1) : [];
      if (kws.length > 0) {
        const orFilter = kws.map((k) => `title.ilike.%${k}%,brand.ilike.%${k}%,description.ilike.%${k}%`).join(",");
        q = q.or(orFilter);
      }
      const { data: matches } = await q.order("created_at", { ascending: false }).limit(5);

      // 🛰️ Radar IA: chercher aussi des signaux SELL (annonces externes captées)
      let radarSellers: any[] = [];
      try {
        let rq = sb.from("waouh_radar_signals")
          .select("id,product,category,price,city,contact_phone,contact_handle,raw_url,raw_text")
          .eq("intent", "SELL");
        if (criteriaCategory && criteriaCategory !== "autre") rq = rq.or(`category.ilike.%${criteriaCategory}%,raw_text.ilike.%${criteriaCategory}%`);
        if (criteria.price_max) rq = rq.lte("price", criteria.price_max);
        if (kws.length > 0) {
          const orFilter = kws.map((k) => `raw_text.ilike.%${k}%`).join(",");
          rq = rq.or(orFilter);
        }
        const { data: rs } = await rq.order("captured_at", { ascending: false }).limit(8);
        radarSellers = rs || [];
      } catch (e) { console.warn("[radar SELL search]", e); }

      await sb.from("waouh_buyer_profiles").insert({
        user_id: user!.id, query_text: text,
        category: criteriaCategory, keywords: kws,
        price_max: criteria.price_max, radius_km: criteria.radius_km ?? 30,
        location: `SRID=4326;POINT(${lng} ${lat})` as any,
        origin: channel === "whatsapp" ? "whatsapp" : "chat",
      });

      const totalCount = (matches?.length || 0) + radarSellers.length;
      if (totalCount === 0) {
        reply = `🔍 Aucune annonce ne correspond pour l'instant. Profil sauvegardé : vous serez notifié dès qu'un vendeur publie un produit correspondant !`;
        nextContext = { ...nextContext, last_matches: [] };
      } else {
        // Limiter explicitement à top 5 cumulés
        const matchesTop = (matches || []).slice(0, 5);
        const radarTop = radarSellers.slice(0, Math.max(0, 5 - matchesTop.length));
        // Note IA par produit officiel
        const officialList = (await Promise.all(matchesTop.map(async (m: any, i: number) => {
          const photos: string[] = Array.isArray(m.photos) ? m.photos.filter((u: any) => typeof u === "string") : [];
          const photoLine = photos.length > 0 ? `\n   📸 ${photos.length} photo${photos.length > 1 ? "s" : ""}` : "";
          const min = m.market_price_min || m.price * 0.8;
          const max = m.market_price_max || m.price * 1.2;
          const note = await marketNote(m.title || "", Number(m.price || 0), min, max, m.city || "");
          const noteLine = note ? `\n   🧠 ${note}` : "";
          return `*${i + 1}. ${m.title}*\n   💰 ${fmt(m.price)}\n   📍 ${m.city ?? "?"} · ${m.condition}${photoLine}\n   📊 Marché : ${fmt(min)} – ${fmt(max)}${noteLine}`;
        }))).join("\n\n");
        const radarList = radarTop.map((r: any, i: number) => {
          const idx = matchesTop.length + i + 1;
          const title = r.product?.title || r.product?.name || (r.raw_text || "").slice(0, 60) || "Annonce externe";
          const price = r.price ? fmt(Number(r.price)) : "Prix à négocier";
          const city = r.city || "?";
          return `*${idx}. ${title}*\n   💰 ${price}\n   📍 ${city}\n   📡 Source : Radar IA${r.contact_phone ? " · contact extrait" : ""}`;
        }).join("\n\n");
        // Envoyer toutes les photos disponibles (max 2 par produit, plafond 6)
        replyAttachments = matchesTop
          .flatMap((m: any) => Array.isArray(m.photos) ? m.photos.slice(0, 2) : [])
          .filter((url: any) => typeof url === "string")
          .slice(0, 6)
          .map((url: string) => ({ url, type: "image/jpeg" }));
        const radarHint = radarTop.length > 0
          ? `\n\n🛰️ *${radarTop.length} annonce${radarTop.length > 1 ? "s" : ""}* détectée${radarTop.length > 1 ? "s" : ""} via Radar IA. Nous contactons automatiquement ces vendeurs sur WhatsApp pour vous.`
          : "";
        const totalShown = matchesTop.length + radarTop.length;
        const interestList = Array.from({ length: totalShown }, (_, i) => `intéressé ${i + 1}`).join(", ");
        reply = `🎯 *Top ${totalShown} annonce${totalShown > 1 ? "s" : ""} trouvée${totalShown > 1 ? "s" : ""}*\n\n${[officialList, radarList].filter(Boolean).join("\n\n")}\n\n💡 Pour contacter un vendeur, répondez : ${interestList}.${radarHint}`;
        // Pas de boutons : tout passe par texte (intéressé 1, intéressé 2, …)
        returnedActions = [];
        const promotedRadarMatches: any[] = [];
        for (const r of radarSellers) {
          const art = await promoteRadarSeller(sb, r, criteriaCategory);
          if (art?.id) promotedRadarMatches.push({ ...art, radar: true });
        }
        const combinedMatches = [
          ...(matches || []).map((m: any) => ({ id: m.id, title: m.title, price: m.price, seller_id: m.seller_id, photos: m.photos, market_price_min: m.market_price_min, market_price_max: m.market_price_max })),
          ...promotedRadarMatches.map((m: any) => ({ id: m.id, title: `🛰️ ${m.title}`, price: m.price, seller_id: m.seller_id, photos: m.photos, market_price_min: m.market_price_min, market_price_max: m.market_price_max })),
        ];
        nextContext = { ...nextContext, last_matches: combinedMatches };

        // 🚀 Outreach automatique WhatsApp aux vendeurs Radar IA (anti-spam: 1/24h)
        for (const r of radarSellers) {
          const e164 = normalizeBeninPhone(r.contact_phone || r.raw_text || r.contact_handle);
          if (!e164) continue;
          // Anti-spam: ne pas re-contacter si déjà notifié dans les 24h
          const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          const { data: recent } = await sb.from("waouh_outbound_queue")
            .select("id").eq("to_phone", e164).eq("template", "radar_seller_outreach")
            .gte("created_at", since).limit(1).maybeSingle();
          if (recent) continue;
          const title = r.product?.title || (r.raw_text || "").slice(0, 60) || "votre annonce";
          const priceTxt = r.price ? ` à ${fmt(Number(r.price))}` : "";
          try {
            await sb.rpc("waouh_enqueue_outbound_v2", {
              p_to_phone: e164,
              p_to_user_id: null,
              p_template: "radar_seller_outreach",
              p_payload: {
                text: `👋 Bonjour ! WAOUH a détecté votre annonce "${title}"${priceTxt}. Un acheteur dans ${user!.city || "votre zone"} est intéressé. Répondez « OUI » pour le mettre en relation via WAOUH (paiement sécurisé escrow, 0 fraude).`,
                radar_signal_id: r.id,
                source_url: r.raw_url,
              },
              p_channel: "whatsapp",
            });
          } catch (e) { console.warn("[radar outreach]", e); }
        }
      }
    } else if (intent.intent === "CONFIRM" && intent.article_index) {
      const idx = intent.article_index - 1;
      const last = Array.isArray(nextContext?.last_matches) ? nextContext.last_matches : [];
      let pick: any = last[idx];
      // Fallback : si la liste est perdue, retomber sur l'article courant
      if (!pick) {
        const fallbackArticleId = nextContext?.current_article_id || conv?.current_article_id || null;
        if (fallbackArticleId) {
          const { data: art } = await sb.from("waouh_articles")
            .select("id,title,price,seller_id,photos,market_price_min,market_price_max")
            .eq("id", fallbackArticleId).maybeSingle();
          if (art) pick = art;
        }
      }
      if (!pick) {
        reply = "🤔 Je n'ai plus la liste. Refaites votre recherche : « Je cherche … »";
      } else {
        const existingTxId = nextContext?.current_transaction_id || conv?.current_transaction_id || null;
        const alreadyOnArticle = (nextContext?.current_article_id || conv?.current_article_id) === pick.id;
        const askPrice = Number(pick.price || 0);
        if (alreadyOnArticle && existingTxId) {
          returnedArticleId = pick.id;
          returnedTransactionId = existingTxId;
          returnedActions = [
            { id: `pay:${existingTxId}`, label: "💳 Payer" },
            { id: `counter:${pick.id}`, label: "💬 Négocier" },
          ];
          reply = `✅ *Mise en relation déjà ouverte*\n\n📦 *Produit* : ${pick.title}\n💰 *Prix* : ${fmt(askPrice)}\n\nVous pouvez écrire *Je propose ${fmt(askPrice)}* pour négocier ou appuyer sur *Payer*.`;
        } else {
        // Récupère vendeur (phone + web session)
        const { data: seller } = await sb.from("waouh_users").select("id,phone_number,display_name,web_session_id").eq("id", pick.seller_id).maybeSingle();
        // Récupère 1ère photo de l'article pour la notification
        const { data: artPhoto } = await sb.from("waouh_articles").select("photos").eq("id", pick.id).maybeSingle();
        const firstPhoto = Array.isArray(artPhoto?.photos) && artPhoto!.photos.length > 0 ? artPhoto!.photos[0] : null;
        // Crée la négociation
        const { data: neg } = await sb.from("waouh_negotiations").insert({
          article_id: pick.id, buyer_user_id: user!.id, seller_user_id: pick.seller_id,
          state: "proposed", last_offer_price: askPrice, last_actor: "buyer",
          meta: { source: "chat" },
        }).select().single();
        returnedArticleId = pick.id;
        const commission = Math.round(askPrice * 0.05);
        const { data: tx } = await sb.from("waouh_transactions").insert({
          article_id: pick.id,
          seller_id: pick.seller_id,
          buyer_id: user!.id,
          amount: askPrice,
          commission,
          payment_method: "mobile_money",
          negotiated_price: askPrice,
          status: "payment_pending",
          escrow_status: "pending",
        }).select().single();
        returnedTransactionId = tx?.id ?? null;
        if (neg?.id && returnedTransactionId) {
          await sb.from("waouh_negotiations").update({ transaction_id: returnedTransactionId }).eq("id", neg.id);
        }
        // Notifie le vendeur — UN SEUL message, sans carte paiement, sans actions paiement.
        // Boutons interactifs : Accepter / Contre-offre / Refuser.
        if (seller?.id) {
          try {
            await pushToOther({
              to_user_id: seller.id,
              template: "match_seller",
              payload: {
                article_id: pick.id, title: pick.title, price: askPrice,
                buyer_user_id: user!.id, neg_id: neg?.id, photo: firstPhoto,
                transaction_id: returnedTransactionId,
                actions: [
                  { id: `accept:${neg?.id || ""}`, label: "✅ Accepter" },
                  { id: `counter:${neg?.id || ""}`, label: "💬 Contre-offre" },
                  { id: `refuse:${neg?.id || ""}`, label: "❌ Refuser" },
                ],
              },
              image_url: firstPhoto,
              directText: `📩 *Nouvel acheteur intéressé*\n\n📦 *Produit* : ${pick.title}\n💰 *Je propose ${fmt(askPrice)}*\n\nUn acheteur souhaite acquérir votre annonce.\n\nRépondez *OUI* pour accepter, *NON* pour refuser, ou proposez votre contre-offre (ex: *Je propose ${fmt(Math.round(askPrice * 0.9))}*).`,
              directAtts: firstPhoto ? [{ url: firstPhoto, type: "image/jpeg" }] : [],
              directMeta: { intent: "match_seller", article_id: pick.id, transaction_id: returnedTransactionId, negotiation_id: neg?.id },
              transaction_id: returnedTransactionId,
              dedupe_key: null,
              event_type: "seller_new_interest",
            });
            console.log("[interest-push] enqueue ok", { seller_id: seller.id, neg_id: neg?.id, tx: returnedTransactionId });
          } catch (e) {
            console.error("[interest-push] enqueue failed", e);
          }
        }
        replyAttachments = firstPhoto ? [{ url: firstPhoto, type: "image/jpeg" }] : [];
        returnedActions = [];
        reply = `✅ *Demande envoyée au vendeur*\n\n📦 *Produit* : ${pick.title}\n💰 *Prix* : ${fmt(askPrice)}\n${firstPhoto ? "📸 *Photo transmise avec la demande*\n" : ""}\nLe vendeur reçoit votre intérêt. Pour proposer un prix différent, écrivez (Exemple : Je propose 450 FCFA).`;
        }
      }
    } else if (intent.intent === "NEGOTIATE" || (offerMatch && conv?.current_article_id)) {
      const amount = offerMatch ? parseInt(offerMatch[1].replace(/[\s.,]/g, ""), 10) : null;
      // Trouver la négociation ouverte (acheteur OU vendeur)
      const { data: neg } = await sb.from("waouh_negotiations")
        .select("*")
        .or(`buyer_user_id.eq.${user!.id},seller_user_id.eq.${user!.id}`)
        .in("state", ["proposed", "countered"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!neg) {
        reply = "🤔 Aucune négociation en cours. Recherchez d'abord un produit puis dites *intéressé 1*.";
      } else if (amount) {
        const isBuyer = neg.buyer_user_id === user!.id;
        const otherId = isBuyer ? neg.seller_user_id : neg.buyer_user_id;
        await sb.from("waouh_negotiations").update({
          state: "countered", last_offer_price: amount, last_actor: isBuyer ? "buyer" : "seller",
        }).eq("id", neg.id);
        if (neg.transaction_id) {
          await sb.from("waouh_transactions").update({
            amount, negotiated_price: amount,
            commission: Math.round(amount * 0.05),
            status: "payment_pending",
          }).eq("id", neg.transaction_id);
        }
        returnedTransactionId = neg.transaction_id ?? null;
        if (otherId) {
          await pushToOther({
            to_user_id: otherId,
            template: "negotiation_open",
            payload: {
              neg_id: neg.id, article_id: neg.article_id, offer: amount, price: amount,
              transaction_id: returnedTransactionId,
              actions: [
                { id: `accept:${neg.id}`, label: "✅ Accepter" },
                { id: `counter:${neg.id}`, label: "💬 Contre-offre" },
                { id: `refuse:${neg.id}`, label: "❌ Refuser" },
              ],
            },
            directText: `🤝 *Nouvelle ${isBuyer ? "offre acheteur" : "contre-offre vendeur"}*\n\n💰 *Montant proposé* : ${fmt(amount)}\n\nRépondez *OUI* pour accepter, *NON* pour refuser, ou proposez un autre montant.`,
            directMeta: { intent: "negotiation_open", negotiation_id: neg.id, transaction_id: returnedTransactionId },
            transaction_id: returnedTransactionId,
            dedupe_key: `neg:${neg.id}:offer:${amount}:${otherId}`,
            event_type: "negotiation_counter",
          });
        }
        reply = `💬 ${isBuyer ? "Offre" : "Contre-offre"} de ${fmt(amount)} transmise. Vous serez notifié de la réponse.`;
      } else {
        reply = `💬 Indiquez votre prix : « Je propose ${fmt(neg.last_offer_price || 0)} »`;
      }
    } else if (intent.intent === "PAY") {
      // Trouve la transaction/négociation courante et renvoie la carte de paiement web
      const { data: neg } = await sb.from("waouh_negotiations")
        .select("*")
        .eq("buyer_user_id", user!.id)
        .in("state", ["proposed", "countered", "accepted"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!neg) {
        reply = "🤔 Aucune transaction en cours. Cherchez un produit et confirmez votre intérêt avant de payer.";
      } else {
        await sb.from("waouh_negotiations").update({ state: "accepted" }).eq("id", neg.id);
        let txId = neg.transaction_id;
        if (!txId) {
          const amount = Number(neg.last_offer_price || 0);
          const { data: tx } = await sb.from("waouh_transactions").insert({
            article_id: neg.article_id,
            seller_id: neg.seller_user_id,
            buyer_id: user!.id,
            amount,
            commission: Math.round(amount * 0.05),
            payment_method: "mobile_money",
            negotiated_price: amount,
            status: "payment_pending",
            escrow_status: "pending",
          }).select().single();
          txId = tx?.id ?? null;
          if (txId) await sb.from("waouh_negotiations").update({ transaction_id: txId }).eq("id", neg.id);
        }
        returnedArticleId = neg.article_id;
        returnedTransactionId = txId;
        const payAmount = Number(neg.last_offer_price || 0);
        returnedActions = [
          { id: `pay:${txId || ""}`, label: "💳 Payer maintenant" },
          { id: "mtn", label: "MTN" },
          { id: "moov", label: "Moov" },
        ];
        if (channel === "whatsapp" && intent.payment_phone && txId) {
          const payRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/waouh-payment`, {
            method: "POST",
            headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`, "Content-Type": "application/json" },
            body: JSON.stringify({ action: "init", transaction_id: txId, msisdn: intent.payment_phone, operator: intent.operator || "mtn", waouh_buyer_id: user!.id }),
          });
          const pay = await payRes.json().catch(() => ({}));
          reply = pay?.success
            ? `✅ *Paiement confirmé*\n\n💰 *Montant* : ${fmt(payAmount)}\n🔒 *Escrow* : Fonds bloqués jusqu'à réception.\n\nAprès livraison, écrivez *j'ai reçu* pour terminer la transaction.`
            : `💳 *Paiement prêt*${paymentCard(payAmount, txId)}\n\n📱 Indiquez l'opérateur (MTN ou Moov) puis validez la notification reçue sur votre téléphone.`;
        } else {
          reply = channel === "whatsapp"
            ? `💳 *Paiement prêt*${paymentCard(payAmount, txId)}\n\n📱 Choisissez votre opérateur Mobile Money (MTN ou Moov) puis validez la notification reçue sur votre téléphone.\n🔒 Les fonds restent en escrow jusqu'à confirmation de réception.`
            : `💳 *Paiement prêt* — ${fmt(payAmount)}\n\nCliquez sur *Payer maintenant* dans la carte ci-dessous, choisissez MTN/Moov Money, puis validez sur votre téléphone. L'argent sera bloqué en escrow et libéré au vendeur après confirmation de réception.`;
        }
      }
    } else if (intent.intent === "CONFIRM_RECEIVED") {
      const txId = conv?.current_transaction_id || nextContext?.current_transaction_id;
      if (!txId) {
        reply = "🤔 Aucune transaction à terminer. Payez d'abord une annonce puis confirmez la réception.";
      } else {
        const payRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/waouh-payment`, {
          method: "POST",
          headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`, "Content-Type": "application/json" },
          body: JSON.stringify({ action: "confirm_received", transaction_id: txId, waouh_buyer_id: user!.id }),
        });
        const done = await payRes.json().catch(() => ({}));
        reply = done?.success
          ? "🎉 Réception confirmée. La transaction est terminée et les fonds sont libérés au vendeur (mode démo)."
          : `Impossible de confirmer la réception : ${done?.error || "réessayez"}`;
        returnedTransactionId = txId;
      }
    } else if (intent.intent === "HELP") {
      reply = `🤖 *WAOUH — Commandes*\n\n• *Je vends ...* pour publier une annonce\n• *Je cherche ...* pour trouver un produit\n• *intéressé 1* pour contacter un vendeur\n• *Je propose X FCFA* pour négocier\n• *Je paye* pour finaliser`;
    }

    // Save conversation (avec contexte)
    await sb.from("waouh_conversations").upsert({
      user_id: user!.id,
      phone_number: phone || `web:${webSessionId}`,
      state: intent.intent?.toLowerCase() ?? "idle",
      last_message: text, last_intent: intent.intent,
      channel,
      context: { ...nextContext, current_article_id: returnedArticleId ?? nextContext?.current_article_id ?? conv?.current_article_id ?? null, current_transaction_id: returnedTransactionId ?? nextContext?.current_transaction_id ?? conv?.current_transaction_id ?? null },
      current_article_id: returnedArticleId ?? conv?.current_article_id ?? null,
      current_transaction_id: returnedTransactionId ?? conv?.current_transaction_id ?? null,
    }, { onConflict: "phone_number" } as any);

    // Fire-and-forget: déclenche l'envoi immédiat des notifications en attente (WhatsApp)
    fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/waouh-outbound-dispatch`, {
      method: "POST",
      headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({ limit: 20 }),
    }).catch(() => {});

    return new Response(JSON.stringify({ ok: true, intent: intent.intent, reply, attachments: replyAttachments, article_id: returnedArticleId, transaction_id: returnedTransactionId, actions: returnedActions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
