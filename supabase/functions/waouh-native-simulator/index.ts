import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { renderSmsFromEngine, segmentSms } from "../_shared/waouh-tel/render-sms.ts";
import { renderRcsFromEngine } from "../_shared/waouh-tel/render-rcs.ts";
import type { WaouhEngineReply } from "../_shared/waouh-tel/types.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-client-info, x-waouh-session",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const text = String(body?.text || "").trim();
    const mode = body?.mode === "rcs" ? "rcs" : "sms";
    const sessionId = String(body?.sessionId || "").trim();
    const headerSession = (req.headers.get("x-waouh-session") || "").trim();

    if (!text) return json({ ok: false, error: "message_required" }, 400);
    if (!sessionId || !headerSession || sessionId !== headerSession) {
      return json({ ok: false, error: "invalid_guest_session" }, 403);
    }

    const supabaseUrl = (Deno.env.get("SUPABASE_URL") || "").replace(/\/$/, "");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    if (!supabaseUrl || !anonKey) {
      return json({ ok: false, error: "supabase_runtime_missing" }, 503);
    }

    const authorization = req.headers.get("authorization") || `Bearer ${anonKey}`;
    const upstream = await fetch(
      `${supabaseUrl}/functions/v1/waouh-channel-in-secure`,
      {
        method: "POST",
        headers: {
          Authorization: authorization,
          apikey: anonKey,
          "Content-Type": "application/json",
          "x-waouh-session": sessionId,
        },
        body: JSON.stringify({
          channel: "web",
          sessionId,
          text,
          city: String(body?.city || "Cotonou"),
          meta: {
            native_messaging_simulation: true,
            native_mode: mode,
          },
        }),
      },
    );

    const engine = await upstream.json().catch(() => null);
    if (!upstream.ok || !engine?.ok) {
      return json(
        {
          ok: false,
          error: engine?.error || engine?.code || "waouh_engine_unavailable",
          detail: engine,
        },
        upstream.status >= 400 ? upstream.status : 502,
      );
    }

    const reply: WaouhEngineReply = {
      schema: "waouh.message.v1",
      text: String(engine.reply || ""),
      products: Array.isArray(engine.products)
        ? engine.products
        : (Array.isArray(engine.results) ? engine.results : []),
      actions: Array.isArray(engine.actions) ? engine.actions : [],
      attachments: Array.isArray(engine.attachments) ? engine.attachments : [],
    };

    const rendered = mode === "rcs"
      ? renderRcsFromEngine(reply)
      : renderSmsFromEngine(reply);

    return json({
      ok: true,
      mode,
      rendered,
      segments: mode === "sms" ? segmentSms(rendered.text) : [],
      engine: {
        intent: engine.intent ?? null,
        correlation_id: engine.correlation_id ?? null,
        conversation_id: engine.conversation_id ?? null,
      },
      dry_run: true,
    });
  } catch (error) {
    console.error("[waouh-native-simulator]", error);
    return json({
      ok: false,
      error: error instanceof Error ? error.message : "simulation_failed",
    }, 500);
  }
});
