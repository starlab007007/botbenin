// WAOUH Price Compare — wrapper edge function autour de compareMarketPrice().
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { compareMarketPrice, shortMarketLine } from "../_shared/waouh-price.ts";

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
    let article: any = null;

    if (article_id) {
      const { data: art } = await sb.from("waouh_articles").select("*").eq("id", article_id).maybeSingle();
      article = art;
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

    const marketComparison = shortMarketLine(result, askedPrice);
    const pct = result.verdict.pct;
    const comparativeAnalysis = result.stats.n === 0
      ? "Aucun comparable suffisamment fiable n’a été trouvé. L’Avatar doit confirmer l’état, la disponibilité et le prix avec la contrepartie."
      : pct == null
        ? `Analyse fondée sur ${result.stats.n} comparable(s), médiane ${result.stats.median ? Math.round(result.stats.median).toLocaleString("fr-FR") + " FCFA" : "indisponible"} et confiance ${result.confidence}.`
        : pct <= -15
          ? `Prix environ ${Math.abs(pct)} % sous la médiane observée. Opportunité attractive, à confirmer par l’état réel et la disponibilité.`
          : pct >= 15
            ? `Prix environ ${pct} % au-dessus de la médiane observée. Une négociation ou une justification par l’état/garantie est recommandée.`
            : `Prix proche du marché observé (${pct > 0 ? "+" : ""}${pct} % vs médiane). Comparaison favorable sous réserve de l’état et de la disponibilité.`;

    const sourceMix = {
      catalogue: result.counts.unified,
      waouh: result.counts.internal,
      radar: result.counts.radar,
      web_public: result.counts.web,
    };
    const recommendation = result.verdict.advice ||
      (result.confidence === "high"
        ? "Données marché suffisamment diversifiées pour guider la décision. Vérifiez l’état et la disponibilité avant l’accord."
        : result.confidence === "medium"
          ? "Signal marché utile mais encore partiel. L’Avatar doit confirmer les points clés avant de proposer ou accepter un prix."
          : "Signal marché limité. Utilisez cette estimation comme indication et demandez des preuves supplémentaires.");

    const details = [
      article?.description ? String(article.description).trim() : "",
      article?.condition ? `État : ${article.condition}` : "",
      article?.category ? `Catégorie : ${article.category}` : "",
      article?.status ? `Disponibilité : ${article.status}` : "",
    ].filter(Boolean).join(" · ") || null;

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
      intelligence: {
        details,
        market_comparison: marketComparison,
        comparative_analysis: comparativeAnalysis,
        recommendation,
        confidence: result.confidence,
        source_mix: sourceMix,
        evidence_count: result.stats.n,
        evidence: result.samples.slice(0, 6).map((s) => ({
          source: s.source,
          price: s.price,
          city: s.city ?? null,
          title: s.title ?? null,
          url: s.url ?? null,
          layer: s.layer,
        })),
        engines: ["Avatar", "NEXUS", "Signal Fabric", "Radar", "Partenaire", "IA"],
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[waouh-price-compare]", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
