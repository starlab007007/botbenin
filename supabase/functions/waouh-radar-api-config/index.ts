// Admin endpoint for NEXUS/Radar source connectors + contact sync.
// Secrets are write-only from the browser: list never returns api_key.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-waouh-session",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
import { createClient } from "npm:@supabase/supabase-js@2";
import { normalizeBeninPhone } from "../_shared/waouhContact.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const PROVIDERS: Record<string, { keyRequired: boolean; label: string }> = {
  serpapi: { keyRequired: true, label: "SerpAPI / Web public" },
  apify: { keyRequired: true, label: "Apify / Web social public" },
  firecrawl: { keyRequired: true, label: "Firecrawl / Sites Web" },
  google_places: { keyRequired: true, label: "Google Places / Maps" },
  facebook_business: { keyRequired: true, label: "Facebook Business / Pages" },
  instagram_business: { keyRequired: true, label: "Instagram Business" },
  telegram_public: { keyRequired: true, label: "Telegram public / Bot" },
  tiktok_connected: { keyRequired: true, label: "TikTok connecté" },
  whatsapp_groups: { keyRequired: false, label: "WhatsApp groupes autorisés" },
  sms_rcs: { keyRequired: false, label: "SMS / RCS WAOUH" },
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
function jsonError(message: string, status: number) {
  return json({ ok: false, error: message }, status);
}
function cleanArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "").trim()).filter(Boolean).slice(0, 100);
}
function safeExtra(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

async function assertAdmin(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth) throw jsonError("Authentification requise (token manquant)", 401);
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) throw jsonError("Session invalide — reconnectez-vous", 401);
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const [adminRole, superAdminRole] = await Promise.all([
    admin.rpc("has_role", { _user_id: user.id, _role_name: "admin" }),
    admin.rpc("has_role", { _user_id: user.id, _role_name: "super_admin" }),
  ]);
  if (adminRole.error && superAdminRole.error) {
    throw jsonError("Vérification admin impossible", 500);
  }
  if (!adminRole.data && !superAdminRole.data) throw jsonError("Accès admin requis pour cette action", 403);
  return { admin, userId: user.id };
}

async function nativeProviderState(admin: any, provider: string) {
  if (provider === "whatsapp_groups") {
    const base = String(Deno.env.get("WAHA_BASE_URL") || "").replace(/\/$/, "");
    const key = String(Deno.env.get("WAHA_API_KEY_PLAIN") || Deno.env.get("WAHA_API_KEY") || "").trim();
    const { count } = await admin.from("waouh_radar_sources")
      .select("id", { count: "exact", head: true })
      .eq("type", "wa_group").eq("active", true);
    return {
      configured: !!base,
      runtime: { base_url_ready: !!base, credential_ready: !!key, active_group_count: count ?? 0 },
    };
  }
  if (provider === "sms_rcs") {
    const { data: settings } = await admin.from("waouh_tel_settings").select("*").eq("key", "default").maybeSingle();
    const { data: runtime } = await admin.rpc("waouh_tel_runtime_readiness").catch(() => ({ data: null }));
    return {
      configured: settings?.enabled === true && runtime?.runtime_ready === true,
      runtime: { settings: settings ?? null, readiness: runtime ?? null },
    };
  }
  return { configured: false, runtime: null };
}

async function testProvider(
  admin: any,
  provider: string,
  apiKey: string,
  extraConfig: Record<string, unknown>,
) {
  const t0 = Date.now();
  try {
    if (provider === "serpapi") {
      const r = await fetch(`https://serpapi.com/account?api_key=${encodeURIComponent(apiKey)}`);
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(`HTTP ${r.status} ${JSON.stringify(data).slice(0, 200)}`);
      return { ok: true, message: `Plan ${data.plan_name || "?"} · ${data.searches_left ?? "?"} requêtes restantes`, latency_ms: Date.now() - t0 };
    }
    if (provider === "apify") {
      const r = await fetch(`https://api.apify.com/v2/users/me?token=${encodeURIComponent(apiKey)}`);
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(`HTTP ${r.status} ${JSON.stringify(data).slice(0, 200)}`);
      return { ok: true, message: `Compte ${data?.data?.username || data?.data?.id || "Apify"}`, latency_ms: Date.now() - t0 };
    }
    if (provider === "firecrawl") {
      const r = await fetch("https://api.firecrawl.dev/v2/scrape", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          url: "https://example.com",
          formats: ["markdown"],
          onlyMainContent: true,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || data?.success === false) throw new Error(data?.error || `HTTP ${r.status}`);
      return { ok: true, message: "Firecrawl opérationnel", latency_ms: Date.now() - t0 };
    }
    if (provider === "google_places") {
      const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "places.id,places.displayName",
        },
        body: JSON.stringify({ textQuery: "commerce Cotonou Bénin", languageCode: "fr", regionCode: "BJ", pageSize: 1 }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(`HTTP ${r.status} ${JSON.stringify(data).slice(0, 240)}`);
      return { ok: true, message: `Google Places opérationnel · ${Array.isArray(data?.places) ? data.places.length : 0} résultat test`, latency_ms: Date.now() - t0 };
    }
    if (provider === "facebook_business") {
      const pageIds = cleanArray(extraConfig.page_ids);
      const target = pageIds[0] || "me";
      const r = await fetch(`https://graph.facebook.com/${encodeURIComponent(target)}?fields=id,name&access_token=${encodeURIComponent(apiKey)}`);
      const data = await r.json().catch(() => ({}));
      if (!r.ok || data?.error) throw new Error(data?.error?.message || `HTTP ${r.status}`);
      return { ok: true, message: `Facebook connecté · ${data.name || data.id || target}`, latency_ms: Date.now() - t0 };
    }
    if (provider === "instagram_business") {
      const ids = cleanArray(extraConfig.account_ids);
      const target = ids[0] || "me";
      const fields = target === "me" ? "id,name" : "id,username,name";
      const r = await fetch(`https://graph.facebook.com/${encodeURIComponent(target)}?fields=${fields}&access_token=${encodeURIComponent(apiKey)}`);
      const data = await r.json().catch(() => ({}));
      if (!r.ok || data?.error) throw new Error(data?.error?.message || `HTTP ${r.status}`);
      return { ok: true, message: `Instagram Business connecté · ${data.username || data.name || data.id || target}`, latency_ms: Date.now() - t0 };
    }
    if (provider === "telegram_public") {
      const r = await fetch(`https://api.telegram.org/bot${apiKey}/getMe`);
      const data = await r.json().catch(() => ({}));
      if (!r.ok || data?.ok !== true) throw new Error(data?.description || `HTTP ${r.status}`);
      return { ok: true, message: `Bot @${data?.result?.username || data?.result?.id} connecté`, latency_ms: Date.now() - t0 };
    }
    if (provider === "tiktok_connected") {
      const r = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || data?.error?.code) throw new Error(data?.error?.message || data?.error?.code || `HTTP ${r.status}`);
      return { ok: true, message: `TikTok connecté · ${data?.data?.user?.display_name || data?.data?.user?.open_id || "compte autorisé"}`, latency_ms: Date.now() - t0 };
    }
    if (provider === "whatsapp_groups" || provider === "sms_rcs") {
      const state = await nativeProviderState(admin, provider);
      return {
        ok: state.configured,
        message: state.configured ? `${PROVIDERS[provider].label} prêt` : `${PROVIDERS[provider].label} à configurer`,
        latency_ms: Date.now() - t0,
        runtime: state.runtime,
      };
    }
    return { ok: false, message: "Provider inconnu", latency_ms: Date.now() - t0 };
  } catch (e: any) {
    return { ok: false, message: e?.message || String(e), latency_ms: Date.now() - t0 };
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
      const configs = await Promise.all((data || []).map(async (row: any) => {
        const { api_key, ...safe } = row;
        const native = ["whatsapp_groups","sms_rcs"].includes(row.provider)
          ? await nativeProviderState(admin, row.provider)
          : null;
        return {
          ...safe,
          has_key: !!api_key,
          configured: native ? native.configured : !!api_key,
          runtime: native?.runtime ?? null,
        };
      }));
      return json({ ok: true, configs, providers: Object.keys(PROVIDERS) });
    }

    if (action === "upsert") {
      const provider = String(body.provider || "");
      if (!PROVIDERS[provider]) return jsonError("provider invalide", 400);
      const apiKey = typeof body.api_key === "string" ? body.api_key.trim() : undefined;
      const extraConfig = safeExtra(body.extra_config);
      const patch: any = {
        provider,
        source_key: body.source_key || provider.replace("_groups", ""),
        label: body.label || PROVIDERS[provider].label,
        updated_by: userId,
      };
      if (apiKey) patch.api_key = apiKey;
      if (body.active !== undefined) patch.active = !!body.active;
      if (body.daily_quota !== undefined) patch.daily_quota = Math.max(0, parseInt(body.daily_quota, 10) || 0);
      if (body.extra_config !== undefined) patch.extra_config = extraConfig;
      if (body.base_url !== undefined) patch.base_url = String(body.base_url || "").trim() || null;
      const { data, error } = await admin.from("waouh_radar_api_configs")
        .upsert(patch, { onConflict: "provider" }).select().single();
      if (error) throw error;
      const { api_key, ...safe } = data;
      return json({ ok: true, config: { ...safe, has_key: !!api_key } });
    }

    if (action === "toggle") {
      const provider = String(body.provider || "");
      if (!PROVIDERS[provider]) return jsonError("provider invalide", 400);
      if (body.active === true && PROVIDERS[provider].keyRequired) {
        const { data: cfg } = await admin.from("waouh_radar_api_configs")
          .select("api_key").eq("provider", provider).maybeSingle();
        if (!cfg?.api_key) return jsonError("Enregistrez d’abord le secret/token du connecteur", 400);
      }
      const { data, error } = await admin.from("waouh_radar_api_configs")
        .update({ active: !!body.active, updated_by: userId })
        .eq("provider", provider).select().single();
      if (error) throw error;
      const { api_key, ...safe } = data;
      return json({ ok: true, config: { ...safe, has_key: !!api_key } });
    }

    if (action === "test") {
      const provider = String(body.provider || "");
      if (!PROVIDERS[provider]) return jsonError("provider invalide", 400);
      const { data: cfg } = await admin.from("waouh_radar_api_configs")
        .select("*").eq("provider", provider).maybeSingle();
      const key = String(body.api_key || cfg?.api_key || "").trim();
      if (PROVIDERS[provider].keyRequired && !key) {
        return json({ ok: false, message: "Aucun secret/token configuré" });
      }
      const extra = { ...safeExtra(cfg?.extra_config), ...safeExtra(body.extra_config) };
      const res = await testProvider(admin, provider, key, extra);
      await admin.from("waouh_radar_api_configs").update({
        last_test_at: new Date().toISOString(),
        last_test_status: res.ok ? "ok" : "ko",
        last_test_message: res.message,
        updated_by: userId,
      }).eq("provider", provider);
      return json(res);
    }

    if (action === "reset_quota") {
      const provider = String(body.provider || "");
      await admin.from("waouh_radar_api_configs").update({
        usage_today: 0,
        usage_reset_at: new Date().toISOString(),
        updated_by: userId,
      }).eq("provider", provider);
      return json({ ok: true });
    }

    if (action === "contacts_sync") {
      const map = new Map<string, any>();
      const { data: signals } = await admin.from("waouh_radar_signals")
        .select("contact_phone,contact_handle,source_type,intent,category,city,captured_at")
        .not("contact_phone", "is", null).order("captured_at", { ascending: false }).limit(5000);
      for (const s of signals || []) {
        const phone = normalizeBeninPhone(s.contact_phone);
        if (!phone) continue;
        const a = map.get(phone) || {
          phone, display_name: s.contact_handle, source: s.source_type,
          first_seen_at: s.captured_at, last_seen_at: s.captured_at, signal_count: 0,
          categories: new Set(), cities: new Set(), intent_buy_count: 0, intent_sell_count: 0,
        };
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
        .select("seller_phone,source,category,city,created_at").not("seller_phone", "is", null).limit(5000);
      for (const l of listings || []) {
        const phone = normalizeBeninPhone(l.seller_phone);
        if (!phone) continue;
        const ts = l.created_at || new Date().toISOString();
        const a = map.get(phone) || {
          phone, display_name: null, source: l.source || "serpapi",
          first_seen_at: ts, last_seen_at: ts, signal_count: 0,
          categories: new Set(), cities: new Set(), intent_buy_count: 0, intent_sell_count: 0,
        };
        a.signal_count++; a.intent_sell_count++;
        if (l.category) a.categories.add(l.category);
        if (l.city) a.cities.add(l.city);
        if (ts < a.first_seen_at) a.first_seen_at = ts;
        if (ts > a.last_seen_at) a.last_seen_at = ts;
        map.set(phone, a);
      }
      let upserted = 0;
      for (const a of map.values()) {
        const { data: ex } = await admin.from("waouh_radar_contacts")
          .select("id,display_name").eq("phone_e164", a.phone).maybeSingle();
        const payload: any = {
          phone_e164: a.phone, display_name: ex?.display_name || a.display_name, source: a.source,
          first_seen_at: a.first_seen_at, last_seen_at: a.last_seen_at, signal_count: a.signal_count,
          categories: Array.from(a.categories), cities: Array.from(a.cities),
          intent_buy_count: a.intent_buy_count, intent_sell_count: a.intent_sell_count,
        };
        if (!ex) {
          payload.status = "new";
          await admin.from("waouh_radar_contacts").insert(payload);
        } else {
          await admin.from("waouh_radar_contacts").update(payload).eq("id", ex.id);
        }
        upserted++;
      }
      return json({ ok: true, upserted });
    }

    if (action === "contacts_notify") {
      const contactIds: string[] = Array.isArray(body.contact_ids) ? body.contact_ids : [];
      const message = String(body.message || "").trim();
      const articleId: string | null = body.article_id || null;
      const mode = String(body.mode || "announcement");
      if (!contactIds.length || !message) return jsonError("contact_ids et message requis", 400);
      const { data: contacts } = await admin.from("waouh_radar_contacts")
        .select("id,phone_e164,status").in("id", contactIds);
      let queued = 0, skipped = 0;
      const errors: any[] = [];
      for (const c of contacts || []) {
        if (["opted_out","blocked"].includes(c.status)) { skipped++; continue; }
        try {
          const { error } = await admin.rpc("waouh_enqueue_outbound_v2" as any, {
            p_to_phone: c.phone_e164,
            p_template: "radar_broadcast",
            p_payload: { text: message, article_id: articleId, contact_id: c.id, mode },
            p_event_type: `radar_${mode}`,
            p_dedupe_key: `radar:${mode}:${c.id}:${Date.now()}`,
            p_transaction_id: null,
            p_article_id: articleId,
          });
          if (error) { errors.push({ id: c.id, error: error.message }); continue; }
          await admin.from("waouh_radar_contacts").update({ last_message_at: new Date().toISOString() }).eq("id", c.id);
          queued++;
        } catch (e: any) {
          errors.push({ id: c.id, error: e?.message || String(e) });
        }
      }
      fetch(`${SUPABASE_URL}/functions/v1/waouh-notify-dispatch`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 50 }),
      }).catch(() => {});
      return json({ ok: true, queued, skipped, errors });
    }

    return jsonError("action inconnue", 400);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[waouh-radar-api-config]", e);
    return jsonError((e as Error).message, 500);
  }
});
