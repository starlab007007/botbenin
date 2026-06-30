// WAOUH — Analyse marché factorisée (catalogue unifié + interne + radar WA + web).
// Utilisée par waouh-price-compare, waouh-webhook (BUY/SELL), waouh-negotiate-handler.
// Cache 6h dans waouh_cache, snapshot historique dans waouh_price_snapshots.

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

const FX_TO_FCFA: Record<string, number> = {
  XOF: 1, FCFA: 1, CFA: 1,
  EUR: 656, USD: 605, NGN: 0.4, GHS: 50, MAD: 60, GBP: 760,
};

const TARGET_DOMAINS = [
  "jumia.com", "jumia.ci", "jumia.sn", "jumia.com.ng",
  "coinafrique.com",
  "jiji.ci", "jiji.ng", "jiji.com.gh",
  "afrikrea.com", "expat.com", "facebook.com/marketplace",
];

export type PriceSample = {
  price: number;
  title?: string;
  source: string;
  url?: string;
  city?: string;
  layer: "unified" | "internal" | "radar" | "web";
};

export type PriceCompareInput = {
  article_id?: string | null;
  query: string;
  city?: string | null;
  category?: string | null;
  brand?: string | null;
  model?: string | null;
  askedPrice?: number | null;
  fastMode?: boolean; // skip web (Firecrawl) for inline chat list
};

export type PriceCompareResult = {
  stats: {
    n: number; min: number | null; p25: number | null; median: number | null;
    p75: number | null; max: number | null; average: number | null;
  };
  confidence: "high" | "medium" | "low" | "none";
  verdict: { label: string; pct: number | null; advice: string };
  counts: { unified: number; internal: number; radar: number; web: number };
  samples: PriceSample[];
  replyBlock: string; // bloc texte prêt à coller dans une bulle de chat
};

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";

function tokens(q: string, max = 4): string[] {
  return (q || "").toLowerCase().split(/\s+/).filter((t) => t.length > 2).slice(0, max);
}

function percentile(sorted: number[], p: number): number | null {
  if (!sorted.length) return null;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return Math.round(lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo));
}

function aggregate(samples: PriceSample[]) {
  const prices = samples.map((s) => s.price).filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
  return {
    n: prices.length,
    min: prices[0] ?? null,
    p25: percentile(prices, 0.25),
    median: percentile(prices, 0.5),
    p75: percentile(prices, 0.75),
    max: prices[prices.length - 1] ?? null,
    average: prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null,
  };
}

function computeConfidence(c: { unified: number; internal: number; radar: number; web: number }): PriceCompareResult["confidence"] {
  const total = c.unified + c.internal + c.radar + c.web;
  const layers = [c.unified, c.internal, c.radar, c.web].filter((n) => n > 0).length;
  if (total === 0) return "none";
  if (total >= 10 && layers >= 2) return "high";
  if (total >= 4) return "medium";
  return "low";
}

function stars(c: PriceCompareResult["confidence"]): string {
  return c === "high" ? "★★★★★" : c === "medium" ? "★★★☆☆" : c === "low" ? "★★☆☆☆" : "☆☆☆☆☆";
}

// ----- Couches -----

async function fetchUnified(sb: any, q: PriceCompareInput): Promise<PriceSample[]> {
  const terms = tokens(q.query);
  let qb = sb.from("waouh_unified_catalog")
    .select("titre, prix_min, prix_max, ville, categorie, sous_categorie")
    .eq("is_active", true)
    .not("prix_min", "is", null)
    .order("last_seen_at", { ascending: false, nullsFirst: false })
    .limit(40);
  if (q.city) qb = qb.ilike("ville", q.city);
  if (q.category) qb = qb.or(`categorie.ilike.%${q.category}%,sous_categorie.ilike.%${q.category}%`);
  if (terms.length) {
    qb = qb.or(terms.map((t) => `titre.ilike.%${t}%,description.ilike.%${t}%`).join(","));
  } else if (!q.category) {
    return [];
  }
  const { data, error } = await qb;
  if (error) { console.error("[price/unified]", error.message); return []; }
  return (data || []).map((r: any) => {
    const lo = Number(r.prix_min) || 0;
    const hi = Number(r.prix_max) || lo;
    const price = lo && hi ? Math.round((lo + hi) / 2) : (lo || hi);
    return { price, title: r.titre, source: "Catalogue WAOUH", city: r.ville, layer: "unified" as const };
  }).filter((s) => s.price > 0);
}

async function fetchInternal(sb: any, q: PriceCompareInput): Promise<PriceSample[]> {
  const terms = tokens(q.query);
  let qb = sb.from("waouh_articles")
    .select("id, title, price, city, category")
    .eq("status", "active")
    .not("price", "is", null)
    .order("created_at", { ascending: false })
    .limit(40);
  if (q.city) qb = qb.ilike("city", q.city);
  if (q.category) qb = qb.eq("category", q.category);
  if (q.article_id) qb = qb.neq("id", q.article_id);
  if (terms.length) {
    qb = qb.or(terms.map((t) => `title.ilike.%${t}%,brand.ilike.%${t}%,model.ilike.%${t}%`).join(","));
  } else if (!q.category) {
    return [];
  }
  const { data } = await qb;
  return (data || []).filter((r: any) => r.price > 0).map((r: any) => ({
    price: Number(r.price), title: r.title, source: "Annonces WAOUH", city: r.city, layer: "internal" as const,
  }));
}

async function fetchRadar(sb: any, q: PriceCompareInput): Promise<PriceSample[]> {
  const terms = tokens(q.query, 3);
  if (!terms.length) return [];
  let qb = sb.from("waouh_radar_signals")
    .select("raw_text, price, city, source_type")
    .not("price", "is", null)
    .gte("created_at", new Date(Date.now() - 60 * 86400 * 1000).toISOString())
    .order("created_at", { ascending: false })
    .limit(30);
  if (q.city) qb = qb.ilike("city", q.city);
  qb = qb.or(terms.map((t) => `raw_text.ilike.%${t}%`).join(","));
  const { data } = await qb;
  return (data || []).filter((r: any) => r.price > 0).map((r: any) => ({
    price: Number(r.price), title: (r.raw_text || "").slice(0, 80),
    source: `Radar WA · ${r.source_type || "groupe"}`, city: r.city, layer: "radar" as const,
  }));
}

async function fetchWeb(query: string, city: string | null): Promise<PriceSample[]> {
  if (!FIRECRAWL_API_KEY) return [];
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Authorization": `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: `${query} prix ${city || "Bénin"}`, limit: 8, lang: "fr" }),
    });
    clearTimeout(t);
    if (!r.ok) return [];
    const j = await r.json();
    const items = (j?.data?.web || j?.web || j?.data || []) as any[];
    const filtered = items.filter((it: any) => {
      const u = String(it.url || "").toLowerCase();
      return TARGET_DOMAINS.some((d) => u.includes(d));
    }).slice(0, 6);
    if (!filtered.length) return [];
    const compact = filtered.map((it: any, i: number) => ({
      i, title: it.title || "", desc: (it.description || it.snippet || "").slice(0, 180), url: it.url,
    }));
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: `Extrais des prix d'annonces. JSON {"items":[{"i":0,"price":50000,"currency":"XOF","relevant":true}]}. currency: XOF/EUR/USD/NGN/GHS/MAD/GBP. relevant=true uniquement si pertinent pour "${query}". Ignore sans prix.` },
          { role: "user", content: JSON.stringify(compact) },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!aiRes.ok) return [];
    const aj = await aiRes.json();
    const parsed = JSON.parse(aj.choices?.[0]?.message?.content ?? "{}");
    const out: PriceSample[] = [];
    for (const it of (parsed.items || []) as any[]) {
      if (!it.relevant || !it.price) continue;
      const fx = FX_TO_FCFA[String(it.currency || "XOF").toUpperCase()] ?? 1;
      const price = Math.round(Number(it.price) * fx);
      if (!Number.isFinite(price) || price < 100 || price > 50_000_000) continue;
      const src = filtered[it.i];
      if (!src) continue;
      const domain = (() => { try { return new URL(src.url).hostname.replace(/^www\./, ""); } catch { return "web"; } })();
      out.push({ price, title: src.title, source: domain, url: src.url, layer: "web" });
    }
    return out;
  } catch (e) {
    console.error("[price/web]", e);
    return [];
  }
}

// ----- Verdict IA -----

async function aiVerdict(opts: {
  query: string; city: string | null; askedPrice: number | null;
  stats: PriceCompareResult["stats"]; confidence: string; samples: PriceSample[];
}): Promise<{ label: string; pct: number | null; advice: string }> {
  let pct: number | null = null;
  if (opts.askedPrice && opts.stats.median) {
    pct = Math.round(((opts.askedPrice - opts.stats.median) / opts.stats.median) * 100);
  }
  const fallback = (() => {
    if (pct == null) return "INCONNU";
    if (pct < -15) return "AUBAINE";
    if (pct > 15) return "ÉLEVÉ";
    return "JUSTE";
  })();
  try {
    const top = opts.samples.slice(0, 6)
      .map((s) => `- ${s.source} · ${fmt(s.price)}${s.title ? " · " + s.title.slice(0, 50) : ""}`).join("\n");
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: 'Analyste marché Bénin. JSON: {"label":"JUSTE|ÉLEVÉ|AUBAINE|INCONNU","advice":"≤110 car, FR, factuel, mentionne marge négo si pertinente"}. Si confidence=low → prudence.' },
          { role: "user", content: `Recherche: ${opts.query}\nVille: ${opts.city || "?"}\nPrix demandé: ${opts.askedPrice ?? "?"} FCFA\nStats: ${JSON.stringify(opts.stats)}\nConfidence: ${opts.confidence}\nComparables:\n${top}` },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!r.ok) return { label: fallback, pct, advice: "" };
    const j = await r.json();
    const parsed = JSON.parse(j.choices?.[0]?.message?.content ?? "{}");
    return { label: String(parsed.label || fallback).toUpperCase(), pct, advice: String(parsed.advice || "").slice(0, 140) };
  } catch {
    return { label: fallback, pct, advice: "" };
  }
}

// ----- Format du bloc chat -----

function buildReplyBlock(opts: {
  title: string; city: string | null; askedPrice: number | null;
  stats: PriceCompareResult["stats"]; confidence: PriceCompareResult["confidence"];
  counts: PriceCompareResult["counts"]; verdict: PriceCompareResult["verdict"];
  samples: PriceSample[];
}): string {
  const { stats, confidence, askedPrice, verdict, samples, counts } = opts;
  if (stats.n === 0) {
    return `📊 *Analyse marché — ${opts.title}*\n⚠️ Aucun comparable trouvé${opts.city ? " à " + opts.city : ""}. Estimation non disponible — basez-vous sur l'état réel du produit.`;
  }
  const low = confidence === "low" || stats.n < 3;
  const verdictEmoji = verdict.label === "AUBAINE" ? "🟢" : verdict.label === "JUSTE" ? "✅" : verdict.label === "ÉLEVÉ" ? "🟠" : "⚪";
  const pctTxt = verdict.pct != null ? ` (${verdict.pct > 0 ? "+" : ""}${verdict.pct}%)` : "";
  const range = `${fmt(stats.p25 ?? stats.min!)} – ${fmt(stats.p75 ?? stats.max!)}`;
  const sourcesParts = [
    counts.unified ? `${counts.unified} catalogue` : "",
    counts.internal ? `${counts.internal} WAOUH` : "",
    counts.radar ? `${counts.radar} radar WA` : "",
    counts.web ? `${counts.web} web` : "",
  ].filter(Boolean).join(" · ");
  const top3 = samples.slice(0, 3).map((s, i) =>
    `   ${i + 1}. ${s.source} · ${fmt(s.price)}${s.city ? " · " + s.city : ""}`
  ).join("\n");
  const askLine = askedPrice ? `\n💰 Prix proposé : *${fmt(askedPrice)}*` : "";
  const verdictLine = askedPrice ? `\n🎯 Verdict : ${verdictEmoji} *${verdict.label}*${pctTxt} · ${stars(confidence)}` : `\n📈 Confiance : ${stars(confidence)}`;
  const adviceLine = verdict.advice ? `\n🧠 ${verdict.advice}` : "";
  const warn = low ? `\n⚠️ Données limitées (n=${stats.n}) — analyse indicative.` : "";
  return [
    `📊 *Analyse marché — ${opts.title}${opts.city ? " (" + opts.city + ")" : ""}*`,
    `━━━━━━━━━━━━━━━━━━━━━━━`,
    `${askLine}`,
    `📦 Fourchette p25–p75 : *${range}*`,
    `📈 Médiane : ${stats.median ? fmt(stats.median) : "?"} · Min ${stats.min ? fmt(stats.min) : "?"} · Max ${stats.max ? fmt(stats.max) : "?"}`,
    `🔎 ${stats.n} comparable${stats.n > 1 ? "s" : ""} analysé${stats.n > 1 ? "s" : ""} (${sourcesParts})`,
    top3 ? `🏆 Top 3 :\n${top3}` : "",
    `${verdictLine}${adviceLine}${warn}`,
  ].filter(Boolean).join("\n");
}

// ----- API publique -----

export async function compareMarketPrice(sb: any, input: PriceCompareInput): Promise<PriceCompareResult> {
  const started = Date.now();
  const cacheKey = `price_v3:${(input.query || "").slice(0, 80)}:${input.city || ""}:${input.category || ""}:${input.fastMode ? "f" : "x"}`.toLowerCase();
  try {
    const { data: cached } = await sb.from("waouh_cache").select("value, expires_at").eq("cache_key", cacheKey).maybeSingle();
    if (cached && new Date(cached.expires_at) > new Date()) {
      const v = cached.value as PriceCompareResult;
      // recompute verdict pct quickly if askedPrice changed
      if (input.askedPrice && v.stats.median) {
        const pct = Math.round(((input.askedPrice - v.stats.median) / v.stats.median) * 100);
        v.verdict = { ...v.verdict, pct };
      }
      return v;
    }
  } catch {}

  const layers = await Promise.all([
    fetchUnified(sb, input).catch((e) => { console.error("[price/unified]", e); return [] as PriceSample[]; }),
    fetchInternal(sb, input).catch((e) => { console.error("[price/internal]", e); return [] as PriceSample[]; }),
    fetchRadar(sb, input).catch((e) => { console.error("[price/radar]", e); return [] as PriceSample[]; }),
    input.fastMode ? Promise.resolve([] as PriceSample[]) : fetchWeb(input.query, input.city ?? null).catch(() => [] as PriceSample[]),
  ]);
  const [unified, internal, radar, web] = layers;
  const samples = [...unified, ...internal, ...radar, ...web];
  const stats = aggregate(samples);
  const counts = { unified: unified.length, internal: internal.length, radar: radar.length, web: web.length };
  const confidence = computeConfidence(counts);
  const verdict = stats.n > 0
    ? await aiVerdict({ query: input.query, city: input.city ?? null, askedPrice: input.askedPrice ?? null, stats, confidence, samples })
    : { label: "INCONNU", pct: null, advice: "" };

  const replyBlock = buildReplyBlock({
    title: input.query || "produit", city: input.city ?? null, askedPrice: input.askedPrice ?? null,
    stats, confidence, counts, verdict, samples,
  });

  const result: PriceCompareResult = { stats, confidence, verdict, counts, samples: samples.slice(0, 12), replyBlock };

  // cache + snapshot best-effort
  try {
    await sb.from("waouh_cache").upsert({
      cache_key: cacheKey,
      value: result,
      expires_at: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
    });
  } catch {}
  try {
    await sb.from("waouh_price_snapshots").insert({
      article_id: input.article_id ?? null,
      query: input.query, city: input.city ?? null, category: input.category ?? null,
      stats, sources: result.samples.map((s) => ({ source: s.source, price: s.price, url: s.url, title: s.title })),
      confidence, n_internal: internal.length, n_radar: radar.length, n_web: web.length,
    });
  } catch {}

  console.log("[price-compare]", { q: input.query, city: input.city, counts, conf: confidence, ms: Date.now() - started });
  return result;
}

export function shortMarketLine(r: PriceCompareResult, askedPrice: number | null): string {
  if (r.stats.n === 0) return "📊 Marché : données indisponibles";
  const range = `${fmt(r.stats.p25 ?? r.stats.min!)} – ${fmt(r.stats.p75 ?? r.stats.max!)}`;
  const verdictEmoji = r.verdict.label === "AUBAINE" ? "🟢" : r.verdict.label === "JUSTE" ? "✅" : r.verdict.label === "ÉLEVÉ" ? "🟠" : "⚪";
  const pct = askedPrice && r.stats.median != null
    ? ` ${verdictEmoji} ${r.verdict.label}${r.verdict.pct != null ? ` (${r.verdict.pct > 0 ? "+" : ""}${r.verdict.pct}%)` : ""}`
    : "";
  const srcs = [
    r.counts.unified ? `${r.counts.unified} cat.` : "",
    r.counts.internal ? `${r.counts.internal} WAOUH` : "",
    r.counts.radar ? `${r.counts.radar} radar` : "",
    r.counts.web ? `${r.counts.web} web` : "",
  ].filter(Boolean).join(" · ");
  return `📊 Marché réel : ${range} (médiane ${r.stats.median ? fmt(r.stats.median) : "?"} · n=${r.stats.n} · ${srcs})${pct}${r.verdict.advice ? `\n🧠 ${r.verdict.advice}` : ""}`;
}
