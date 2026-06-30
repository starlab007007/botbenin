// WAOUH Radar — moissonne Facebook Marketplace + groupes publics via Apify
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
import { createClient } from "npm:@supabase/supabase-js@2";
import { getRadarApiKey, incrementRadarUsage } from "../_shared/radar-api-config.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
let APIFY_TOKEN = "";
let APIFY_CFG_ID: string | undefined;

// Apify REST: actorId format is `username~actor-name` in URLs
const ACTORS = {
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

async function aiExtract(text: string): Promise<any> {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
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
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const keyRes = await getRadarApiKey(sb, "apify", "APIFY_TOKEN");
    if (!keyRes.ok) {
      return new Response(JSON.stringify({ ok: false, skipped: true, reason: keyRes.reason }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    APIFY_TOKEN = keyRes.key!;
    APIFY_CFG_ID = keyRes.configId;

    // Get active sources
    const { data: sources } = await sb.from("waouh_radar_sources").select("*").eq("active", true).in("type", ["fb_marketplace", "fb_group"]);
    if (!sources || sources.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: "No active FB sources" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let total = 0;
    const perSource: any[] = [];
    for (const src of sources) {
      let srcCount = 0;
      let srcError: string | null = null;
      try {
        const actor = ACTORS[src.type as "fb_marketplace" | "fb_group"];
        const input = src.type === "fb_marketplace"
          ? { search: src.identifier, country: "BJ", maxItems: 30 }
          : { startUrls: [{ url: src.identifier }], maxPosts: 30 };

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

    return new Response(JSON.stringify({ ok: true, sources: sources.length, signals: total, perSource }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[waouh-radar-apify]", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
