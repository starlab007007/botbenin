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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // WAHA / Meta verification GET
  if (req.method === "GET") {
    const url = new URL(req.url);
    const challenge = url.searchParams.get("hub.challenge");
    if (challenge) return new Response(challenge, { headers: corsHeaders });
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const sb = createClient(SUPABASE_URL, SERVICE);
    const raw = await req.json().catch(() => ({}));

    // Normalize payload — supports web widget AND WAHA webhook
    let channel: "web" | "whatsapp" = raw.channel ?? "whatsapp";
    let text = raw.text ?? "";
    let phone: string | null = raw.phone ?? null;
    let sessionId: string | null = raw.sessionId ?? null;
    const lat = raw.lat ?? 6.36;
    const lng = raw.lng ?? 2.42;
    const city = raw.city ?? "Cotonou";

    // WAHA shape: { event:"message", session, payload:{ from, body, fromMe } }
    if (raw.event && raw.payload) {
      if (raw.event !== "message" || raw.payload.fromMe) {
        return new Response(JSON.stringify({ ok: true, skipped: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      channel = "whatsapp";
      phone = (raw.payload.from || "").replace("@c.us", "");
      text = raw.payload.body || "";
    }

    if (!text || (!phone && !sessionId)) {
      return new Response(JSON.stringify({ ok: false, error: "missing text or identifier" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert user
    let user: any = null;
    if (channel === "web") {
      const { data: existing } = await sb.from("waouh_users").select("*").eq("web_session_id", sessionId).maybeSingle();
      user = existing;
      if (!user) {
        const { data: created } = await sb.from("waouh_users").insert({
          web_session_id: sessionId, channel: "web", city,
          location: `SRID=4326;POINT(${lng} ${lat})` as any,
        }).select().single();
        user = created;
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

    // Persist incoming message
    await sb.from("waouh_messages").insert({
      user_id: user.id, channel, direction: "in", text,
      web_session_id: sessionId, phone_number: phone,
    });

    // Call core engine (waouh-webhook) to get a reply
    const coreRes = await fetch(`${SUPABASE_URL}/functions/v1/waouh-webhook`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
      body: JSON.stringify({ phone_number: phone || `web:${sessionId}`, text, lat, lng, city, channel }),
    });
    const core = await coreRes.json().catch(() => ({}));
    const reply: string = core.reply ?? "…";

    // Persist outgoing message
    await sb.from("waouh_messages").insert({
      user_id: user.id, channel, direction: "out", text: reply,
      web_session_id: sessionId, phone_number: phone,
      meta: { intent: core.intent ?? null },
    });

    // Route to WAHA if WhatsApp
    if (channel === "whatsapp" && phone && WAHA_BASE_URL) {
      try {
        await fetch(`${WAHA_BASE_URL.replace(/\/$/, "")}/api/sendText`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(WAHA_API_KEY ? { "X-Api-Key": WAHA_API_KEY } : {}),
          },
          body: JSON.stringify({
            session: WAHA_SESSION,
            chatId: phone.includes("@") ? phone : `${phone}@c.us`,
            text: reply,
          }),
        });
      } catch (e) {
        console.error("WAHA send failed", e);
      }
    }

    return new Response(JSON.stringify({ ok: true, reply, intent: core.intent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
