// WAOUH Radar — collecte des sources Web/sociales publiques explicitement configurées via Apify
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-waouh-session",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
import { createClient } from "npm:@supabase/supabase-js@2";
import { getWaouhModuleControl } from "../_shared/waouh-admin-control.ts";
import { getRadarApiKey, incrementRadarUsage, markRadarProviderSync } from "../_shared/radar-api-config.ts";
import { normalizeE164 } from "../_shared/waouh-tel/phone.ts";

function sourceDue(source: any, now = Date.now()) {
  if (!source?.last_scan_at) return true;
  const last = Date.parse(String(source.last_scan_at));
  if (!Number.isFinite(last)) return true;
  const minutes = Math.max(5, Number(source.scan_freq_min ?? 60));
  return now - last >= minutes * 60000;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
let APIFY_TOKEN = "";
let APIFY_CFG_ID: string | undefined;

// Apify REST: actorId format is `username~actor-name` in URLs
const DEFAULT_ACTORS = {
  fb_marketplace: "apify~facebook-marketplace-scraper",
  fb_group: "apify~facebook-groups-scraper",
};

async function runActor(actor: string, input: any) {
  const url = `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=120`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!r.ok) throw new Error(`Apify ${actor} ${r.status}: ${await r.text()}`);
  return await r.json();
}

function itemPhotos(item: any): string[] {
  const raw = [
    item?.image, item?.imageUrl, item?.thumbnail, item?.full_picture,
    ...(Array.isArray(item?.images) ? item.images : []),
    ...(Array.isArray(item?.photos) ? item.photos : []),
  ];
  const out = new Set<string>();
  for (const value of raw) {
    const url = typeof value === "string" ? value : value?.url || value?.src;
    if (typeof url === "string" && /^https?:\/\//i.test(url)) out.add(url);
  }
  return [...out].slice(0, 8);
}

async function aiExtract(text: string): Promise<any> {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        { role: "system", content: "Analyse un post Facebook (vente/achat au Bénin) et retourne JSON {intent: SELL|BUY|UNKNOWN, title, price (number FCFA, null si absent), category, city, contact_phone (+22901XXXXXXXX si visible), contact_handle (nom auteur), confidence (0-1)}." },
        { role: "user", content: text.slice(0, 2000) },
      ],
      response_format: { type: "json_object" },
    }),
  });
  const d = await r.json();
  try { return JSON.parse(d.choices?.[0]?.message?.content ?? "{}"); } catch { return {}; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const control = await getWaouhModuleControl(sb, "nexus");
    if (!control.enabled || !control.automation_enabled) {
      return new Response(JSON.stringify({
        ok: true,
        skipped: true,
        reason: !control.enabled ? "nexus_paused" : "nexus_automation_paused",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const keyRes = await getRadarApiKey(sb, "apify", "APIFY_TOKEN");
    if (!keyRes.ok) {
      return new Response(JSON.stringify({ ok: false, skipped: true, reason: keyRes.reason }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    APIFY_TOKEN = keyRes.key!;
    APIFY_CFG_ID = keyRes.configId;
    const providerExtra = keyRes.config?.extra_config || {};
    const actors = {
      fb_marketplace: String((providerExtra as any).fb_marketplace_actor || DEFAULT_ACTORS.fb_marketplace),
      fb_group: String((providerExtra as any).fb_group_actor || DEFAULT_ACTORS.fb_group),
    };

    // Get active sources
    const { data: sources } = await sb.from("waouh_radar_sources")
      .select("*")
      .eq("active", true)
      .in("type", ["fb_marketplace", "fb_group", "apify_actor"]);
    if (!sources || sources.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: "No active FB sources" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const dueSources = sources.filter((source: any) => sourceDue(source));
    let total = 0;
    const perSource: any[] = [];
    for (const src of dueSources) {
      let srcCount = 0;
      let srcError: string | null = null;
      try {
        const sourceConfig =
          src?.config && typeof src.config === "object" && !Array.isArray(src.config)
            ? src.config
            : {};
        let actor: string;
        let input: Record<string, unknown>;
        if (src.type === "fb_marketplace") {
          actor = actors.fb_marketplace;
          input = { search: src.identifier, country: "BJ", maxItems: 30 };
        } else if (src.type === "fb_group") {
          actor = actors.fb_group;
          input = { startUrls: [{ url: src.identifier }], maxPosts: 30 };
        } else {
          actor = String((sourceConfig as any).actor_id || src.identifier || "").trim();
          if (!/^[A-Za-z0-9_.-]+~[A-Za-z0-9_.-]+$/.test(actor)) {
            throw new Error("apify_actor_invalid: utilisez username~actor-name");
          }
          const configuredInput =
            (sourceConfig as any).input &&
            typeof (sourceConfig as any).input === "object" &&
            !Array.isArray((sourceConfig as any).input)
              ? (sourceConfig as any).input
              : {};
          input = { ...configuredInput, maxItems: Number((configuredInput as any).maxItems ?? 30) };
        }

        console.log(`[apify] actor=${actor} src=${src.id} input=${JSON.stringify(input)}`);
        const items = await runActor(actor, input);
        console.log(`[apify] actor=${actor} returned ${Array.isArray(items) ? items.length : 0} items`);
        await incrementRadarUsage(sb, APIFY_CFG_ID, 1);
        for (const it of (Array.isArray(items) ? items : []).slice(0, 30)) {
          const url = it.url || it.postUrl || it.permalink;
          if (!url) continue;
          const { data: exists } = await sb.from("waouh_radar_signals").select("id").eq("raw_url", url).maybeSingle();
          if (exists) continue;

          const text = [it.title, it.text, it.message, it.description, it.price].filter(Boolean).join("\n");
          if (!text) continue;

          const ext = await aiExtract(text);
          if (!ext || (ext.confidence ?? 0) < 0.4) continue;

          const photos = itemPhotos(it);
          const phone = normalizeE164(
            ext.contact_phone ?? it.phone ?? it.sellerPhone ?? it.user?.phone,
          );
          await sb.from("waouh_radar_signals").insert({
            source_id: src.id,
            source_type: src.type,
            raw_text: text,
            raw_url: url,
            raw_payload: it,
            intent: ext.intent || "UNKNOWN",
            product: {
              ...ext,
              title: ext.title || it.title || null,
              photos,
              image_url: photos[0] ?? null,
            },
            category: ext.category,
            price: ext.price,
            city: ext.city,
            contact_phone: phone,
            contact_handle: ext.contact_handle || it.user?.name || it.seller?.name,
            confidence: ext.confidence,
            status: "extracted",
          });
          total++;
          srcCount++;
        }
        await sb.from("waouh_radar_sources").update({ last_scan_at: new Date().toISOString(), last_signal_count: srcCount }).eq("id", src.id);
      } catch (e: any) {
        srcError = e?.message || String(e);
        console.error(`[apify ${src.id}]`, srcError);
        await sb.from("waouh_radar_sources").update({ last_scan_at: new Date().toISOString(), last_signal_count: 0 }).eq("id", src.id);
      }
      perSource.push({ id: src.id, type: src.type, count: srcCount, error: srcError });
    }

    // Trigger processing
    if (total > 0) {
      await fetch(`${SUPABASE_URL}/functions/v1/waouh-radar-process`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 200 }),
      }).catch(console.error);
    }

    await markRadarProviderSync(sb, "apify", total > 0 ? "ok" : "skipped", `${total} signaux · ${sources.length} sources`);
    return new Response(JSON.stringify({ ok: true, sources: sources.length, due: dueSources.length, signals: total, perSource }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[waouh-radar-apify]", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
