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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth: require admin
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Unauthorized" }, 401);
    const sb = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });
    const { data: claims } = await sb.auth.getClaims(auth.replace("Bearer ", ""));
    if (!claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await sb.rpc("is_admin", { _user_id: claims.claims.sub });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    if (!WAHA_BASE_URL) return json({ error: "WAHA_BASE_URL secret missing" }, 500);
    const base = WAHA_BASE_URL.replace(/\/$/, "");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(WAHA_API_KEY ? { "X-Api-Key": WAHA_API_KEY } : {}),
    };

    const { action, session = "WaouhApp", webhook, config } = await req.json();

    let res: Response;
    switch (action) {
      case "session-status":
        res = await fetch(`${base}/api/sessions/${session}`, { headers });
        break;
      case "session-create":
        // Create the session if it doesn't exist (idempotent)
        res = await fetch(`${base}/api/sessions`, {
          method: "POST", headers,
          body: JSON.stringify({ name: session, start: true, config: config || { webhooks: [] } }),
        });
        if (res.status === 409 || res.status === 422) {
          // already exists → return current state
          res = await fetch(`${base}/api/sessions/${session}`, { headers });
        }
        break;
      case "session-start":
        res = await fetch(`${base}/api/sessions/${session}/start`, { method: "POST", headers });
        break;
      case "session-stop":
        res = await fetch(`${base}/api/sessions/${session}/stop`, { method: "POST", headers });
        break;
      case "get-qr":
        res = await fetch(`${base}/api/${session}/auth/qr?format=image`, { headers });
        if (res.ok && res.headers.get("content-type")?.includes("image")) {
          const buf = new Uint8Array(await res.arrayBuffer());
          let bin = ""; for (const b of buf) bin += String.fromCharCode(b);
          return json({ image: `data:image/png;base64,${btoa(bin)}` });
        }
        break;
      case "set-webhook":
        res = await fetch(`${base}/api/sessions/${session}`, {
          method: "PUT", headers,
          body: JSON.stringify({ config: { webhooks: [{ url: webhook.url, events: webhook.events ?? ["message"] }] } }),
        });
        break;
      default:
        return json({ error: "Unknown action" }, 400);
    }

    const text = await res.text();
    try { return json(JSON.parse(text), res.status); }
    catch { return json({ raw: text, status: res.status }, res.status); }
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
