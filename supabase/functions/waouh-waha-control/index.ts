import { CENTRAL_WAHA_SESSION, centralSessionSummary, centralProviderOperational, centralWebhookConfig, whatsAppPhoneCandidates } from "../_shared/waouh-central-whatsapp.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { requireRuntimeOrAdmin } from "../_shared/waouh-runtime-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-waouh-session",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const WAHA_BASE_URL = Deno.env.get("WAHA_BASE_URL");
const WAHA_API_KEY = Deno.env.get("WAHA_API_KEY");

async function readWaha(res: Response) {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("image/")) {
    const buf = new Uint8Array(await res.arrayBuffer());
    let bin = "";
    for (const b of buf) bin += String.fromCharCode(b);
    return { image: `data:${contentType};base64,${btoa(bin)}` };
  }
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { raw: text, status: res.status }; }
}

async function fetchWaha(base: string, path: string, init: RequestInit = {}, headers: Record<string, string> = {}) {
  return fetch(`${base}${path}`, { ...init, signal: AbortSignal.timeout(20000), headers: { ...headers, ...(init.headers || {}) } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const service = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const guard = await requireRuntimeOrAdmin(req, service);
    if (!guard.ok) return guard.response;

    if (!WAHA_BASE_URL) return json({ error: "WAHA_BASE_URL secret missing" }, 500);
    const base = WAHA_BASE_URL.replace(/\/$/, "");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(WAHA_API_KEY ? { "X-Api-Key": WAHA_API_KEY } : {}),
    };

    const { action, session = "WaouhApp", webhook, config, phone, recovery_key } = await req.json();

    if (action === "central-recover") {
      if (guard.actor !== "service") return json({error:"service_role_required"},403);
      const current = await fetchWaha(base, `/api/sessions/${CENTRAL_WAHA_SESSION}`, {}, headers);
      if (!current.ok) return json({error:"central_session_unavailable"},503);
      if (!centralSessionSummary(await readWaha(current)).identity_matches) return json({error:"central_identity_mismatch"},409);
      if (typeof recovery_key !== "string" || !/^[a-zA-Z0-9_-]{8,80}$/.test(recovery_key)) return json({error:"recovery_key_required"},422);
      const {error: lockError} = await service.from("waouh_processed_events").insert({event_id:`central-recovery:${recovery_key}`,source:"waha-maintenance"});
      if (lockError) return json({restarted:false,already_attempted:lockError.code === "23505"},lockError.code === "23505"?200:503);
      const restarted = await fetchWaha(base, `/api/sessions/${CENTRAL_WAHA_SESSION}/restart`, {method:"POST"}, headers);
      return json({restarted:restarted.ok,provider_status:restarted.status},restarted.ok?200:502);
    }

    if (action === "central-webhook-probe") {
      if (guard.actor !== "service") return json({error:"service_role_required"},403);
      const current = await fetchWaha(base, `/api/sessions/${CENTRAL_WAHA_SESSION}`, {}, headers);
      if (!current.ok) return json({error:"central_session_unavailable"},503);
      const data = await readWaha(current);
      const hook = data.config?.webhooks?.find((h:any)=>h.url === `${SUPABASE_URL}/functions/v1/waha-webhook`);
      if (!hook) return json({error:"canonical_webhook_missing"},409);
      const probeHeaders:Record<string,string> = {"Content-Type":"application/json"};
      for (const header of hook.customHeaders || []) probeHeaders[header.name] = header.value;
      const result = await fetch(hook.url, {method:"POST",headers:probeHeaders,
        body:JSON.stringify({event:"session.status",session:CENTRAL_WAHA_SESSION,payload:{status:data.status}}),
        signal:AbortSignal.timeout(15000)}).catch(()=>null);
      const versionResponse = await fetchWaha(base, "/api/version", {}, headers);
      const version = versionResponse.ok ? await readWaha(versionResponse) : {};
      return json({provider_version:version.version || "UNKNOWN", provider_tier:version.tier || "UNKNOWN", provider_engine:data.engine || data.config?.engine || "UNKNOWN",webhook_http_status:result?.status || 0});
    }

    if (action === "central-chat-history") {
      // Used only by trusted verification tooling; browser/admin callers cannot read raw chat history here.
      if (guard.actor !== "service") return json({error:"service_role_required"},403);
      const candidates = whatsAppPhoneCandidates(phone);
      if (!candidates.length) return json({error:"invalid_phone"},422);
      const messages:any[] = [];
      let readable = false;
      const probes: {status:number; shape?:string; error?:string}[] = [];
      for (const candidate of candidates) {
        const response = await fetch(`${base}/api/${CENTRAL_WAHA_SESSION}/chats/${encodeURIComponent(candidate+"@c.us")}/messages?limit=50`, {
          headers, signal:AbortSignal.timeout(5000),
        }).catch(()=>null);
        if (!response?.ok) {
          const failure = await response?.json().catch(()=>null);
          let error = String(failure?.exception?.message || failure?.message || failure?.error || "").slice(0,400);
          if (WAHA_API_KEY) error = error.split(WAHA_API_KEY).join("[redacted]");
          error = error.replace(/https?:\/\/[^\s]+/g,"[url]").replace(/\d{6,}/g,"[number]");
          probes.push({status:response?.status || 0,error}); continue;
        }
        const data = await response.json().catch(()=>null);
        const rows = Array.isArray(data) ? data : data?.messages;
        probes.push({status:response.status,shape:Array.isArray(data)?"array":typeof data});
        if (Array.isArray(rows)) { readable = true; messages.push(...rows); }
      }
      return json({readable,messages,probes},readable ? 200 : 503);
    }

    if (action === "governor-status") {
      const { data, error } = await service.rpc("waouh_wa_governor_status");
      return error ? json({ error: "governor_unavailable" }, 503) : json(data);
    }
    if (action === "governor-set" || action === "governor-resume") {
      const clamp = (v: unknown, min: number, max: number) => Math.min(max, Math.max(min, Math.round(Number(v))));
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (action === "governor-resume") { patch.paused_until = null; patch.pause_reason = null; }
      else {
        const settings = (config && typeof config === "object" ? config : {}) as Record<string, unknown>;
        const limits: Record<string, [number, number]> = {
          daily_cap: [0, 5000], hourly_cap: [0, 1000], min_gap_s: [0, 600], max_gap_s: [0, 900],
          quiet_start: [0, 23], quiet_end: [0, 23], cold_share_pct: [0, 100],
          per_contact_day: [1, 50], per_contact_week: [1, 200],
        };
        for (const [key, [min, max]] of Object.entries(limits)) {
          if (settings[key] !== undefined && Number.isFinite(Number(settings[key]))) patch[key] = clamp(settings[key], min, max);
        }
        if (typeof settings.enabled === "boolean") patch.enabled = settings.enabled;
        if (Number(patch.max_gap_s ?? 25) < Number(patch.min_gap_s ?? 8)) patch.max_gap_s = patch.min_gap_s;
      }
      const { error } = await service.from("waouh_wa_governor_config").update(patch).eq("id", true);
      if (error) return json({ error: "governor_update_failed" }, 500);
      const { data } = await service.rpc("waouh_wa_governor_status");
      return json(data);
    }

    if (action === "central-status" || action === "central-connect") {
      const path = `/api/sessions/${CENTRAL_WAHA_SESSION}`;
      const current = await fetchWaha(base, path, {}, headers);
      if (!current.ok) return json({ error: "central_session_unavailable" }, 503);
      const data = await readWaha(current);
      const summary = centralSessionSummary(data);
      if (action === "central-status") return json({...summary, provider_operational: summary.status === "WORKING" && await centralProviderOperational(base, WAHA_API_KEY || "", data)});
      if (!summary.identity_matches || summary.status !== "WORKING") {
        return json({ ...summary, error: "central_session_identity_or_connection_invalid" }, 409);
      }
      const secret = Deno.env.get("WAHA_WEBHOOK_SECRET") || "";
      const nextConfig = centralWebhookConfig(data.config || {}, SUPABASE_URL, secret);
      if (JSON.stringify(nextConfig) !== JSON.stringify(data.config)) {
        const updated = await fetchWaha(base, path, { method: "PUT",
          body: JSON.stringify({ name: CENTRAL_WAHA_SESSION, config: nextConfig }) }, headers);
        if (!updated.ok) return json({ error: "central_webhook_update_failed", provider_status: updated.status }, 502);
      }
      const verified = await fetchWaha(base, path, {}, headers);
      if (!verified.ok) return json({ error: "central_webhook_verification_failed" }, 502);
      const verifiedSummary = centralSessionSummary(await readWaha(verified));
      return json(verifiedSummary, verifiedSummary.webhook_ready ? 200 : 502);
    }

    let webhookConfig = config || (webhook?.url ? { webhooks: [{ url: webhook.url, events: webhook.events ?? ["message"] }] } : { webhooks: [] });
    if (session === CENTRAL_WAHA_SESSION && ["session-create", "session-start"].includes(action)) {
      const previous = await fetchWaha(base, `/api/sessions/${session}`, {}, headers);
      const previousConfig = previous.ok ? (await readWaha(previous)).config || {} : {};
      webhookConfig = centralWebhookConfig(previousConfig, SUPABASE_URL, Deno.env.get("WAHA_WEBHOOK_SECRET") || "");
    }

    let res: Response;
    console.log(`[waha-control] action=${action} session=${session} base=${base}`);
    switch (action) {
      case "session-status":
        res = await fetchWaha(base, `/api/sessions/${session}`, {}, headers);
        break;
      case "session-create": {
        // Idempotent: create if missing, otherwise update webhook/config and return current state.
        res = await fetchWaha(base, `/api/sessions`, {
          method: "POST",
          body: JSON.stringify({ name: session, start: true, config: webhookConfig }),
        }, headers);
        const createBodyText = await res.clone().text().catch(() => "");
        console.log(`[waha-control] session-create status=${res.status}`);
        // Already exists → treat as success (update config + fetch state)
        if (res.status === 409 || res.status === 422 || (res.status === 400 && /exist/i.test(createBodyText))) {
          await fetchWaha(base, `/api/sessions/${session}`, {
            method: "PUT",
            body: JSON.stringify({ config: webhookConfig }),
          }, headers).catch(() => null);
          res = await fetchWaha(base, `/api/sessions/${session}`, {}, headers);
        }
        // Some WAHA versions use PUT /api/sessions/{name}
        if (!res.ok && res.status !== 200) {
          const alt = await fetchWaha(base, `/api/sessions/${session}`, {
            method: "PUT",
            body: JSON.stringify({ name: session, start: true, config: webhookConfig }),
          }, headers);
          const altText = await alt.clone().text().catch(() => "");
          console.log(`[waha-control] session-create PUT fallback status=${alt.status}`);
          if (alt.ok || alt.status === 409 || alt.status === 422) {
            res = await fetchWaha(base, `/api/sessions/${session}`, {}, headers);
          }
        }
        break;
      }
      case "session-start": {
        res = await fetchWaha(base, `/api/sessions/${session}/start`, { method: "POST" }, headers);
        const startText = await res.clone().text().catch(() => "");
        console.log(`[waha-control] session-start status=${res.status}`);
        if (res.status === 409 || res.status === 422 || res.status === 404) {
          // Try to create first
          await fetchWaha(base, `/api/sessions`, {
            method: "POST",
            body: JSON.stringify({ name: session, start: true, config: webhookConfig }),
          }, headers).catch(() => null);
          res = await fetchWaha(base, `/api/sessions/${session}`, {}, headers);
        }
        break;
      }
      case "session-restart":
        res = await fetchWaha(base, `/api/sessions/${encodeURIComponent(session)}/restart`, { method: "POST" }, headers);
        break;
      case "session-stop":
        res = await fetchWaha(base, `/api/sessions/${session}/stop`, { method: "POST" }, headers);
        break;
      case "get-qr":
        {
          const candidates: Array<[string, "GET" | "POST"]> = [
            [`/api/${session}/auth/qr?format=image`, "GET"],
            [`/api/${session}/auth/qr?format=image`, "POST"],
            [`/api/${session}/auth/qr?format=base64`, "GET"],
            [`/api/${session}/auth/qr?format=base64`, "POST"],
            [`/api/${session}/auth/qr`, "GET"],
            [`/api/${session}/auth/qr`, "POST"],
            [`/api/sessions/${session}/auth/qr?format=image`, "GET"],
            [`/api/sessions/${session}/qr?format=base64`, "GET"],
            [`/api/screenshot?session=${session}`, "GET"],
          ];
          let last: any = null;
          for (const [path, method] of candidates) {
            res = await fetchWaha(base, path, { method }, headers);
            console.log(`[waha-control] get-qr try ${method} ${path} → ${res.status}`);
            if (res.ok) return json(await readWaha(res));
            last = await readWaha(res).catch(() => ({ status: res.status }));
          }
          const current = await fetchWaha(base, `/api/sessions/${session}`, {}, headers);
          const currentBody = await readWaha(current).catch(() => null);
          if (current.ok && (currentBody?.status === "WORKING" || currentBody?.engine?.state === "CONNECTED")) {
            return json({ connected: true, status: "WORKING", message: "Session WhatsApp déjà connectée, aucun QR nécessaire." });
          }
          return json({ error: "QR non disponible", details: last, sessionStatus: currentBody }, 404);
        }
      case "set-webhook":
        if (session === CENTRAL_WAHA_SESSION) return json({ error: "use_central_connect" }, 422);
        res = await fetchWaha(base, `/api/sessions/${session}`, {
          method: "PUT",
          body: JSON.stringify({ config: { webhooks: [{ url: webhook.url, events: webhook.events ?? ["message"] }] } }),
        }, headers);
        break;
      default:
        return json({ error: "Unknown action" }, 400);
    }

    const body = await readWaha(res);
    // Never expose webhook authentication values to the browser or logs.
    if (body?.config?.webhooks) body.config.webhooks = body.config.webhooks.map((hook: any) => ({
      events: hook.events, url: String(hook.url || "").split("?")[0],
    }));
    const status = res.status === 409 || res.status === 422 ? 200 : res.status;
    if (!res.ok && status >= 400) {
      console.log(`[waha-control] action=${action} returning status=${status} body=${JSON.stringify(body).slice(0, 400)}`);
    }
    return json(body, status);
  } catch (e: any) {
    console.error("[waha-control] exception", e);
    return json({ error: e.message }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
