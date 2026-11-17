import {moduleRequestGate} from '../_shared/waouh-module-request.ts';
// WAOUH Radar — moissonne Facebook Marketplace + groupes publics via Apify
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-waouh-session",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireRuntimeOrAdmin } from "../_shared/waouh-runtime-auth.ts";
import { getRadarApiKey, incrementRadarUsage } from "../_shared/radar-api-config.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

// Apify REST: actorId format is `username~actor-name` in URLs
const ACTORS = {
  fb_marketplace: "apify~facebook-marketplace-scraper",
  fb_group: "apify~facebook-groups-scraper",
};
const FACEBOOK_HOSTS = new Set(["facebook.com", "www.facebook.com", "web.facebook.com", "m.facebook.com"]);

async function facebookGroupUrl(identifier: string): Promise<string | null> {
  let url: URL;
  try {
    url = new URL(identifier.trim());
  } catch {
    return null;
  }
  for (let redirects = 0; redirects < 4; redirects++) {
    if (!FACEBOOK_HOSTS.has(url.hostname) || url.protocol !== "https:" ||
      url.username || url.password || url.port) return null;
    const group = /^\/groups\/([a-z0-9._-]+)(?:\/|$)/i.exec(url.pathname)?.[1];
    if (group) return `https://www.facebook.com/groups/${group}/`;
    if (!url.pathname.startsWith("/share/")) return null;

    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(4_000),
    }).catch(() => null);
    if (!response) return null;
    const location = response.headers.get("location");
    await response.body?.cancel();
    if (response.status < 300 || response.status >= 400 || !location) return null;
    try {
      url = new URL(location, url);
    } catch {
      return null;
    }
  }
  return null;
}

async function apifyAuthStatus(token: string): Promise<number> {
  const response = await fetch("https://api.apify.com/v2/users/me", {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(8_000),
  });
  await response.body?.cancel();
  return response.status;
}

async function runActor(actor: string, input: any, token: string) {
  const url = `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?timeout=120`;
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!r.ok) throw new Error(`Apify ${actor} ${r.status}: ${await r.text()}`);
  return await r.json();
}

async function setApifyDiscoveryHealth(
  sb: any,
  degraded: boolean,
  reason: string | null,
): Promise<void> {
  const keys = ["apify", "facebook_public"];
  const { data: rows } = await sb
    .from("waouh_discovery_sources")
    .select("source_key,metadata")
    .in("source_key", keys);

  const now = new Date().toISOString();
  for (const row of rows || []) {
    const metadata = {
      ...(row.metadata || {}),
      health: degraded ? "degraded" : "ok",
      health_reason: reason,
      health_checked_at: now,
      provider_dependency: "apify",
    };
    await sb.from("waouh_discovery_sources").update({
      operational_state: degraded ? "requires_config" : "live",
      metadata,
      updated_at: now,
    }).eq("source_key", row.source_key);
  }
}

async function aiExtract(text: string): Promise<any> {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: (Deno.env.get("GEMINI_CHAT_MODEL") || "google/gemini-3.5-flash-lite"),
      messages: [
        { role: "system", content: "Analyse un post Facebook (vente/achat au Bénin) et retourne JSON {intent: SELL|BUY|UNKNOWN, title, price (number FCFA, null si absent), category, city, contact_phone (229XXXXXXXX si visible), contact_handle (nom auteur), confidence (0-1)}." },
        { role: "user", content: text.slice(0, 2000) },
      ],
      response_format: { type: "json_object" },
    }),
  });
  const d = await r.json();
  try { return JSON.parse(d.choices?.[0]?.message?.content ?? "{}"); } catch { return {}; }
}

Deno.serve(async (req) => {
  const __moduleGate=await moduleRequestGate(req,['nexus'],true);if(__moduleGate)return __moduleGate;

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
  const guard = await requireRuntimeOrAdmin(req, sb);
  if (!guard.ok) return guard.response;

  try {
    const keyRes = await getRadarApiKey(sb, "apify", "APIFY_TOKEN");
    if (!keyRes.ok) {
      await setApifyDiscoveryHealth(sb, true, keyRes.reason || "apify_unavailable");
      return new Response(JSON.stringify({ ok: false, skipped: true, reason: keyRes.reason }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let apifyToken = keyRes.key!.trim();
    let authStatus = await apifyAuthStatus(apifyToken);
    const runtimeToken = Deno.env.get("APIFY_TOKEN")?.trim();
    if (authStatus === 401 && runtimeToken && runtimeToken !== apifyToken) {
      apifyToken = runtimeToken;
      authStatus = await apifyAuthStatus(apifyToken);
    }
    if (authStatus !== 200) {
      const reason = authStatus === 401 || authStatus === 403
        ? "apify_authentication_required"
        : `apify_account_http_${authStatus}`;
      await setApifyDiscoveryHealth(sb, true, reason);
      return new Response(JSON.stringify({ ok: false, skipped: true, reason }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const target = typeof body?.source_id === "string" ? body.source_id : null;
    if (target && !/^[0-9a-f-]{36}$/i.test(target)) {
      return new Response(JSON.stringify({ ok: false, reason: "invalid_source_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const activeSources = sb.from("waouh_radar_sources").select("*").eq("active", true)
      .in("type", ["fb_marketplace", "fb_group"]);
    const { data: sources, error: sourceError } = await (target ? activeSources.eq("id", target) : activeSources);
    if (sourceError) throw new Error("apify_sources_unavailable");
    if (!sources || sources.length === 0) {
      return new Response(JSON.stringify({ ok: !target, reason: "no_active_facebook_source" }),
        { status: target ? 404 : 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const groupUrls = new Map(await Promise.all(sources.filter((src) => src.type === "fb_group")
      .map(async (src) => [src.id, await facebookGroupUrl(src.identifier)] as const)));
    let total = 0;
    let providerBlocked = false;
    const perSource: any[] = [];
    for (const src of sources) {
      let srcCount = 0;
      let srcError: string | null = null;
      try {
        const actor = ACTORS[src.type as "fb_marketplace" | "fb_group"];
        const url = groupUrls.get(src.id);
        if (src.type === "fb_group" && !url) {
          perSource.push({ id: src.id, type: src.type, count: 0, error: "public_facebook_group_url_required" });
          continue;
        }
        const input = src.type === "fb_marketplace"
          ? { search: src.identifier, country: "BJ", maxItems: 30 }
          : { startUrls: [{ url }], resultsLimit: 8 };

        console.log(`[apify] actor=${actor} src=${src.id} input=${JSON.stringify(input)}`);
        const items = await runActor(actor, input, apifyToken);
        console.log(`[apify] actor=${actor} returned ${Array.isArray(items) ? items.length : 0} items`);
        await incrementRadarUsage(sb, keyRes.configId, 1);
        for (const it of (Array.isArray(items) ? items : []).slice(0, 30)) {
          const url = it.url || it.postUrl || it.permalink;
          if (!url) continue;
          const { data: exists } = await sb.from("waouh_radar_signals").select("id").eq("raw_url", url).maybeSingle();
          if (exists) continue;

          const text = [it.title, it.text, it.message, it.description, it.price].filter(Boolean).join("\n");
          if (!text) continue;

          const ext = await aiExtract(text);
          if (!ext || (ext.confidence ?? 0) < 0.4) continue;

          await sb.from("waouh_radar_signals").insert({
            source_id: src.id,
            source_type: src.type,
            raw_text: text,
            raw_url: url,
            raw_payload: it,
            intent: ext.intent || "UNKNOWN",
            product: ext,
            category: ext.category,
            price: ext.price,
            city: ext.city,
            contact_phone: ext.contact_phone,
            contact_handle: ext.contact_handle || it.user?.name,
            confidence: ext.confidence,
            status: "extracted",
          });
          total++;
          srcCount++;
        }
        await sb.from("waouh_radar_sources").update({ last_scan_at: new Date().toISOString(), last_signal_count: srcCount }).eq("id", src.id);
      } catch (e: any) {
        srcError = e?.message || String(e);
        const quotaBlocked = /monthly usage hard limit exceeded|platform-feature-disabled|usage hard limit/i.test(srcError ?? "");
        if (quotaBlocked) providerBlocked = true;
        console.error(`[apify ${src.id}]`, srcError);
        await sb.from("waouh_radar_sources").update({ last_scan_at: new Date().toISOString(), last_signal_count: 0 }).eq("id", src.id);
      }
      perSource.push({ id: src.id, type: src.type, count: srcCount, error: srcError });
      // One account-level quota error applies to every actor/source. Do not
      // hammer Apify repeatedly during the same run.
      if (providerBlocked) break;
    }

    const allSourcesFailed = perSource.length > 0 && perSource.every((row) => !!row.error);
    const degraded = providerBlocked || allSourcesFailed;
    await setApifyDiscoveryHealth(
      sb,
      degraded,
      providerBlocked ? "apify_quota_exhausted" : (allSourcesFailed ? "apify_source_errors" : null),
    );

    // Trigger processing
    if (total > 0) {
      await fetch(`${SUPABASE_URL}/functions/v1/waouh-radar-process`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 200 }),
      }).catch(console.error);
    }

    return new Response(JSON.stringify({ ok: !degraded, degraded, reason: providerBlocked ? "apify_quota_exhausted" : allSourcesFailed ? "apify_source_errors" : null, sources: sources.length, signals: total, perSource }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[waouh-radar-apify]", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
