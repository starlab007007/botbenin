// Admin CRUD + test for SerpAPI / Apify API configs
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

async function assertAdmin(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth) throw new Response("Unauthorized", { status: 401 });
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) throw new Response("Unauthorized", { status: 401 });
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
  if (!isAdmin) throw new Response("Forbidden", { status: 403 });
  return { admin, userId: user.id };
}

async function testProvider(provider: string, apiKey: string) {
  const t0 = Date.now();
  try {
    if (provider === "serpapi") {
      const r = await fetch(`https://serpapi.com/account?api_key=${encodeURIComponent(apiKey)}`);
      const json = await r.json().catch(() => ({}));
      if (!r.ok) return { ok: false, message: `HTTP ${r.status} ${JSON.stringify(json).slice(0, 200)}`, latency_ms: Date.now() - t0 };
      return { ok: true, message: `Plan ${json.plan_name || "?"} · ${json.searches_left ?? "?"} requêtes restantes`, latency_ms: Date.now() - t0 };
    }
    if (provider === "apify") {
      const r = await fetch(`https://api.apify.com/v2/users/me?token=${encodeURIComponent(apiKey)}`);
      const json = await r.json().catch(() => ({}));
      if (!r.ok) return { ok: false, message: `HTTP ${r.status} ${JSON.stringify(json).slice(0, 200)}`, latency_ms: Date.now() - t0 };
      const d = json?.data || {};
      return { ok: true, message: `User ${d.username || d.id || "?"} · plan ${d.plan?.id || "?"}`, latency_ms: Date.now() - t0 };
    }
    return { ok: false, message: "Provider inconnu", latency_ms: Date.now() - t0 };
  } catch (e: any) {
    return { ok: false, message: e.message, latency_ms: Date.now() - t0 };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { admin, userId } = await assertAdmin(req);
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = body.action || "list";

    if (action === "list") {
      const { data, error } = await admin.from("waouh_radar_api_configs").select("*").order("provider");
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, configs: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "upsert") {
      const { provider, api_key, active, daily_quota, extra_config } = body;
      if (!provider || !["serpapi", "apify"].includes(provider)) {
        return new Response(JSON.stringify({ error: "provider invalide" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const patch: any = { updated_by: userId };
      if (api_key !== undefined && api_key !== "") patch.api_key = api_key;
      if (active !== undefined) patch.active = !!active;
      if (daily_quota !== undefined) patch.daily_quota = Math.max(0, parseInt(daily_quota, 10) || 0);
      if (extra_config !== undefined) patch.extra_config = extra_config;
      const { data, error } = await admin.from("waouh_radar_api_configs").update(patch).eq("provider", provider).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, config: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "toggle") {
      const { provider, active } = body;
      const { data, error } = await admin.from("waouh_radar_api_configs").update({ active: !!active, updated_by: userId }).eq("provider", provider).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, config: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "test") {
      const { provider, api_key } = body;
      const { data: cfg } = await admin.from("waouh_radar_api_configs").select("api_key").eq("provider", provider).maybeSingle();
      const key = api_key || cfg?.api_key;
      if (!key) return new Response(JSON.stringify({ ok: false, message: "Aucune clé configurée" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const res = await testProvider(provider, key);
      await admin.from("waouh_radar_api_configs").update({
        last_test_at: new Date().toISOString(),
        last_test_status: res.ok ? "ok" : "ko",
        last_test_message: res.message,
        updated_by: userId,
      }).eq("provider", provider);
      return new Response(JSON.stringify(res), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "reset_quota") {
      const { provider } = body;
      await admin.from("waouh_radar_api_configs").update({ usage_today: 0, usage_reset_at: new Date().toISOString(), updated_by: userId }).eq("provider", provider);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "action inconnue" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[waouh-radar-api-config]", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
