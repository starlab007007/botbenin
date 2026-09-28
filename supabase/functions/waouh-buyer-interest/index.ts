// WAOUH_V25_7_1_AUTH_ACTOR_STABLE
// waouh-buyer-interest
// Records an explicit buyer interest on an article (independent from chat messages)
// and notifies the seller via the unified dispatcher (in-app + WhatsApp).
//
// Body: { article_id: string, source?: "match"|"radar"|"chat"|"card" }
// Auth: requires Authorization Bearer <user JWT>.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-waouh-session, x-session-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
import { requestSessionId, requireAuthOrGuestSession } from "../_shared/waouh-auth.ts";
import { openBuyerDeal } from "../_shared/waouh-deal-open.ts";
import { chatCatalogV3Enabled } from "../_shared/waouh-chat-writer.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    let { article_id, catalog_id, source = "chat", buyer_user_id: explicitBuyerUserId, offer_price, initial_offer_amount } = body || {};
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

    // Resolve the caller without regressing guest Web sessions. Internal
    // service-role calls may explicitly provide buyer_user_id; browser/mobile
    // callers are resolved from a verified JWT or the signed WAOUH guest session.
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    const trustedInternal = token === SERVICE_ROLE;
    const requestedSession = body?.sessionId ?? body?.session_id ?? requestSessionId(req);
    let requestAuth: any = null;
    if (!trustedInternal) {
      requestAuth = await requireAuthOrGuestSession(req, requestedSession);
      if (!requestAuth.ok) return requestAuth.response;
    }

    const authUserId: string | null = trustedInternal
      ? null
      : (requestAuth?.authUser?.id ?? null);

    // Resolve buyer waouh_users id from the authoritative caller identity.
    let buyerUserId: string | null = trustedInternal ? (explicitBuyerUserId || null) : null;
    if (!buyerUserId && authUserId) {
      const { data } = await sb.from("waouh_users")
        .select("id,auth_user_id,phone_number,web_session_id")
        .eq("auth_user_id", authUserId)
        .limit(1)
        .maybeSingle();
      buyerUserId = data?.id ?? null;
    }
    if (!buyerUserId && requestAuth?.headerSessionId) {
      const { data } = await sb.from("waouh_users")
        .select("id,auth_user_id,phone_number,web_session_id")
        .eq("web_session_id", requestAuth.headerSessionId)
        .limit(1)
        .maybeSingle();
      buyerUserId = data?.id ?? null;
    }
    if (!buyerUserId) {
      return new Response(JSON.stringify({ error: "buyer identity not linked" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ouverture commune (_shared/waouh-deal-open.ts) : mêmes tables, mêmes
    // textes et mêmes boutons qu'avant ; le même module sert désormais aussi
    // waouh-channel-in et waouh-commerce-action (un seul chemin d'entrée).
    const catalogV3 = await chatCatalogV3Enabled(sb);
    const opened = await openBuyerDeal({
      sb,
      articleId: article_id,
      buyerUserId,
      source,
      offer: offer_price ?? initial_offer_amount ?? null,
      supabaseUrl: SUPABASE_URL,
      serviceRole: SERVICE_ROLE,
      notifySeller: "always",
      echoBuyer: true,
      catalogV3,
    });
    if (!opened.ok) {
      if (opened.code === "self") {
        // Seller cannot be interested in own article
        return new Response(JSON.stringify({ ok: true, skipped: "self" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const status = opened.code === "article_not_found" ? 404
        : opened.code === "invalid_offer" ? 422
        : 409;
      const error = opened.code === "article_not_found" ? "article not found"
        : opened.code === "invalid_offer" ? "invalid offer_price"
        : "thread creation failed";
      return new Response(JSON.stringify({ error }), {
        status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const negotiationId = opened.negotiationId;
    const threadId = opened.threadId;

    return new Response(JSON.stringify({
      ok: true,
      duplicate: opened.duplicateInterest,
      seller_notified: opened.sellerNotified,
      negotiation_id: negotiationId,
      workflow_state: negotiationId ? "proposed" : "interest_recorded",
      // Réponse adressée à l'acheteur : aucune décision à prendre sur sa propre offre.
      actions: [],
      thread_id: threadId,
      article_id,
      offer_price: opened.offerPrice,
      stage: negotiationId ? "negotiation" : "interest",
      created: opened.created,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[waouh-buyer-interest] error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
