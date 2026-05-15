import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WAHA_BASE_URL = Deno.env.get("WAHA_BASE_URL");
const WAHA_API_KEY = Deno.env.get("WAHA_API_KEY");
const WAHA_SESSION = Deno.env.get("WAHA_SESSION") || "default";

function log(step: string, data: any = {}) {
  console.log(`[waouh-channel-in] ${step}`, JSON.stringify(data));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method === "GET") {
    const url = new URL(req.url);
    const challenge = url.searchParams.get("hub.challenge");
    if (challenge) return new Response(challenge, { headers: corsHeaders });
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const sb = createClient(SUPABASE_URL, SERVICE);
    const raw = await req.json().catch(() => ({}));
    log("payload", raw);

    let channel: "web" | "whatsapp" = raw.channel ?? "whatsapp";
    let text: string = raw.text ?? "";
    let phone: string | null = raw.phone ?? null;
    let sessionId: string | null = raw.sessionId ?? null;
    let attachments: Array<{ url: string; type: string }> = Array.isArray(raw.attachments) ? raw.attachments : [];
    const lat = raw.lat ?? 6.36;
    const lng = raw.lng ?? 2.42;
    const city = raw.city ?? "Cotonou";
    const authUserId: string | null = raw.authUserId ?? null;

    // WAHA: { event:"message", session, payload:{ from, body, fromMe, hasMedia, mediaUrl, mimetype } }
    if (raw.event && raw.payload) {
      if (raw.event !== "message" || raw.payload.fromMe) {
        return new Response(JSON.stringify({ ok: true, skipped: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      channel = "whatsapp";
      phone = (raw.payload.from || "").replace("@c.us", "");
      text = raw.payload.body || "";
      if (raw.payload.mediaUrl) attachments.push({ url: raw.payload.mediaUrl, type: raw.payload.mimetype || "image/jpeg" });
    }

    if ((!text && attachments.length === 0) || (!phone && !sessionId)) {
      return new Response(JSON.stringify({ ok: false, error: "missing text/attachments or identifier" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert user
    let user: any = null;
    if (channel === "web") {
      const { data: existing } = await sb.from("waouh_users").select("*").eq("web_session_id", sessionId).maybeSingle();
      user = existing;
      if (!user) {
        const { data: created, error } = await sb.from("waouh_users").insert({
          web_session_id: sessionId, channel: "web", city,
          auth_user_id: authUserId,
          location: `SRID=4326;POINT(${lng} ${lat})` as any,
        }).select().single();
        if (error) log("user insert error", error);
        user = created;
      } else if (authUserId && !user.auth_user_id) {
        await sb.from("waouh_users").update({ auth_user_id: authUserId, city }).eq("id", user.id);
      } else if (city && city !== user.city) {
        await sb.from("waouh_users").update({ city }).eq("id", user.id);
      }
    } else {
      const { data: existing } = await sb.from("waouh_users").select("*").eq("phone_number", phone).maybeSingle();
      user = existing;
      if (!user) {
        const { data: created } = await sb.from("waouh_users").insert({
          phone_number: phone, channel: "whatsapp", city,
          location: `SRID=4326;POINT(${lng} ${lat})` as any,
        }).select().single();
        user = created;
      }
    }
    log("user", { id: user?.id });

    // Persist incoming
    await sb.from("waouh_messages").insert({
      user_id: user.id, channel, direction: "in", text: text || "(image)",
      web_session_id: sessionId, phone_number: phone,
      attachments,
    });

    // Negotiation routing : si l'utilisateur a une négo ouverte, route vers negotiation-router
    const { data: openNeg } = await sb
      .from("waouh_negotiations")
      .select("id")
      .or(`buyer_user_id.eq.${user.id},seller_user_id.eq.${user.id}`)
      .in("state", ["proposed", "countered"])
      .limit(1)
      .maybeSingle();

    if (openNeg) {
      const negRes = await fetch(`${SUPABASE_URL}/functions/v1/waouh-negotiation-router`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
        body: JSON.stringify({ phone, text, user_id: user.id }),
      });
      const negData = await negRes.json().catch(() => ({}));
      const negReply = negData?.reply || "OK";
      await sb.from("waouh_messages").insert({
        user_id: user.id, channel, direction: "out", text: negReply,
        web_session_id: sessionId, phone_number: phone,
        meta: { intent: "negotiation" },
      });
      if (channel === "whatsapp" && phone && WAHA_BASE_URL) {
        try {
          await fetch(`${WAHA_BASE_URL.replace(/\/$/, "")}/api/sendText`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(WAHA_API_KEY ? { "X-Api-Key": WAHA_API_KEY } : {}) },
            body: JSON.stringify({ session: WAHA_SESSION, chatId: phone.includes("@") ? phone : `${phone}@c.us`, text: negReply }),
          });
        } catch (e) { console.error("WAHA send failed", e); }
      }
      return new Response(JSON.stringify({ ok: true, reply: negReply, intent: "negotiation" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call core engine
    const coreRes = await fetch(`${SUPABASE_URL}/functions/v1/waouh-webhook`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        phone_number: phone || `web:${sessionId}`,
        web_session_id: sessionId,
        text, lat, lng, city, channel, attachments,
        user_id: user.id, auth_user_id: user.auth_user_id ?? authUserId,
      }),
    });
    const core = await coreRes.json().catch(() => ({}));
    log("core reply", { ok: coreRes.ok, intent: core.intent, hasReply: !!core.reply });
    const reply: string = core.reply ?? "Désolé, une erreur est survenue. Réessayez.";

    // Persist outgoing
    await sb.from("waouh_messages").insert({
      user_id: user.id, channel, direction: "out", text: reply,
      web_session_id: sessionId, phone_number: phone,
      meta: { intent: core.intent ?? null, transaction_id: core.transaction_id ?? null, article_id: core.article_id ?? null },
    });

    // WAHA send
    if (channel === "whatsapp" && phone && WAHA_BASE_URL) {
      try {
        await fetch(`${WAHA_BASE_URL.replace(/\/$/, "")}/api/sendText`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(WAHA_API_KEY ? { "X-Api-Key": WAHA_API_KEY } : {}) },
          body: JSON.stringify({
            session: WAHA_SESSION,
            chatId: phone.includes("@") ? phone : `${phone}@c.us`,
            text: reply,
          }),
        });
      } catch (e) { console.error("WAHA send failed", e); }
    }

    return new Response(JSON.stringify({ ok: true, reply, intent: core.intent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[waouh-channel-in] error", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
