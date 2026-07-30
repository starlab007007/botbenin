// WAOUH — Réception des évènements de traçabilité UI (correlation_id).
// Insère dans `waouh_trace_events` avec le service role : fonctionne aussi
// pour les sessions web anonymes. Stages autorisés : `ui_*` uniquement.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_STAGES = new Set([
  "ui_notification_click",
  "ui_window_open",
  "ui_message_sent",
  "ui_message_received",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const stage = String(body?.stage || "");
    if (!ALLOWED_STAGES.has(stage)) {
      return new Response(JSON.stringify({ ok: false, error: "stage non autorisé" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    await sb.from("waouh_trace_events").insert({
      correlation_id: String(body?.correlation_id || "").slice(0, 120) || null,
      article_id: body?.article_id ?? null,
      negotiation_id: body?.negotiation_id ?? null,
      transaction_id: body?.transaction_id ?? null,
      recipient_user_id: body?.counterpart_user_id ?? null,
      role: body?.role ?? null,
      stage,
      status: "ok",
      intent: body?.intent ?? null,
      payload: {
        ...(body?.payload && typeof body.payload === "object" ? body.payload : {}),
        session_id: body?.session_id ?? null,
        notification_id: body?.notification_id ?? null,
        message_id: body?.message_id ?? null,
      },
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.warn("[waouh-trace-ui]", e?.message ?? e);
    return new Response(JSON.stringify({ ok: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
