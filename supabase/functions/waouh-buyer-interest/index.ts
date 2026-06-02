// waouh-buyer-interest
// Records an explicit buyer interest on an article (independent from chat messages)
// and notifies the seller via the unified dispatcher (in-app + WhatsApp).
//
// Body: { article_id: string, source?: "match"|"radar"|"chat"|"card" }
// Auth: requires Authorization Bearer <user JWT>.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { article_id, source = "chat" } = await req.json().catch(() => ({}));
    if (!article_id || typeof article_id !== "string") {
      return new Response(JSON.stringify({ error: "article_id required" }), {
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
      .select("id, seller_id, title")
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

    // Dedupe seller notification per (article, buyer) using the processed_events table
    const buyerKey = buyerUserId || `anon:${crypto.randomUUID()}`;
    const dedupeId = `new_buyer:${article_id}:${buyerKey}`;
    const { error: dupErr } = await sb
      .from("waouh_processed_events")
      .insert({ event_id: dedupeId, source: "new_buyer" });

    let dispatched = false;
    if (!dupErr) {
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
