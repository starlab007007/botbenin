// waouh-buyer-interest
// Records an explicit buyer interest on an article (independent from chat messages)
// and notifies the seller via the unified dispatcher (in-app + WhatsApp).
//
// Body: { article_id: string, source?: "match"|"radar"|"chat"|"card" }
// Auth: requires Authorization Bearer <user JWT>.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { pushSyncedEvent } from "../_shared/waouh-sync.ts";

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

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Resolve the calling user from the JWT (if any)
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    let authUserId: string | null = null;
    if (token) {
      try {
        const { data } = await sb.auth.getUser(token);
        authUserId = data?.user?.id ?? null;
      } catch { /* anonymous */ }
    }

    // Resolve buyer waouh_users id
    let buyerUserId: string | null = null;
    if (authUserId) {
      const { data } = await sb.from("waouh_users").select("id").eq("auth_user_id", authUserId).maybeSingle();
      buyerUserId = data?.id ?? null;
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

    // 🤝 Ensure an OPEN negotiation exists so the buyer can immediately reply
    // OUI / NON / "je propose X" via waouh-negotiation-router. Without this
    // the router answers "Aucune négociation en cours".
    if (buyerUserId && article.seller_id) {
      try {
        const { data: openNeg } = await sb
          .from("waouh_negotiations")
          .select("id, state")
          .eq("article_id", article_id)
          .eq("buyer_user_id", buyerUserId)
          .eq("seller_user_id", article.seller_id)
          .in("state", ["proposed", "countered"])
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!openNeg) {
          await sb.from("waouh_negotiations").insert({
            article_id,
            buyer_user_id: buyerUserId,
            seller_user_id: article.seller_id,
            state: "proposed",
            last_offer_price: (article as any).price ?? null,
            last_actor: "buyer",
            meta: { opened_via: "buyer_interest", source },
          });
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
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[waouh-buyer-interest] error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
