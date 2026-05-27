// Centralised operator → user message dispatch.
// Called from the WAOUH mobile/admin chat console to deliver an outbound
// message (text + optional images) into the right channel (web or WhatsApp)
// AND persist it to waouh_messages with a proper conversation_id.
//
// Body:
//  {
//    conversation_id: string,
//    text?: string,
//    attachments?: { url: string; type?: string; caption?: string }[]
//  }
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const WAHA_BASE_URL = Deno.env.get("WAHA_BASE_URL");
const WAHA_API_KEY = Deno.env.get("WAHA_API_KEY")?.trim();
const WAHA_API_KEY_PLAIN = Deno.env.get("WAHA_API_KEY_PLAIN")?.trim();
const WAHA_SESSION = Deno.env.get("WAHA_SESSION") || "WaouhApp";

function wahaHeaders(): Record<string, string> {
  const key = WAHA_API_KEY_PLAIN || WAHA_API_KEY || "";
  return key
    ? { "Content-Type": "application/json", "X-Api-Key": key }
    : { "Content-Type": "application/json" };
}

async function sendWahaText(chatId: string, text: string) {
  const base = (WAHA_BASE_URL || "").replace(/\/$/, "");
  const r = await fetch(`${base}/api/sendText`, {
    method: "POST",
    headers: wahaHeaders(),
    body: JSON.stringify({ session: WAHA_SESSION, chatId, text }),
  });
  if (r.ok) return r;
  return fetch(`${base}/api/${WAHA_SESSION}/sendText`, {
    method: "POST",
    headers: wahaHeaders(),
    body: JSON.stringify({ chatId, text }),
  });
}

async function sendWahaImage(chatId: string, imageUrl: string, caption: string) {
  const base = (WAHA_BASE_URL || "").replace(/\/$/, "");
  const r = await fetch(`${base}/api/sendImage`, {
    method: "POST",
    headers: wahaHeaders(),
    body: JSON.stringify({ session: WAHA_SESSION, chatId, file: { url: imageUrl }, caption }),
  });
  if (r.ok) return r;
  return fetch(`${base}/api/${WAHA_SESSION}/sendImage`, {
    method: "POST",
    headers: wahaHeaders(),
    body: JSON.stringify({ chatId, file: { url: imageUrl }, caption }),
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth gate — caller must be a logged-in user (operator).
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "missing_auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(SUPABASE_URL, SERVICE);

    const body = await req.json().catch(() => ({}));
    const conversation_id = String(body.conversation_id || "");
    const text = String(body.text || "").trim();
    const attachments: Array<{ url: string; type?: string; caption?: string }> =
      Array.isArray(body.attachments) ? body.attachments.filter((a: any) => a && a.url) : [];

    if (!conversation_id) {
      return new Response(JSON.stringify({ error: "conversation_id_required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!text && attachments.length === 0) {
      return new Response(JSON.stringify({ error: "empty_message" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load conversation
    const { data: conv, error: convErr } = await sb
      .from("waouh_conversations")
      .select("id, user_id, phone_number")
      .eq("id", conversation_id)
      .maybeSingle();
    if (convErr || !conv) {
      return new Response(JSON.stringify({ error: "conversation_not_found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve user/channel
    let channel: "web" | "whatsapp" = "web";
    let phone: string | null = null;
    let webSessionId: string | null = null;
    if (conv.user_id) {
      const { data: u } = await sb
        .from("waouh_users")
        .select("channel, phone_number, web_session_id")
        .eq("id", conv.user_id)
        .maybeSingle();
      channel = (u?.channel as any) === "whatsapp" ? "whatsapp" : "web";
      phone = u?.phone_number ?? conv.phone_number ?? null;
      webSessionId = (u as any)?.web_session_id ?? null;
    } else if (conv.phone_number?.startsWith("web:")) {
      channel = "web";
      webSessionId = conv.phone_number.slice(4);
    } else if (conv.phone_number) {
      channel = "whatsapp";
      phone = conv.phone_number;
    }

    // Persist outbound message
    const { data: inserted, error: insErr } = await sb
      .from("waouh_messages")
      .insert({
        conversation_id,
        user_id: conv.user_id,
        phone_number: channel === "whatsapp" ? phone : null,
        web_session_id: channel === "web" ? webSessionId : null,
        channel,
        direction: "out",
        text: text || (attachments.length ? "(image)" : ""),
        attachments,
        meta: { source: "operator", operator_id: user.id },
      })
      .select("id")
      .single();
    if (insErr) throw insErr;

    // Update conversation summary
    await sb.from("waouh_conversations")
      .update({
        last_message: text || "(image)",
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversation_id);

    // Dispatch to WhatsApp if applicable
    let waha: { ok: boolean; status?: number; error?: string } = { ok: true };
    if (channel === "whatsapp" && phone && WAHA_BASE_URL) {
      try {
        const chatId = phone.includes("@") ? phone : `${phone.replace(/^\+/, "")}@c.us`;
        // Send each image with its own caption; then any remaining text.
        let lastStatus = 200;
        for (let i = 0; i < attachments.length; i++) {
          const a = attachments[i];
          const caption = i === 0 && text ? text : (a.caption || "");
          const r = await sendWahaImage(chatId, a.url, caption);
          lastStatus = r.status;
          if (!r.ok) {
            const errText = await r.text().catch(() => "");
            waha = { ok: false, status: r.status, error: errText.slice(0, 200) };
            console.warn("[operator-send] waha image failed", waha);
          }
        }
        if (text && attachments.length === 0) {
          const r = await sendWahaText(chatId, text);
          lastStatus = r.status;
          if (!r.ok) {
            const errText = await r.text().catch(() => "");
            waha = { ok: false, status: r.status, error: errText.slice(0, 200) };
          }
        }
        if (waha.ok) waha = { ok: true, status: lastStatus };
      } catch (e: any) {
        waha = { ok: false, error: String(e?.message || e) };
        console.error("[operator-send] waha exception", e);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, id: inserted?.id, channel, waha }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("[operator-send] error", e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
