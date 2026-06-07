// Admin endpoint for radar: API configs (SerpAPI/Apify) + contact sync + bulk notify.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { normalizeBeninPhone } from "../_shared/waouhContact.ts";

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

    if (action === "contacts_sync") {
      const map = new Map<string, any>();
      const { data: signals } = await admin.from("waouh_radar_signals")
        .select("contact_phone, contact_handle, source_type, intent, category, city, captured_at")
        .not("contact_phone", "is", null).order("captured_at", { ascending: false }).limit(5000);
      for (const s of signals || []) {
        const phone = normalizeBeninPhone(s.contact_phone);
        if (!phone) continue;
        const a = map.get(phone) || { phone, display_name: s.contact_handle, source: s.source_type, first_seen_at: s.captured_at, last_seen_at: s.captured_at, signal_count: 0, categories: new Set(), cities: new Set(), intent_buy_count: 0, intent_sell_count: 0 };
        a.signal_count++;
        if (s.captured_at < a.first_seen_at) a.first_seen_at = s.captured_at;
        if (s.captured_at > a.last_seen_at) a.last_seen_at = s.captured_at;
        if (s.category) a.categories.add(s.category);
        if (s.city) a.cities.add(s.city);
        if (s.intent === "BUY") a.intent_buy_count++;
        if (s.intent === "SELL") a.intent_sell_count++;
        if (!a.display_name && s.contact_handle) a.display_name = s.contact_handle;
        map.set(phone, a);
      }
      const { data: listings } = await admin.from("waouh_external_listings")
        .select("seller_phone, source, category, city, created_at").not("seller_phone", "is", null).limit(5000);
      for (const l of listings || []) {
        const phone = normalizeBeninPhone(l.seller_phone);
        if (!phone) continue;
        const ts = l.created_at || new Date().toISOString();
        const a = map.get(phone) || { phone, display_name: null, source: l.source || "serpapi", first_seen_at: ts, last_seen_at: ts, signal_count: 0, categories: new Set(), cities: new Set(), intent_buy_count: 0, intent_sell_count: 0 };
        a.signal_count++; a.intent_sell_count++;
        if (l.category) a.categories.add(l.category);
        if (l.city) a.cities.add(l.city);
        if (ts < a.first_seen_at) a.first_seen_at = ts;
        if (ts > a.last_seen_at) a.last_seen_at = ts;
        map.set(phone, a);
      }
      let upserted = 0;
      for (const a of map.values()) {
        const { data: ex } = await admin.from("waouh_radar_contacts").select("id, display_name").eq("phone_e164", a.phone).maybeSingle();
        const payload: any = {
          phone_e164: a.phone, display_name: ex?.display_name || a.display_name, source: a.source,
          first_seen_at: a.first_seen_at, last_seen_at: a.last_seen_at, signal_count: a.signal_count,
          categories: Array.from(a.categories), cities: Array.from(a.cities),
          intent_buy_count: a.intent_buy_count, intent_sell_count: a.intent_sell_count,
        };
        if (!ex) { payload.status = "new"; await admin.from("waouh_radar_contacts").insert(payload); }
        else { await admin.from("waouh_radar_contacts").update(payload).eq("id", ex.id); }
        upserted++;
      }
      return new Response(JSON.stringify({ ok: true, upserted }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "contacts_notify") {
      const contactIds: string[] = body.contact_ids || [];
      const message: string = (body.message || "").toString();
      const articleId: string | null = body.article_id || null;
      const mode: string = body.mode || "announcement";
      if (!contactIds.length || !message.trim()) {
        return new Response(JSON.stringify({ error: "contact_ids et message requis" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: contacts } = await admin.from("waouh_radar_contacts")
        .select("id, phone_e164, status").in("id", contactIds);
      let queued = 0, skipped = 0;
      const errors: any[] = [];
      for (const c of contacts || []) {
        if (["opted_out", "blocked"].includes(c.status)) { skipped++; continue; }
        try {
          const dedup = `radar:${mode}:${c.id}:${Date.now()}`;
          const { error } = await admin.rpc("waouh_enqueue_outbound_v2" as any, {
            p_to_phone: c.phone_e164, p_template: "radar_broadcast",
            p_payload: { text: message, article_id: articleId, contact_id: c.id, mode },
            p_event_type: `radar_${mode}`, p_dedupe_key: dedup, p_transaction_id: null, p_article_id: articleId,
          });
          if (error) { errors.push({ id: c.id, error: error.message }); continue; }
          await admin.from("waouh_radar_contacts").update({ last_message_at: new Date().toISOString() }).eq("id", c.id);
          queued++;
        } catch (e: any) { errors.push({ id: c.id, error: e.message }); }
      }
      fetch(`${SUPABASE_URL}/functions/v1/waouh-notify-dispatch`, {
        method: "POST", headers: { Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" }, body: JSON.stringify({ limit: 50 }),
      }).catch(() => {});
      return new Response(JSON.stringify({ ok: true, queued, skipped, errors }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "action inconnue" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[waouh-radar-api-config]", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
