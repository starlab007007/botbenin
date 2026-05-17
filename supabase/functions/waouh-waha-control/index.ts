import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
  return fetch(`${base}${path}`, { ...init, headers: { ...headers, ...(init.headers || {}) } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth: require admin
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Unauthorized" }, 401);
    const sb = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });
    const { data: claims } = await sb.auth.getClaims(auth.replace("Bearer ", ""));
    if (!claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const { data: isAdmin, error: adminErr } = await sb.rpc("is_admin", { user_uuid: claims.claims.sub });
    if (adminErr) console.error("is_admin rpc error", adminErr);
    if (!isAdmin) return json({ error: "Forbidden", details: adminErr?.message }, 403);

    if (!WAHA_BASE_URL) return json({ error: "WAHA_BASE_URL secret missing" }, 500);
    const base = WAHA_BASE_URL.replace(/\/$/, "");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(WAHA_API_KEY ? { "X-Api-Key": WAHA_API_KEY } : {}),
    };

    const { action, session = "WaouhApp", webhook, config } = await req.json();

    const webhookConfig = config || (webhook?.url ? { webhooks: [{ url: webhook.url, events: webhook.events ?? ["message"] }] } : { webhooks: [] });

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
        console.log(`[waha-control] session-create status=${res.status} body=${createBodyText.slice(0, 500)}`);
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
          console.log(`[waha-control] session-create PUT fallback status=${alt.status} body=${altText.slice(0, 300)}`);
          if (alt.ok || alt.status === 409 || alt.status === 422) {
            res = await fetchWaha(base, `/api/sessions/${session}`, {}, headers);
          }
        }
        break;
      }
      case "session-start": {
        res = await fetchWaha(base, `/api/sessions/${session}/start`, { method: "POST" }, headers);
        const startText = await res.clone().text().catch(() => "");
        console.log(`[waha-control] session-start status=${res.status} body=${startText.slice(0, 300)}`);
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
        res = await fetchWaha(base, `/api/sessions/${session}`, {
          method: "PUT",
          body: JSON.stringify({ config: { webhooks: [{ url: webhook.url, events: webhook.events ?? ["message"] }] } }),
        }, headers);
        break;
      default:
        return json({ error: "Unknown action" }, 400);
    }

    const body = await readWaha(res);
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
