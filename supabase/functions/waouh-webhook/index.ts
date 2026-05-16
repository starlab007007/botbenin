import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

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
    const operatorKw: "mtn" | "moov" | "sbin" | null =
      /\bmtn\b/i.test(lower) ? "mtn" :
      /\bmoov\b/i.test(lower) ? "moov" :
      /\bsbin\b/i.test(lower) ? "sbin" : null;
    // Détection numéro Mobile Money (à exclure du parsing montant)
    const phoneCtx = /(num[ée]ro|num[ée]ro\s*:|num\b|tel|t[ée]l|whatsapp|momo|mtn|moov|mobile money)/i.test(lower);
    let paymentPhone: string | null = null;
    if (phoneCtx) {
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
    if (numMatch && interestedKw) intent = { intent: "CONFIRM", article_index: parseInt(numMatch[1], 10) };
    else if (literalInterest) intent = { intent: "CONFIRM", article_index: 1 };
    else if (payKw) intent = { intent: "PAY", payment_phone: paymentPhone, operator: operatorKw };
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
    let nextContext: any = conv?.context ?? {};

    const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";
    const sourceLines = (min: number, max: number) =>
      `\n\n🔎 *Références comparatives*\n• Facebook Marketplace / groupes WhatsApp locaux : ${fmt(min)} – ${fmt(max)}\n• Plateformes petites annonces (Jiji, CoinAfrique) : fourchette similaire selon état, mémoire et ville\n• Analyse WAOUH : prix, état, marque/modèle et zone de vente comparés pour sécuriser la confiance.`;

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
    }) {
      const { data: target } = await sb.from("waouh_users")
        .select("id, phone_number, web_session_id, channel")
        .eq("id", opts.to_user_id).maybeSingle();
      if (!target) return;
      // 1) Insert direct chat message first to capture its id
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
      // 2) Notification (cloche + WhatsApp si phone) avec deep-link
      try {
        await sb.rpc("waouh_enqueue_outbound_v2", {
          p_to_phone: target.phone_number,
          p_to_user_id: target.id,
          p_template: opts.template,
          p_payload: { ...(opts.payload || {}), message_id: insertedMsgId, transaction_id: opts.transaction_id ?? null },
          p_web_session_id: target.web_session_id,
          p_image_url: opts.image_url ?? null,
          p_channel: target.phone_number ? "whatsapp" : "web",
          p_message_id: insertedMsgId,
          p_transaction_id: opts.transaction_id ?? null,
        });
      } catch (e) { console.warn("[pushToOther] enqueue", e); }
    }


    if (intent.intent === "SELL") {
      const product = await ai(
        `Tu es WAOUH. Extrais d'un message vendeur la fiche produit en JSON: {title, category (smartphone/ordinateur/vetement/vehicule/electromenager/meuble/autre), brand, model, condition (new/like_new/good/fair/poor), price (number, FCFA), description, market_price_min, market_price_max, confidence (0-1)}.`,
        text
      );
      if ((product.confidence ?? 0) < 0.5 || !product.price) {
        reply = "🤔 Je n'ai pas tous les détails. Pouvez-vous préciser le produit, l'état et le prix ?";
      } else {
        const photoUrls = attachments.map((a: any) => a?.url).filter((u: any) => typeof u === "string");
        const { data: art } = await sb.from("waouh_articles").insert({
          seller_id: user!.id,
          title: product.title || "Annonce",
          description: product.description,
          category: product.category || "autre",
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
        const photoLine = photoUrls.length > 0 ? `\n📸 ${photoUrls.length} photo(s) jointe(s)` : "";
        const min = product.market_price_min || product.price * 0.8;
        const max = product.market_price_max || product.price * 1.2;
        reply = `✅ *Annonce publiée !*\n\n📦 ${product.title}\n💰 ${fmt(product.price)}\n📍 ${user!.city}${photoLine}\n\n📊 Prix marché estimé: ${fmt(min)} – ${fmt(max)}${sourceLines(min, max)}\n\n🔔 Les acheteurs intéressés dans votre zone seront notifiés automatiquement.`;

        // 🛰️ Radar IA: contacter les acheteurs (signaux BUY) qui correspondent
        try {
          let bq = sb.from("waouh_radar_signals")
            .select("id,product,category,price,city,contact_phone,raw_text")
            .eq("intent", "BUY")
            .not("contact_phone", "is", null);
          if (product.category) bq = bq.eq("category", product.category);
          const { data: buyerSignals } = await bq.order("captured_at", { ascending: false }).limit(10);
          for (const b of (buyerSignals || [])) {
            const rawPhone = (b.contact_phone || "").replace(/\D/g, "");
            if (!rawPhone) continue;
            let e164 = rawPhone;
            if (rawPhone.length === 8) e164 = `229${rawPhone}`;
            else if (!rawPhone.startsWith("229")) e164 = `229${rawPhone.slice(-8)}`;
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
      // Recherche filtrée
      let q = sb.from("waouh_articles")
        .select("id,title,price,city,brand,condition,category,seller_id,photos,market_price_min,market_price_max")
        .eq("status", "active");
      if (criteria.category) q = q.eq("category", criteria.category);
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
        if (criteria.category) rq = rq.eq("category", criteria.category);
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
        category: criteria.category, keywords: kws,
        price_max: criteria.price_max, radius_km: criteria.radius_km ?? 30,
        location: `SRID=4326;POINT(${lng} ${lat})` as any,
        origin: channel === "whatsapp" ? "whatsapp" : "chat",
      });

      const totalCount = (matches?.length || 0) + radarSellers.length;
      if (totalCount === 0) {
        reply = `🔍 Aucune annonce ne correspond pour l'instant. Profil sauvegardé : vous serez notifié dès qu'un vendeur publie un produit correspondant !`;
        nextContext = { ...nextContext, last_matches: [] };
      } else {
        const officialList = (matches || []).map((m: any, i: number) => {
          const photo = Array.isArray(m.photos) && m.photos.length > 0 ? `\n   📸 Photo disponible` : "";
          const min = m.market_price_min || m.price * 0.8;
          const max = m.market_price_max || m.price * 1.2;
          return `${i + 1}. *${m.title}* — ${fmt(m.price)} (${m.city ?? "?"}, ${m.condition})${photo}\n   📊 Marché: ${fmt(min)} – ${fmt(max)}`;
        }).join("\n");
        const radarList = radarSellers.map((r: any, i: number) => {
          const idx = (matches?.length || 0) + i + 1;
          const title = r.product?.title || r.product?.name || (r.raw_text || "").slice(0, 60) || "Annonce externe";
          const price = r.price ? fmt(Number(r.price)) : "Prix à négocier";
          const city = r.city || "?";
          return `${idx}. 🛰️ *${title}* — ${price} (${city})\n   📡 Source: Radar IA${r.contact_phone ? " — contact extrait" : ""}`;
        }).join("\n");
        replyAttachments = (matches || [])
          .flatMap((m: any) => Array.isArray(m.photos) ? m.photos.slice(0, 1) : [])
          .filter((url: any) => typeof url === "string")
          .slice(0, 5)
          .map((url: string) => ({ url, type: "image/jpeg" }));
        const radarHint = radarSellers.length > 0
          ? `\n\n🛰️ *${radarSellers.length} annonce${radarSellers.length > 1 ? "s" : ""}* détectée${radarSellers.length > 1 ? "s" : ""} via Radar IA. Nous contactons automatiquement ces vendeurs sur WhatsApp pour vous.`
          : "";
        reply = `🎯 *${totalCount} annonce${totalCount > 1 ? "s" : ""} trouvée${totalCount > 1 ? "s" : ""} :*\n\n${[officialList, radarList].filter(Boolean).join("\n")}\n\n💡 Pour contacter un vendeur officiel, répondez « intéressé N°1 ». Vous pouvez aussi proposer un prix.${radarHint}`;
        const combinedMatches = [
          ...(matches || []).map((m: any) => ({ id: m.id, title: m.title, price: m.price, seller_id: m.seller_id, photos: m.photos, market_price_min: m.market_price_min, market_price_max: m.market_price_max })),
        ];
        nextContext = { ...nextContext, last_matches: combinedMatches };

        // 🚀 Outreach automatique WhatsApp aux vendeurs Radar IA (anti-spam: 1/24h)
        for (const r of radarSellers) {
          const rawPhone = (r.contact_phone || "").replace(/\D/g, "");
          if (!rawPhone) continue;
          // Normalisation Bénin: +229 + 8 ou 10 chiffres
          let e164 = rawPhone;
          if (rawPhone.length === 8) e164 = `229${rawPhone}`;
          else if (rawPhone.length === 10 && rawPhone.startsWith("01")) e164 = `2290${rawPhone.slice(2)}`;
          else if (!rawPhone.startsWith("229")) e164 = `229${rawPhone.slice(-8)}`;
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
      const pick = last[idx];
      if (!pick) {
        reply = "🤔 Je n'ai plus la liste. Refaites votre recherche : « Je cherche … »";
      } else {
        const existingTxId = nextContext?.current_transaction_id || conv?.current_transaction_id || null;
        const alreadyOnArticle = (nextContext?.current_article_id || conv?.current_article_id) === pick.id;
        if (alreadyOnArticle && existingTxId) {
          returnedArticleId = pick.id;
          returnedTransactionId = existingTxId;
          reply = `✅ Vous êtes déjà mis en relation pour *${pick.title}*.\n\nVous pouvez écrire « Je propose 250 000 FCFA » pour négocier ou cliquer sur *Payer maintenant* pour finaliser.`;
        } else {
        // Récupère vendeur (phone + web session)
        const { data: seller } = await sb.from("waouh_users").select("id,phone_number,display_name,web_session_id").eq("id", pick.seller_id).maybeSingle();
        // Récupère 1ère photo de l'article pour la notification
        const { data: artPhoto } = await sb.from("waouh_articles").select("photos").eq("id", pick.id).maybeSingle();
        const firstPhoto = Array.isArray(artPhoto?.photos) && artPhoto!.photos.length > 0 ? artPhoto!.photos[0] : null;
        // Crée la négociation
        const { data: neg } = await sb.from("waouh_negotiations").insert({
          article_id: pick.id, buyer_user_id: user!.id, seller_user_id: pick.seller_id,
          state: "proposed", last_offer_price: pick.price, last_actor: "buyer",
          meta: { source: "chat" },
        }).select().single();
        returnedArticleId = pick.id;
        const amount = Number(pick.price || 0);
        const commission = Math.round(amount * 0.05);
        const { data: tx } = await sb.from("waouh_transactions").insert({
          article_id: pick.id,
          seller_id: pick.seller_id,
          buyer_id: user!.id,
          amount,
          commission,
          payment_method: "mobile_money",
          negotiated_price: amount,
          status: "payment_pending",
          escrow_status: "pending",
        }).select().single();
        returnedTransactionId = tx?.id ?? null;
        if (neg?.id && returnedTransactionId) {
          await sb.from("waouh_negotiations").update({ transaction_id: returnedTransactionId }).eq("id", neg.id);
        }
        // Notifie le vendeur (cloche + WhatsApp + message direct dans son chatbot)
        if (seller?.id) {
          await pushToOther({
            to_user_id: seller.id,
            template: "match_seller",
            payload: { article_id: pick.id, title: pick.title, price: pick.price, buyer_user_id: user!.id, neg_id: neg?.id, photo: firstPhoto, transaction_id: returnedTransactionId },
            image_url: firstPhoto,
            directText: `📩 *Nouvel acheteur intéressé !*\n\n📦 ${pick.title}\n💰 ${fmt(pick.price)}\n\nUn acheteur souhaite acquérir votre annonce. Répondez « OUI » pour accepter au prix demandé, « NON » pour refuser, ou proposez votre contre-offre (ex: « Je propose 18000 FCFA »).`,
            directAtts: firstPhoto ? [{ url: firstPhoto, type: "image/jpeg" }] : [],
            directMeta: { intent: "match_seller", article_id: pick.id, transaction_id: returnedTransactionId, negotiation_id: neg?.id },
          });
        }
        replyAttachments = firstPhoto ? [{ url: firstPhoto, type: "image/jpeg" }] : [];
        reply = `✅ *Demande envoyée au vendeur !*\n\n📦 ${pick.title} — ${fmt(pick.price)}\n${firstPhoto ? "📸 Photo transmise avec la demande\n" : ""}\nLe vendeur reçoit votre intérêt. Pour proposer un prix différent, écrivez par exemple « Je propose 250 000 FCFA ». Pour finaliser au prix demandé, utilisez la carte de paiement ci-dessous.`;
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
        reply = "🤔 Aucune négociation en cours. Recherchez d'abord un produit puis dites « intéressé N°X ».";
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
            payload: { neg_id: neg.id, article_id: neg.article_id, offer: amount, price: amount, transaction_id: returnedTransactionId },
            directText: `🤝 *Nouvelle ${isBuyer ? "offre acheteur" : "contre-offre vendeur"} : ${fmt(amount)}*\n\nRépondez « OUI » pour accepter, « NON » pour refuser, ou proposez un autre montant.`,
            directMeta: { intent: "negotiation_open", negotiation_id: neg.id, transaction_id: returnedTransactionId },
          });
        }
        reply = `💬 ${isBuyer ? "Offre" : "Contre-offre"} de ${fmt(amount)} transmise. Vous serez notifié de la réponse.`;
      } else {
        reply = "💬 Indiquez votre prix : « Je propose 250 000 FCFA »";
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
        if (channel === "whatsapp" && intent.payment_phone && txId) {
          const payRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/waouh-payment`, {
            method: "POST",
            headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`, "Content-Type": "application/json" },
            body: JSON.stringify({ action: "init", transaction_id: txId, msisdn: intent.payment_phone, operator: intent.operator || "mtn", waouh_buyer_id: user!.id }),
          });
          const pay = await payRes.json().catch(() => ({}));
          reply = pay?.success
            ? `✅ *Paiement confirmé en mode démo* — ${fmt(neg.last_offer_price)}\n\nLes fonds sont bloqués en escrow. Après livraison, écrivez « j'ai reçu » pour terminer la transaction.`
            : `💳 Paiement prêt, mais le numéro n'est pas accepté. En mode démo, écrivez : *payer 0165653468*`;
        } else {
          reply = channel === "whatsapp"
            ? `💳 *Paiement prêt* — ${fmt(neg.last_offer_price)}\n\nPour payer en mode démo, répondez : *payer 0165653468*`
            : `💳 *Paiement prêt* — ${fmt(neg.last_offer_price)}\n\nCliquez sur *Payer maintenant* dans la carte ci-dessous, choisissez MTN/Moov Money, puis validez sur votre téléphone. L'argent sera bloqué en escrow et libéré au vendeur après confirmation de réception.`;
        }
      }
    } else if (intent.intent === "HELP") {
      reply = `🤖 *WAOUH — Commandes :*\n\n• "Je vends ..." pour publier une annonce\n• "Je cherche ..." pour trouver un produit\n• "intéressé N°X" pour contacter un vendeur\n• "Je propose X FCFA" pour négocier\n• "Je paye" pour finaliser`;
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

    return new Response(JSON.stringify({ ok: true, intent: intent.intent, reply, attachments: replyAttachments, article_id: returnedArticleId, transaction_id: returnedTransactionId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
