// waouh-buyer-interest
// Records an explicit buyer interest on an article (independent from chat messages)
// and notifies the seller via the unified dispatcher (in-app + WhatsApp).
//
// Body: { article_id: string, source?: "match"|"radar"|"chat"|"card" }
// Auth: requires Authorization Bearer <user JWT>.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { pushSyncedEvent } from "../_shared/waouh-sync.ts";
import { requestSessionId, requireAuthOrGuestSession } from "../_shared/waouh-auth.ts";
import { resolveProductThread, bindThreadState } from "../_shared/waouh-thread.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    let { article_id, catalog_id, source = "chat" } = body || {};
    if (!article_id && !catalog_id) {
      return new Response(JSON.stringify({ error: "article_id or catalog_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requestedSession = body?.sessionId ?? body?.session_id ?? requestSessionId(req);
    const requestAuth = await requireAuthOrGuestSession(req, requestedSession);
    if (!requestAuth.ok) return requestAuth.response;

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

    // Resolve the buyer exclusively from the verified JWT or guest session.
    const authUserId = requestAuth.authUser?.id ?? null;
    let buyerUserId: string | null = null;
    if (authUserId) {
      const { data } = await sb.from("waouh_users").select("id").eq("auth_user_id", authUserId).limit(1).maybeSingle();
      buyerUserId = data?.id ?? null;
    } else if (requestAuth.headerSessionId) {
      const { data } = await sb.from("waouh_users").select("id")
        .eq("web_session_id", requestAuth.headerSessionId).limit(1).maybeSingle();
      buyerUserId = data?.id ?? null;
    }
    if (!buyerUserId) {
      return new Response(JSON.stringify({ error: "buyer_identity_required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load article + seller
    const { data: article } = await sb
      .from("waouh_articles")
      .select("id, seller_id, title, price")
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

    // Canonical commerce relation: the Deal Room is created/resolved BEFORE
    // the negotiation so every state-changing action has one authoritative thread.
    const { data: buyerActor } = await sb.from("waouh_users")
      .select("id,auth_user_id,phone_number,web_session_id")
      .eq("id", buyerUserId)
      .maybeSingle();
    if (!buyerActor || !article.seller_id) {
      return new Response(JSON.stringify({ error: "commerce_participants_required" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const productThread = await resolveProductThread({
      sb,
      articleId: article_id,
      actorUser: buyerActor,
      role: "buyer",
      counterpartUserId: article.seller_id,
      sellerUserId: article.seller_id,
      source,
      create: true,
    });
    if (!productThread?.id) {
      return new Response(JSON.stringify({ error: "product_thread_required" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert interest (dedupe on (article, buyer))
    const { error: insErr } = await sb.from("waouh_interests").insert({
      article_id,
      buyer_user_id: buyerUserId,
      seller_user_id: article.seller_id ?? null,
      source,
    });
    const isDuplicate =
      insErr && ((insErr as any).code === "23505" || /duplicate/i.test((insErr as any).message || ""));
    if (insErr && !isDuplicate) {
      console.error("[waouh-buyer-interest] insert error", insErr);
    }

    // Ensure one OPEN negotiation bound to the exact canonical Deal Room.
    let negotiationId: string | null = null;
    if (buyerUserId && article.seller_id) {
      try {
        const { data: openNeg } = await sb
          .from("waouh_negotiations")
          .select("id, state, thread_id")
          .eq("article_id", article_id)
          .eq("buyer_user_id", buyerUserId)
          .eq("seller_user_id", article.seller_id)
          .in("state", ["proposed", "countered"])
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (openNeg?.id) {
          negotiationId = openNeg.id;
          if (!openNeg.thread_id) {
            await sb.from("waouh_negotiations")
              .update({ thread_id: productThread.id })
              .eq("id", openNeg.id);
          }
        } else {
          const { data: createdNeg, error: negErr } = await sb.from("waouh_negotiations").insert({
            article_id,
            buyer_user_id: buyerUserId,
            seller_user_id: article.seller_id,
            thread_id: productThread.id,
            state: "proposed",
            last_offer_price: (article as any).price ?? null,
            last_actor: "buyer",
            meta: { opened_via: "buyer_interest", source, canonical_thread: true },
          }).select("id").maybeSingle();
          if (negErr) throw negErr;
          negotiationId = createdNeg?.id ?? null;
        }
        if (negotiationId) {
          await bindThreadState(sb, productThread.id, {
            status: "negotiating",
            negotiation_id: negotiationId,
          });
          await sb.rpc("waouh_record_commerce_event", {
            p_event_type: "buyer_interest_opened",
            p_entity_type: "negotiation",
            p_entity_id: negotiationId,
            p_thread_id: productThread.id,
            p_article_id: article_id,
            p_negotiation_id: negotiationId,
            p_actor_user_id: buyerUserId,
            p_actor_role: "buyer",
            p_previous_state: null,
            p_next_state: "proposed",
            p_payload: { source },
          }).catch(() => {});
        }
      } catch (e) {
        console.warn("[waouh-buyer-interest] open negotiation failed", e);
      }
    }


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
          counterpart_user_id: buyerUserId,
          recipient: "seller",
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
          await pushSyncedEvent({
            sb,
            user: buyerUser,
            role: "buyer",
            articleId: article_id,
            text: `✅ Demande envoyée au vendeur\n\n📦 ${title}\n\nLe vendeur sera notifié et reviendra vers vous très vite via WAOUH.`,
            intent: "buyer_interest",
            eventType: "buyer_interest",
            template: "buyer_interest_ack",
            negotiationId,
            payloadExtra: {
              thread_id: productThread.id,
              buyer_user_id: buyerUserId,
              seller_user_id: article.seller_id,
              workflow_state: "negotiating",
              actions: negotiationId ? [
                { id: `accepter:${negotiationId}`, label: "✅ Accepter" },
                { id: `contre-proposition:${negotiationId}`, label: "💬 Proposer un prix" },
                { id: `refuser:${negotiationId}`, label: "❌ Refuser" },
              ] : [],
            },
            dedupSuffix: "actor",
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
      thread_id: productThread.id,
      negotiation_id: negotiationId,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[waouh-buyer-interest] error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
