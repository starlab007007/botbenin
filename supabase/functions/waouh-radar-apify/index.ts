// WAOUH Radar — moissonne Facebook Marketplace + groupes publics via Apify
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APIFY_TOKEN = Deno.env.get("APIFY_TOKEN")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

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
    // Get active sources
    const { data: sources } = await sb.from("waouh_radar_sources").select("*").eq("active", true).in("type", ["fb_marketplace", "fb_group"]);
    if (!sources || sources.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: "No active FB sources" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let total = 0;
    for (const src of sources) {
      try {
        const actor = ACTORS[src.type as "fb_marketplace" | "fb_group"];
        const input = src.type === "fb_marketplace"
          ? { search: src.identifier, country: "BJ", maxItems: 30 }
          : { startUrls: [{ url: src.identifier }], maxPosts: 30 };

        const items = await runActor(actor, input);
        for (const it of items.slice(0, 30)) {
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
        }
        await sb.from("waouh_radar_sources").update({ last_scan_at: new Date().toISOString(), last_signal_count: total }).eq("id", src.id);
      } catch (e) {
        console.error(`[apify ${src.id}]`, e);
      }
    }

    // Trigger processing
    if (total > 0) {
      await fetch(`${SUPABASE_URL}/functions/v1/waouh-radar-process`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 200 }),
      }).catch(console.error);
    }

    return new Response(JSON.stringify({ ok: true, sources: sources.length, signals: total }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[waouh-radar-apify]", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
