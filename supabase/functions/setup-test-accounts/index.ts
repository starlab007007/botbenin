import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const text = (v: unknown) => String(v ?? "").trim();
const num = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};
const safeToken = (v: string) => v.replace(/[%_,()]/g, " ").replace(/\s+/g, " ").trim();

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function percentile(values: number[], p: number) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.round((sorted.length - 1) * p)));
  return sorted[idx];
}

function formatXof(value: number | null) {
  if (value == null) return "non disponible";
  return new Intl.NumberFormat("fr-FR").format(Math.round(value)) + " FCFA";
}

function sourceLabel(source: string) {
  const s = source.toLowerCase();
  if (s.includes("partner")) return "Partenaire";
  if (s.includes("radar")) return "Radar";
  if (s.includes("catalog")) return "Catalogue WAOUH";
  if (s.includes("transaction")) return "Ventes conclues";
  if (s.includes("article")) return "WAOUH";
  return source || "WAOUH";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const articleId = text(body.article_id);
    if (!articleId) return json({ ok: false, error: "article_id_required" }, 400);

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: article, error: articleError } = await sb
      .from("waouh_articles")
      .select("id,title,description,category,brand,model,condition,price,currency,city,status,market_price_min,market_price_max,views_count,interests_count,origin,source_channel,partner_id,ai_attributes,ai_quality_score,last_verified_at,created_at")
      .eq("id", articleId)
      .maybeSingle();

    if (articleError) return json({ ok: false, error: articleError.message }, 500);
    if (!article) return json({ ok: false, error: "article_not_found" }, 404);

    const title = text(article.title);
    const category = text(article.category);
    const city = text(article.city);
    const querySeed = safeToken([article.brand, article.model, title].map(text).filter(Boolean).join(" "));
    const keyword = safeToken(querySeed.split(" ").filter((w) => w.length >= 3).slice(0, 4).join(" "));
    const token = keyword || safeToken(category) || safeToken(title);

    let articleQuery = sb
      .from("waouh_articles")
      .select("id,title,category,price,currency,city,status,origin,partner_id,created_at")
      .neq("id", articleId)
      .neq("status", "sold")
      .limit(60);
    if (category) articleQuery = articleQuery.ilike("category", category);
    else if (token) articleQuery = articleQuery.ilike("title", `%${token}%`);

    let catalogQuery = sb
      .from("waouh_unified_catalog")
      .select("id,source,source_ref_id,titre,categorie,prix_min,prix_max,devise,ville,qualite_score,verified,last_seen_at,promoted_article_id")
      .eq("is_active", true)
      .limit(80);
    if (category) catalogQuery = catalogQuery.ilike("categorie", category);
    else if (token) catalogQuery = catalogQuery.ilike("titre", `%${token}%`);

    let partnerQuery = sb
      .from("waouh_partner_products")
      .select("id,partner_id,nom,categorie,prix_min,prix_max,devise,disponible,stock_estime,derniere_maj")
      .eq("disponible", true)
      .limit(60);
    if (category) partnerQuery = partnerQuery.ilike("categorie", category);
    else if (token) partnerQuery = partnerQuery.ilike("nom", `%${token}%`);

    let radarQuery = sb
      .from("waouh_radar_signals")
      .select("id,source_type,raw_url,intent,category,price,city,confidence,status,captured_at,promoted_article_id")
      .neq("status", "discarded")
      .limit(60);
    if (category) radarQuery = radarQuery.ilike("category", category);
    else if (token) radarQuery = radarQuery.ilike("raw_text", `%${token}%`);

    const [articleRes, catalogRes, partnerRes, radarRes, interestRes, negotiationRes] =
      await Promise.all([
        articleQuery,
        catalogQuery,
        partnerQuery,
        radarQuery,
        sb.from("waouh_interests").select("id", { count: "exact", head: true }).eq("article_id", articleId),
        sb.from("waouh_negotiations").select("id,state,last_offer_price").eq("article_id", articleId).order("updated_at", { ascending: false }).limit(50),
      ]);

    const relatedArticles = articleRes.data ?? [];
    const catalog = catalogRes.data ?? [];
    const partners = partnerRes.data ?? [];
    const radar = radarRes.data ?? [];
    const negotiations = negotiationRes.data ?? [];

    const similarArticleIds = relatedArticles.map((x: any) => x.id).filter(Boolean);
    const partnerProductIds = partners.map((x: any) => x.id).filter(Boolean);

    const [txRes, partnerSalesRes] = await Promise.all([
      similarArticleIds.length
        ? sb.from("waouh_transactions")
            .select("article_id,amount,negotiated_price,status,completed_at")
            .in("article_id", similarArticleIds)
            .eq("status", "completed")
            .limit(100)
        : Promise.resolve({ data: [] } as any),
      partnerProductIds.length
        ? sb.from("waouh_partner_sales")
            .select("product_id,montant_vente,statut,date_vente")
            .in("product_id", partnerProductIds)
            .limit(100)
        : Promise.resolve({ data: [] } as any),
    ]);

    const evidence: Array<Record<string, unknown>> = [];
    const addPrice = (source: string, value: unknown, row: Record<string, unknown>) => {
      const price = num(value);
      if (!price) return;
      evidence.push({ source, price, ...row });
    };

    for (const row of relatedArticles as any[]) {
      addPrice("WAOUH", row.price, { title: row.title, city: row.city, id: row.id });
    }
    for (const row of catalog as any[]) {
      const price = num(row.prix_min) ?? num(row.prix_max);
      addPrice("Catalogue", price, { title: row.titre, city: row.ville, verified: row.verified, id: row.id });
    }
    for (const row of partners as any[]) {
      const price = num(row.prix_min) ?? num(row.prix_max);
      addPrice("Partenaire", price, { title: row.nom, stock: row.stock_estime, id: row.id });
    }
    for (const row of radar as any[]) {
      addPrice("Radar", row.price, { city: row.city, confidence: row.confidence, id: row.id });
    }
    for (const row of (txRes.data ?? []) as any[]) {
      addPrice("Transactions", row.negotiated_price ?? row.amount, { article_id: row.article_id, completed_at: row.completed_at });
    }
    for (const row of (partnerSalesRes.data ?? []) as any[]) {
      addPrice("Ventes partenaire", row.montant_vente, { product_id: row.product_id, date_vente: row.date_vente });
    }

    const prices = evidence.map((e) => Number(e.price)).filter((n) => Number.isFinite(n) && n > 0);
    const p25 = percentile(prices, .25);
    const med = median(prices);
    const p75 = percentile(prices, .75);
    const current = num(article.price);
    const explicitMin = num(article.market_price_min);
    const explicitMax = num(article.market_price_max);
    const marketMin = explicitMin ?? p25;
    const marketMax = explicitMax ?? p75;
    const currentVsMedian = current && med ? ((current - med) / med) * 100 : null;

    const sources = [...new Set(evidence.map((e) => sourceLabel(String(e.source))))];
    const openNegotiations = negotiations.filter((n: any) => ["proposed", "countered"].includes(String(n.state))).length;
    const acceptedNegotiations = negotiations.filter((n: any) => String(n.state) === "accepted").length;
    const interestCount = interestRes.count ?? Number(article.interests_count ?? 0);

    let comparison = "Données de marché insuffisantes pour une comparaison robuste.";
    let recommendation = "Demandez à l’Avatar de poursuivre la veille avant de conclure.";
    let recommendationTone = "watch";

    if (current && med && prices.length >= 3) {
      const delta = Math.round(currentVsMedian ?? 0);
      if (delta <= -8) {
        comparison = `Prix ~${Math.abs(delta)} % sous la médiane observée (${formatXof(med)}).`;
        recommendation = "Prix attractif au regard des références disponibles. Vérifier disponibilité et état avant accord.";
        recommendationTone = "positive";
      } else if (delta >= 12) {
        comparison = `Prix ~${delta} % au-dessus de la médiane observée (${formatXof(med)}).`;
        recommendation = "Prix élevé par rapport au marché observé. Une négociation ou comparaison supplémentaire est recommandée.";
        recommendationTone = "negotiate";
      } else {
        comparison = `Prix proche de la médiane observée (${formatXof(med)}), écart d’environ ${Math.abs(delta)} %.`;
        recommendation = "Prix cohérent avec le marché observé. Comparer état, disponibilité, distance et fiabilité du vendeur.";
        recommendationTone = "neutral";
      }
    }

    const detailsParts = [
      article.condition ? `État: ${article.condition}` : null,
      article.brand ? `Marque: ${article.brand}` : null,
      article.model ? `Modèle: ${article.model}` : null,
      city ? `Ville: ${city}` : null,
      article.description ? text(article.description).slice(0, 180) : null,
    ].filter(Boolean);

    const marketText = prices.length
      ? `${prices.length} référence(s) · ${sources.join(" · ")} · zone observée ${formatXof(marketMin)} à ${formatXof(marketMax)}.`
      : "Aucune référence de prix exploitable trouvée dans les sources WAOUH pour le moment.";

    return json({
      ok: true,
      article_id: articleId,
      generated_at: new Date().toISOString(),
      details: {
        text: detailsParts.join(" · ") || "Informations article disponibles dans la fiche source.",
        quality_score: num(article.ai_quality_score),
        last_verified_at: article.last_verified_at ?? null,
        origin: article.origin ?? article.source_channel ?? "waouh_app",
      },
      market: {
        text: marketText,
        sample_count: prices.length,
        min: marketMin,
        median: med,
        max: marketMax,
        source_mix: sources,
        city,
      },
      comparison: {
        text: comparison,
        current_price: current,
        median_price: med,
        delta_percent: currentVsMedian == null ? null : Math.round(currentVsMedian * 10) / 10,
      },
      recommendation: {
        text: recommendation,
        tone: recommendationTone,
        confidence: Math.min(1, .35 + Math.min(prices.length, 15) * .04 + (sources.length >= 3 ? .15 : 0)),
        rationale: [
          prices.length ? `${prices.length} références de prix` : "peu de références de prix",
          `${interestCount} intérêt(s)`,
          `${openNegotiations} négociation(s) ouverte(s)`,
          sources.length ? `sources: ${sources.join(", ")}` : "sources limitées",
        ],
      },
      activity: {
        interests: interestCount,
        open_negotiations: openNegotiations,
        accepted_negotiations: acceptedNegotiations,
        views: Number(article.views_count ?? 0),
      },
      evidence: evidence
        .sort((a: any, b: any) => Number(b.price ?? 0) - Number(a.price ?? 0))
        .slice(0, 12),
    });
  } catch (error) {
    console.error("[waouh-product-intelligence]", error);
    return json({ ok: false, error: String(error) }, 500);
  }
});
