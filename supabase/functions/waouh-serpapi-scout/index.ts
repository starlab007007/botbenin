// WAOUH SerpAPI scout - moissonne annonces publiques BJ et insère dans waouh_external_listings
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
let SERPAPI_KEY = "";
let SERPAPI_CFG_ID: string | undefined;

const SITES = "site:jiji.bj OR site:jumia.com.bj OR site:expat.com OR site:tonaton.com OR site:cocolib.com OR site:afribaba.bj";
const CATEGORIES = ["smartphone", "ordinateur", "voiture", "moto", "frigo", "télévision", "meuble", "vêtement"];

async function searchSerp(q: string) {
  const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(q)}&tbs=qdr:w&num=20&gl=bj&hl=fr&api_key=${SERPAPI_KEY}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`SerpAPI ${r.status}`);
  return await r.json();
}

async function aiExtract(text: string): Promise<any> {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        { role: "system", content: "Extrait depuis un snippet d'annonce BJ et retourne JSON {title, price (number FCFA, null si absent), category, condition (new/like_new/good/fair), city, seller_phone (229XXXXXXXX si visible), confidence (0-1)}. Si pas une annonce de vente, confidence=0." },
        { role: "user", content: text.slice(0, 1500) },
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
  const inserted: any[] = [];
  let scanned = 0;

  try {
    const keyRes = await getRadarApiKey(sb, "serpapi", "SERPAPI_KEY");
    if (!keyRes.ok) {
      return new Response(JSON.stringify({ ok: false, skipped: true, reason: keyRes.reason }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    SERPAPI_KEY = keyRes.key!;
    SERPAPI_CFG_ID = keyRes.configId;
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const cats: string[] = body.categories || CATEGORIES;

    for (const cat of cats) {
      const q = `"à vendre" ${cat} Bénin Cotonou ${SITES}`;
      let serp: any;
      try { serp = await searchSerp(q); await incrementRadarUsage(sb, SERPAPI_CFG_ID, 1); } catch (e) { console.error("serp", e); continue; }
      const results = serp.organic_results || [];

      for (const r of results) {
        scanned++;
        if (!r.link) continue;
        const { data: exists } = await sb.from("waouh_external_listings").select("id").eq("source_url", r.link).maybeSingle();
        if (exists) continue;

        const text = `${r.title || ""}\n${r.snippet || ""}`;
        const ext = await aiExtract(text);
        if (!ext || (ext.confidence ?? 0) < 0.4) continue;

        const { data: ins } = await sb.from("waouh_external_listings").insert({
          source: new URL(r.link).hostname,
          source_url: r.link,
          title: ext.title || r.title,
          description: r.snippet,
          category: ext.category || cat,
          price: ext.price || null,
          city: ext.city,
          condition: ext.condition,
          seller_phone: ext.seller_phone,
          image_url: r.thumbnail || null,
          raw: { serp: r, extracted: ext },
        }).select().single();

        if (ins) {
          inserted.push(ins);
          // Also push to radar_signals for matching
          await sb.from("waouh_radar_signals").insert({
            source_type: "serpapi",
            raw_text: text,
            raw_url: r.link,
            raw_payload: r,
            intent: "SELL",
            product: ext,
            category: ext.category || cat,
            price: ext.price,
            city: ext.city,
            contact_phone: ext.seller_phone,
            confidence: ext.confidence,
            status: "extracted",
          });
        }
      }
    }

    // Trigger match/notify
    if (inserted.length > 0) {
      await fetch(`${SUPABASE_URL}/functions/v1/waouh-radar-process`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 100 }),
      }).catch(console.error);
    }

    return new Response(JSON.stringify({ ok: true, scanned, inserted: inserted.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[waouh-serpapi-scout]", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
