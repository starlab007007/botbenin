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
    const payKw = /(payer|paiement|payement|mtn|moov|momo|paie|j'ach[èe]te maintenant)/i.test(lower);
    const offerMatch = lower.match(/(\d{2,3}(?:[\s.,]?\d{3})+|\d{4,})\s*(?:f|fcfa|cfa)?/);

    let intent: any = {};
    if (numMatch && interestedKw) intent = { intent: "CONFIRM", article_index: parseInt(numMatch[1], 10) };
    else if (literalInterest) intent = { intent: "CONFIRM", article_index: 1 };
    else if (payKw) intent = { intent: "PAY" };
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

      await sb.from("waouh_buyer_profiles").insert({
        user_id: user!.id, query_text: text,
        category: criteria.category, keywords: kws,
        price_max: criteria.price_max, radius_km: criteria.radius_km ?? 30,
        location: `SRID=4326;POINT(${lng} ${lat})` as any,
        origin: channel === "whatsapp" ? "whatsapp" : "chat",
      });

      if (!matches || matches.length === 0) {
        reply = `🔍 Aucune annonce ne correspond pour l'instant. Profil sauvegardé : vous serez notifié dès qu'un vendeur publie un produit correspondant !`;
        nextContext = { ...nextContext, last_matches: [] };
      } else {
        const list = matches.map((m: any, i: number) => {
          const photo = Array.isArray(m.photos) && m.photos.length > 0 ? `\n   📸 Photo disponible` : "";
          const min = m.market_price_min || m.price * 0.8;
          const max = m.market_price_max || m.price * 1.2;
          return `${i + 1}. *${m.title}* — ${fmt(m.price)} (${m.city ?? "?"}, ${m.condition})${photo}\n   📊 Marché: ${fmt(min)} – ${fmt(max)}`;
        }).join("\n");
        replyAttachments = matches
          .flatMap((m: any) => Array.isArray(m.photos) ? m.photos.slice(0, 1) : [])
          .filter((url: any) => typeof url === "string")
          .slice(0, 5)
          .map((url: string) => ({ url, type: "image/jpeg" }));
        reply = `🎯 *${matches.length} annonce${matches.length > 1 ? "s" : ""} trouvée${matches.length > 1 ? "s" : ""} :*\n\n${list}\n\n💡 Pour contacter le vendeur, répondez avec le numéro exact : *intéressé N°1*${matches.length > 1 ? `, *intéressé N°2* … *intéressé N°${matches.length}*` : ""}. Vous pouvez aussi proposer un prix.`;
        nextContext = { ...nextContext, last_matches: matches.map((m: any) => ({ id: m.id, title: m.title, price: m.price, seller_id: m.seller_id, photos: m.photos, market_price_min: m.market_price_min, market_price_max: m.market_price_max })) };
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
        // Notifie le vendeur (WhatsApp + Web)
        if (seller?.phone_number || seller?.web_session_id) {
          await sb.rpc("waouh_enqueue_outbound_v2", {
            p_to_phone: seller.phone_number,
            p_to_user_id: seller.id,
            p_template: "match_seller",
            p_payload: { article_id: pick.id, title: pick.title, price: pick.price, buyer_user_id: user!.id, neg_id: neg?.id, photo: firstPhoto },
            p_web_session_id: seller.web_session_id,
            p_image_url: firstPhoto,
            p_channel: seller.phone_number ? "whatsapp" : "web",
          });
        }
        replyAttachments = firstPhoto ? [{ url: firstPhoto, type: "image/jpeg" }] : [];
        reply = `✅ *Demande envoyée au vendeur !*\n\n📦 ${pick.title} — ${fmt(pick.price)}\n${firstPhoto ? "📸 Photo transmise avec la demande\n" : ""}\nLe vendeur reçoit votre intérêt. Pour proposer un prix différent, écrivez par exemple « Je propose 250 000 FCFA ». Pour finaliser au prix demandé, utilisez la carte de paiement ci-dessous.`;
        }
      }
    } else if (intent.intent === "NEGOTIATE" || (offerMatch && conv?.current_article_id)) {
      const amount = offerMatch ? parseInt(offerMatch[1].replace(/[\s.,]/g, ""), 10) : null;
      // Trouver la négociation ouverte
      const { data: neg } = await sb.from("waouh_negotiations")
        .select("*")
        .eq("buyer_user_id", user!.id)
        .in("state", ["proposed", "countered"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!neg) {
        reply = "🤔 Aucune négociation en cours. Recherchez d'abord un produit puis dites « intéressé N°X ».";
      } else if (amount) {
        await sb.from("waouh_negotiations").update({
          state: "countered", last_offer_price: amount, last_actor: "buyer",
        }).eq("id", neg.id);
        const { data: seller } = await sb.from("waouh_users").select("phone_number,id,web_session_id").eq("id", neg.seller_user_id).maybeSingle();
        if (seller?.phone_number || seller?.web_session_id) {
          await sb.rpc("waouh_enqueue_outbound_v2", {
            p_to_phone: seller.phone_number,
            p_to_user_id: seller.id,
            p_template: "negotiation_open",
        p_payload: { neg_id: neg.id, article_id: neg.article_id, offer: amount, price: amount },
            p_web_session_id: seller.web_session_id,
            p_image_url: null,
            p_channel: seller.phone_number ? "whatsapp" : "web",
          });
        }
        reply = `💬 Offre de ${fmt(amount)} transmise au vendeur. Vous serez notifié de sa réponse.`;
      } else {
        reply = "💬 Indiquez votre prix : « Je propose 250 000 FCFA »";
      }
    } else if (intent.intent === "PAY") {
      // Trouve la dernière négociation acceptée ou la plus récente proposée
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
        // Marque accepté + appelle qosic-payment
        await sb.from("waouh_negotiations").update({ state: "accepted" }).eq("id", neg.id);
        try {
          const payRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/qosic-payment`, {
            method: "POST",
            headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              amount: neg.last_offer_price,
              article_id: neg.article_id, negotiation_id: neg.id,
              buyer_user_id: user!.id, seller_user_id: neg.seller_user_id,
              phone: user.phone_number,
            }),
          });
          const payData = await payRes.json().catch(() => ({}));
          returnedTransactionId = payData?.transaction_id ?? null;
          if (returnedTransactionId) {
            await sb.from("waouh_negotiations").update({ transaction_id: returnedTransactionId }).eq("id", neg.id);
          }
          reply = `💳 *Paiement Mobile Money initié* — ${fmt(neg.last_offer_price)}\n\nValidez la notification MTN/Moov sur votre téléphone. L'argent sera bloqué en escrow et libéré au vendeur après confirmation de réception du produit.`;
        } catch (e) {
          console.error("payment init failed", e);
          reply = "⚠️ Erreur d'initiation du paiement. Réessayez dans quelques instants.";
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
