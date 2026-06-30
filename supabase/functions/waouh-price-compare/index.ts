// WAOUH Price Compare — wrapper edge function autour de compareMarketPrice().
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { compareMarketPrice } from "../_shared/waouh-price.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { article_id, query, offered_price, city, category, brand, model, fast_mode } = await req.json();
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    let title = query || "produit";
    let q = query || "";
    let qCity = city ?? null;
    let qCategory = category ?? null;
    let askedPrice = Number(offered_price) || null;

    if (article_id) {
      const { data: art } = await sb.from("waouh_articles").select("*").eq("id", article_id).maybeSingle();
      if (art) {
        title = `${art.title}${art.brand ? " " + art.brand : ""}${art.model ? " " + art.model : ""}`.trim();
        q = `${art.title} ${art.brand || ""} ${art.model || ""}`.trim();
        qCity = qCity ?? art.city;
        qCategory = qCategory ?? art.category;
        if (!askedPrice) askedPrice = Number(art.price) || null;
      }
    }

    const result = await compareMarketPrice(sb, {
      article_id: article_id ?? null,
      query: q,
      city: qCity,
      category: qCategory,
      brand: brand ?? null,
      model: model ?? null,
      askedPrice,
      fastMode: !!fast_mode,
    });

    // Met à jour l'article avec la fourchette serrée si possible
    if (article_id && result.stats.p25 && result.stats.p75) {
      sb.from("waouh_articles").update({
        market_price_min: result.stats.p25,
        market_price_max: result.stats.p75,
      }).eq("id", article_id).then(() => {}, () => {});
    }

    return new Response(JSON.stringify({
      success: true,
      title,
      ...result,
      reply: result.replyBlock,
      min: result.stats.p25 ?? result.stats.min,
      max: result.stats.p75 ?? result.stats.max,
      median: result.stats.median,
      average: result.stats.average,
      sources: result.samples.map((s) => ({ source: s.source, price: s.price, url: s.url, title: s.title })),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[waouh-price-compare]", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
