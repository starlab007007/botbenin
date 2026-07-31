// Relance manuelle d'une notification WhatsApp via dedupe_key, queue_id ou transaction_id
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-waouh-session",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Vérif admin
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await sb.auth.getUser(token);
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: isAdmin } = await sb.rpc("has_role", { _user_id: user.id, _role_name: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const { dedupe_key, queue_id, transaction_id, event_type } = body || {};

    let q = sb.from("waouh_outbound_queue").select("*").in("status", ["failed", "sent", "pending", "sending"]).order("created_at", { ascending: false }).limit(20);
    if (queue_id) q = sb.from("waouh_outbound_queue").select("*").eq("id", queue_id);
    else if (dedupe_key) q = q.eq("dedupe_key", dedupe_key);
    else if (transaction_id) q = q.eq("transaction_id", transaction_id);
    else return new Response(JSON.stringify({ error: "provide dedupe_key, queue_id or transaction_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (event_type) q = q.eq("event_type", event_type);

    const { data: rows, error } = await q;
    if (error) throw error;
    if (!rows || rows.length === 0) return new Response(JSON.stringify({ ok: true, found: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const targets = rows.filter((r: any) => r.status === "failed" || r.id === queue_id);
    const ids = targets.map((r: any) => r.id);
    if (ids.length > 0) {
      await sb.from("waouh_outbound_queue").update({
        status: "pending",
        attempts: 0,
        last_error: null,
        next_attempt_at: new Date().toISOString(),
      }).in("id", ids);
    }

    // Trigger dispatch
    const dispatchUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/waouh-outbound-dispatch`;
    const dispatchRes = await fetch(dispatchUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
      body: JSON.stringify({ limit: 20 }),
    });
    const dispatchJson = await dispatchRes.json().catch(() => ({}));

    // Re-fetch state
    const { data: after } = await sb.from("waouh_outbound_queue").select("*").in("id", ids.length ? ids : rows.map((r: any) => r.id));

    return new Response(JSON.stringify({ ok: true, found: rows.length, replayed: ids.length, dispatch: dispatchJson, after }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
