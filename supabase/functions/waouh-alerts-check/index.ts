// Vérifie taux d'erreurs WAHA et déclenche webhook si dépassement
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function classify(lastError: string | null): "422" | "429" | "5xx" | "other" {
  if (!lastError) return "other";
  const m = /WAHA\s+(\d{3})/.exec(lastError);
  if (!m) return "other";
  const code = parseInt(m[1], 10);
  if (code === 422) return "422";
  if (code === 429) return "429";
  if (code >= 500 && code < 600) return "5xx";
  return "other";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: cfg } = await sb.from("waouh_alert_config").select("*").order("updated_at", { ascending: false }).limit(1).maybeSingle();
    if (!cfg || !cfg.enabled || !cfg.webhook_url) {
      return new Response(JSON.stringify({ ok: true, skipped: "config missing or disabled" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const sinceIso = new Date(Date.now() - cfg.window_minutes * 60 * 1000).toISOString();
    const { data: failedRows } = await sb.from("waouh_outbound_queue")
      .select("id, dedupe_key, last_error, event_type, to_phone, updated_at")
      .eq("status", "failed").gte("updated_at", sinceIso).limit(500);
    const { count: totalCount } = await sb.from("waouh_outbound_queue")
      .select("id", { count: "exact", head: true }).gte("updated_at", sinceIso);

    const buckets = { "422": [] as any[], "429": [] as any[], "5xx": [] as any[], other: [] as any[] };
    for (const r of failedRows || []) buckets[classify(r.last_error)].push(r);

    const total = totalCount || 0;
    const failedTotal = (failedRows || []).length;
    const globalPct = total > 0 ? Math.round((failedTotal / total) * 100) : 0;

    const triggered: Array<{ rule: string; severity: string; count: number; samples: any[] }> = [];
    if (buckets["422"].length >= cfg.threshold_422) triggered.push({ rule: "422_threshold", severity: "warning", count: buckets["422"].length, samples: buckets["422"].slice(0, 5) });
    if (buckets["429"].length >= cfg.threshold_429) triggered.push({ rule: "429_threshold", severity: "warning", count: buckets["429"].length, samples: buckets["429"].slice(0, 5) });
    if (buckets["5xx"].length >= cfg.threshold_5xx) triggered.push({ rule: "5xx_threshold", severity: "critical", count: buckets["5xx"].length, samples: buckets["5xx"].slice(0, 5) });
    if (globalPct >= cfg.threshold_global_pct && total >= 5) triggered.push({ rule: "global_failure_rate", severity: "critical", count: globalPct, samples: (failedRows || []).slice(0, 5) });

    if (triggered.length === 0) return new Response(JSON.stringify({ ok: true, triggered: 0, globalPct, total, failedTotal }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Cooldown
    if (cfg.last_alert_sent_at) {
      const elapsed = (Date.now() - new Date(cfg.last_alert_sent_at).getTime()) / 60000;
      if (elapsed < cfg.cooldown_minutes) return new Response(JSON.stringify({ ok: true, cooldown: true, elapsed }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const payload = {
      source: "WAOUH WhatsApp Monitor",
      checked_at: new Date().toISOString(),
      window_minutes: cfg.window_minutes,
      total, failed_total: failedTotal, global_pct: globalPct,
      triggered,
    };

    let delivered = false, errorMsg: string | null = null;
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (cfg.webhook_secret) headers["X-Webhook-Secret"] = cfg.webhook_secret;
      const res = await fetch(cfg.webhook_url, { method: "POST", headers, body: JSON.stringify(payload) });
      delivered = res.ok;
      if (!res.ok) errorMsg = `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`;
    } catch (e: any) {
      errorMsg = String(e.message || e);
    }

    await sb.from("waouh_alert_history").insert({
      severity: triggered.some(t => t.severity === "critical") ? "critical" : "warning",
      rule: triggered.map(t => t.rule).join(","),
      count: triggered.reduce((s, t) => s + t.count, 0),
      payload,
      delivered,
      error: errorMsg,
    });

    if (delivered) await sb.from("waouh_alert_config").update({ last_alert_sent_at: new Date().toISOString() }).eq("id", cfg.id);

    return new Response(JSON.stringify({ ok: true, triggered: triggered.length, delivered, error: errorMsg }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
