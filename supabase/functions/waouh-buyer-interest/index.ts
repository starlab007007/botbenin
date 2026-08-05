// WAOUH_V25_7_1_AUTH_ACTOR_STABLE
// waouh-buyer-interest
// Records an explicit buyer interest on an article (independent from chat messages)
// and notifies the seller via the unified dispatcher (in-app + WhatsApp).
//
// Body: { article_id: string, source?: "match"|"radar"|"chat"|"card" }
// Auth: requires Authorization Bearer <user JWT>.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { pushSyncedEvent } from "../_shared/waouh-sync.ts";
import { bindThreadState, resolveProductThread } from "../_shared/waouh-thread.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    let { article_id, catalog_id, source = "chat", buyer_user_id: explicitBuyerUserId } = body || {};
    if (!article_id && !catalog_id) {
      return new Response(JSON.stringify({ error: "article_id or catalog_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 🆕 Promotion catalog → article si nécessaire (tunnel partenaire)
    if (!article_id && catalog_id) {
      const { promoteCatalogToArticle } = await import("../_shared/waouh-promote.ts");
      const promo = await promoteCatalogToArticle(sb, catalog_id);
      if (!promo.article_id) {
        return new Response(JSON.stringify({ error: "catalog promotion failed", details: promo.reason }), {
          status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      article_id = promo.article_id;
    }

    // Resolve the calling user from the JWT (if any)
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    const trustedInternal = token === SERVICE_ROLE;
    let authUserId: string | null = null;
    if (token) {
      try {
        const { data } = await sb.auth.getUser(token);
        authUserId = data?.user?.id ?? null;
      } catch { /* anonymous */ }
    }
    if (!authUserId && !trustedInternal) {
      return new Response(JSON.stringify({ error: "auth required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve buyer waouh_users id
    let buyerUserId: string | null = trustedInternal ? (explicitBuyerUserId || null) : null;
    if (!buyerUserId && authUserId) {
      const { data } = await sb.from("waouh_users")
        .select("id,auth_user_id,phone_number,web_session_id")
        .eq("auth_user_id", authUserId).maybeSingle();
      buyerUserId = data?.id ?? null;
    }
    if (!buyerUserId) {
      return new Response(JSON.stringify({ error: "buyer identity not linked" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load article + seller
    const { data: article } = await sb
      .from("waouh_articles")
      .select("id,seller_id,title,description,category,condition,price,currency,photos,city,market_price_min,market_price_max,status")
      .eq("id", article_id)
      .maybeSingle();
    if (!article) {
      return new Response(JSON.stringify({ error: "article not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (article.seller_id && buyerUserId && article.seller_id === buyerUserId) {
      // Seller cannot be interested in own article
      return new Response(JSON.stringify({ ok: true, skipped: "self" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: buyerActor } = await sb.from("waouh_users")
      .select("id,auth_user_id,phone_number,web_session_id")
      .eq("id", buyerUserId)
      .single();
    const thread = await resolveProductThread({
      sb,
      articleId: article_id,
      actorUser: buyerActor,
      role: "buyer",
      counterpartUserId: article.seller_id,
      buyerUserId,
      sellerUserId: article.seller_id,
      source,
    });
    if (!thread?.id) {
      return new Response(JSON.stringify({ error: "thread creation failed" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const threadId = thread.id;

    // Insert interest (dedupe on (article, buyer))
    const { error: insErr } = await sb.from("waouh_interests").upsert({
      thread_id: threadId,
      article_id,
      buyer_user_id: buyerUserId,
      seller_user_id: article.seller_id ?? null,
      source,
      payload: { thread_id: threadId, source },
    }, { onConflict: "article_id,buyer_user_id,thread_id", ignoreDuplicates: true });
    const isDuplicate =
      insErr && ((insErr as any).code === "23505" || /duplicate/i.test((insErr as any).message || ""));
    if (insErr && !isDuplicate) {
      console.error("[waouh-buyer-interest] insert error", insErr);
    }

    // 🤝 Ensure an OPEN negotiation exists so the buyer can immediately reply
    // OUI / NON / "je propose X" via waouh-negotiation-router. Without this
    // the router answers "Aucune négociation en cours".
    let negotiationId: string | null = null;
    if (buyerUserId && article.seller_id) {
      try {
        const { data: openNeg } = await sb
          .from("waouh_negotiations")
          .select("id, state")
          .eq("thread_id", threadId)
          .in("state", ["proposed", "countered"])
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!openNeg) {
          const { data: createdNeg, error: createdNegError } = await sb.from("waouh_negotiations").insert({
            thread_id: threadId,
            article_id,
            buyer_user_id: buyerUserId,
            seller_user_id: article.seller_id,
            state: "proposed",
            last_offer_price: (article as any).price ?? null,
            last_actor: "buyer",
            meta: { opened_via: "buyer_interest", source },
          }).select("id").single();
          if (createdNegError) throw createdNegError;
          negotiationId = createdNeg?.id ?? null;
        } else {
          negotiationId = openNeg.id;
        }
      } catch (e) {
        console.warn("[waouh-buyer-interest] open negotiation failed", e);
      }
    }
    await bindThreadState(sb, threadId, {
      status: "negotiating",
      negotiation_id: negotiationId,
    });
    const decisionActions = negotiationId
      ? [
          { id: `accepter:${negotiationId}`, label: "✅ Accepter le prix" },
          { id: `contre-proposition:${negotiationId}`, label: "💬 Faire une contre-offre" },
          { id: `refuser:${negotiationId}`, label: "❌ Refuser" },
        ]
      : [];


    // Always dispatch the seller notification. The dispatcher has its own
    // per-day dedupe_key, so a re-click won't create twin notifications, but
    // a legitimate retry after a previous failure WILL go through.
    let dispatched = false;
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/waouh-notify-dispatch`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          kind: "new_buyer",
          article_id,
          thread_id: threadId,
          buyer_user_id: buyerUserId,
          seller_user_id: article.seller_id,
          counterpart_user_id: buyerUserId,
          recipient: "seller",
          negotiation_id: negotiationId,
          actions: decisionActions,
          extra_text: `📩 Nouvel acheteur intéressé\n\n📦 ${(article as any).title || "Annonce"}\n💰 ${Number((article as any).price || 0).toLocaleString("fr-FR")} FCFA\n\nAcceptez le prix, faites une contre-offre ou refusez.`,
        }),
      });
      dispatched = true;
    } catch (e) {
      console.warn("[waouh-buyer-interest] dispatch failed", e);
    }

    // 🔁 Écho côté acheteur : bulle chat + WhatsApp (si numéro acheteur résolu)
    if (buyerUserId) {
      try {
        const { data: buyerUser } = await sb
          .from("waouh_users")
          .select("id, phone_number, web_session_id, auth_user_id")
          .eq("id", buyerUserId)
          .maybeSingle();
        if (buyerUser) {
          const title = (article as any)?.title || "votre annonce";
          const photos = Array.isArray((article as any)?.photos)
            ? (article as any).photos.filter((url: unknown) => typeof url === "string" && /^https?:\/\//i.test(url as string))
            : [];
          const actions = decisionActions;
          await pushSyncedEvent({
            sb,
            user: buyerUser,
            role: "buyer",
            articleId: article_id,
            negotiationId,
            threadId,
            buyerUserId,
            sellerUserId: article.seller_id,
            counterpartUserId: article.seller_id,
            text: `✅ Demande envoyée au vendeur\n\n📦 ${title}\n\nLe vendeur sera notifié et reviendra vers vous très vite via WAOUH.`,
            intent: "buyer_interest",
            eventType: "buyer_interest",
            template: "buyer_interest_ack",
            dedupSuffix: "actor",
            attachments: photos.slice(0, 6).map((url: string, index: number) => ({
              url,
              type: "image/jpeg",
              caption: `${title} — photo ${index + 1}/${photos.length}`,
            })),
            imageUrl: photos[0] ?? null,
            payloadExtra: {
              source,
              workflow_state: "proposed",
              negotiation_id: negotiationId,
              actions,
              actions,
              products: [{
                id: article_id,
                article_id,
                title,
                description: (article as any)?.description,
                category: (article as any)?.category,
                condition: (article as any)?.condition,
                price: Number((article as any)?.price || 0),
                currency: (article as any)?.currency || "XOF",
                photos,
                city: (article as any)?.city,
                market_price_min: (article as any)?.market_price_min,
                market_price_max: (article as any)?.market_price_max,
                availability: (article as any)?.status === "sold" ? "Vendu" : "Disponible",
                workflow_state: "negotiating",
                role: "buyer",
                thread_id: threadId,
                buyer_user_id: buyerUserId,
                seller_user_id: (article as any)?.seller_id,
                negotiation_id: negotiationId,
                actions,
              }],
            },
          });
        }
      } catch (e) {
        console.warn("[waouh-buyer-interest] buyer echo failed", e);
      }
    }


    return new Response(JSON.stringify({
      ok: true,
      duplicate: !!isDuplicate,
      seller_notified: dispatched,
      negotiation_id: negotiationId,
      workflow_state: negotiationId ? "proposed" : "interest_recorded",
      actions: decisionActions,
      thread_id: threadId,
      article_id,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[waouh-buyer-interest] error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
