// WAOUH Radar — Scraper générique pour sources type='site' via Firecrawl + Gemini
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-waouh-session",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY") || "";

async function firecrawlScrape(url: string): Promise<{ markdown?: string; links?: string[] }> {
  const r = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url, formats: ["markdown", "links"], onlyMainContent: true }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(`firecrawl ${r.status}: ${JSON.stringify(d).slice(0, 200)}`);
  // Normalise SDK + REST shapes
  return { markdown: d.markdown ?? d.data?.markdown, links: d.links ?? d.data?.links };
}

async function aiExtractListings(markdown: string): Promise<any[]> {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        { role: "system", content: "Analyse une page d'annonces (Bénin). Retourne JSON {items: [{intent: SELL|BUY, title, price (number FCFA, null si absent), category, city, contact_phone (229XXXXXXXX si visible), url, confidence (0-1)}...]}. Maximum 20 items. Ignore tout ce qui n'est pas une annonce de vente/recherche." },
        { role: "user", content: markdown.slice(0, 8000) },
      ],
      response_format: { type: "json_object" },
    }),
  });
  const d = await r.json();
  try {
    const parsed = JSON.parse(d.choices?.[0]?.message?.content ?? "{}");
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch { return []; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!FIRECRAWL_API_KEY) {
    return new Response(JSON.stringify({ ok: false, error: "FIRECRAWL_API_KEY missing" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const { data: sources } = await sb
      .from("waouh_radar_sources")
      .select("*")
      .eq("active", true)
      .eq("type", "site");

    if (!sources?.length) {
      return new Response(JSON.stringify({ ok: true, message: "no active site sources" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let total = 0;
    const perSource: any[] = [];

    for (const src of sources) {
      let srcCount = 0;
      let srcError: string | null = null;
      try {
        console.log(`[site-scraper] scraping ${src.identifier}`);
        const { markdown } = await firecrawlScrape(src.identifier);
        if (!markdown) {
          srcError = "no markdown";
        } else {
          const items = await aiExtractListings(markdown);
          console.log(`[site-scraper] ${src.identifier} extracted=${items.length}`);

          for (const it of items.slice(0, 20)) {
            if (!it || (it.confidence ?? 0) < 0.4) continue;
            const url = it.url || `${src.identifier}#${encodeURIComponent((it.title || "").slice(0, 60))}`;
            // Idempotence via unique index (source_type, raw_url)
            const { error: insErr } = await sb.from("waouh_radar_signals").insert({
              source_id: src.id,
              source_type: "site",
              raw_text: `${it.title || ""}\nPrix: ${it.price ?? "?"}\nVille: ${it.city ?? "?"}`,
              raw_url: url,
              raw_payload: it,
              intent: it.intent || "UNKNOWN",
              product: it,
              category: it.category,
              price: it.price ?? null,
              city: it.city,
              contact_phone: it.contact_phone,
              confidence: it.confidence,
              status: "extracted",
            });
            if (!insErr) { srcCount++; total++; }
          }
        }
        await sb.from("waouh_radar_sources").update({
          last_scan_at: new Date().toISOString(),
          last_signal_count: srcCount,
        }).eq("id", src.id);
      } catch (e: any) {
        srcError = e?.message || String(e);
        console.error(`[site-scraper ${src.id}]`, srcError);
        await sb.from("waouh_radar_sources").update({
          last_scan_at: new Date().toISOString(),
          last_signal_count: 0,
        }).eq("id", src.id);
      }
      perSource.push({ id: src.id, url: src.identifier, count: srcCount, error: srcError });
    }

    if (total > 0) {
      fetch(`${SUPABASE_URL}/functions/v1/waouh-radar-process`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 200 }),
      }).catch(console.error);
    }

    return new Response(JSON.stringify({ ok: true, sources: sources.length, signals: total, perSource }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[waouh-radar-site-scraper]", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
