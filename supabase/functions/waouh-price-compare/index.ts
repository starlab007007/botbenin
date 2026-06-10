// WAOUH Price Compare — Analyse marché réelle
// Combine 3 couches de comparables: catalogue interne, signaux radar WA,
// web scraping ciblé (Jumia, Coinafrique, Jiji, Afrikrea) via Firecrawl.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');

const FX_TO_FCFA: Record<string, number> = {
  XOF: 1, FCFA: 1, CFA: 1,
  EUR: 656, USD: 605, NGN: 0.4, GHS: 50, MAD: 60, GBP: 760,
};

const TARGET_DOMAINS = [
  'jumia.com', 'jumia.ci', 'jumia.sn', 'jumia.com.ng',
  'coinafrique.com',
  'jiji.ci', 'jiji.ng', 'jiji.com.gh',
  'afrikrea.com',
  'expat.com',
  'facebook.com/marketplace',
];

type Sample = { price: number; title?: string; source: string; url?: string; city?: string };

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';
}

function percentile(sorted: number[], p: number) {
  if (!sorted.length) return null;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return Math.round(lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo));
}

function aggregate(samples: Sample[]) {
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

function computeConfidence(nInt: number, nRadar: number, nWeb: number) {
  const total = nInt + nRadar + nWeb;
  const layers = [nInt, nRadar, nWeb].filter((n) => n > 0).length;
  if (total >= 8 && layers >= 2) return 'high';
  if (total >= 4) return 'medium';
  return 'low';
}

// --- Couche 1: catalogue interne ---
async function fetchInternal(sb: any, article: any, query: string, city: string | null, category: string | null): Promise<Sample[]> {
  let q = sb.from('waouh_articles')
    .select('id, title, price, city, category')
    .eq('status', 'active')
    .not('price', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50);
  if (city) q = q.ilike('city', city);
  if (category) q = q.eq('category', category);
  if (article?.id) q = q.neq('id', article.id);
  const { data } = await q;
  return (data || [])
    .filter((r: any) => r.price > 0)
    .map((r: any) => ({ price: Number(r.price), title: r.title, source: 'WAOUH (interne)', city: r.city }));
}

// --- Couche 2: signaux radar ---
async function fetchRadar(sb: any, query: string, city: string | null): Promise<Sample[]> {
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2).slice(0, 3);
  if (!terms.length) return [];
  let q = sb.from('waouh_radar_signals')
    .select('id, raw_text, price, city, source_type')
    .not('price', 'is', null)
    .gte('created_at', new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(40);
  if (city) q = q.ilike('city', city);
  // Filtre full-text simple sur raw_text
  q = q.or(terms.map((t) => `raw_text.ilike.%${t}%`).join(','));
  const { data } = await q;
  return (data || [])
    .filter((r: any) => r.price > 0)
    .map((r: any) => ({
      price: Number(r.price),
      title: (r.raw_text || '').slice(0, 80),
      source: `Radar WA (${r.source_type || 'groupe'})`,
      city: r.city,
    }));
}

// --- Couche 3: web via Firecrawl ---
async function firecrawlSearch(query: string): Promise<any[]> {
  if (!FIRECRAWL_API_KEY) return [];
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 9000);
    const r = await fetch('https://api.firecrawl.dev/v2/search', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Authorization': `Bearer ${FIRECRAWL_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        limit: 10,
        lang: 'fr',
      }),
    });
    clearTimeout(t);
    if (!r.ok) {
      console.error('[firecrawl] search', r.status, await r.text().catch(() => ''));
      return [];
    }
    const j = await r.json();
    // v2 returns { data: { web: [...] } } or { web: [...] }
    const items = j?.data?.web || j?.web || j?.data || [];
    return Array.isArray(items) ? items : [];
  } catch (e) {
    console.error('[firecrawl] search err', e);
    return [];
  }
}

async function fetchWeb(query: string, city: string | null): Promise<Sample[]> {
  if (!FIRECRAWL_API_KEY) return [];
  const q = `${query} prix ${city || 'Bénin Afrique de l\'Ouest'}`;
  const results = await firecrawlSearch(q);
  const filtered = results.filter((it: any) => {
    const u = String(it.url || '').toLowerCase();
    return TARGET_DOMAINS.some((d) => u.includes(d));
  }).slice(0, 8);
  if (!filtered.length) return [];

  // Extraction prix via AI sur titles + descriptions (pas besoin de scraper chaque page)
  const compact = filtered.map((it: any, i: number) => ({
    i, title: it.title || '', desc: (it.description || it.snippet || '').slice(0, 200), url: it.url,
  }));

  try {
    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: `Tu extrais des prix d'annonces e-commerce. Réponds en JSON: {"items":[{"i":0,"price":50000,"currency":"XOF","relevant":true}]}. currency parmi XOF/EUR/USD/NGN/GHS/MAD/GBP. relevant=true seulement si l'annonce correspond clairement à la recherche "${query}". Si pas de prix visible, ignore l'item.` },
          { role: 'user', content: JSON.stringify(compact) },
        ],
        response_format: { type: 'json_object' },
      }),
    });
    if (!aiRes.ok) return [];
    const j = await aiRes.json();
    const parsed = JSON.parse(j.choices?.[0]?.message?.content ?? '{}');
    const items = (parsed.items || []) as any[];
    const samples: Sample[] = [];
    for (const it of items) {
      if (!it.relevant || !it.price) continue;
      const fx = FX_TO_FCFA[String(it.currency || 'XOF').toUpperCase()] ?? 1;
      const price = Math.round(Number(it.price) * fx);
      if (!Number.isFinite(price) || price < 100 || price > 50_000_000) continue;
      const src = filtered[it.i];
      if (!src) continue;
      const domain = (() => { try { return new URL(src.url).hostname.replace(/^www\./, ''); } catch { return 'web'; } })();
      samples.push({
        price,
        title: src.title,
        source: domain,
        url: src.url,
      });
    }
    return samples;
  } catch (e) {
    console.error('[fetchWeb] extract err', e);
    return [];
  }
}

// --- Synthèse IA finale ---
async function aiVerdict(opts: {
  query: string; city: string | null; askedPrice: number | null;
  stats: any; confidence: string; samples: Sample[];
}) {
  const topSamples = opts.samples.slice(0, 8).map((s) => `- ${s.source} · ${fmt(s.price)}${s.title ? ' · ' + s.title.slice(0, 50) : ''}`).join('\n');
  try {
    const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Tu es analyste marché béninois. Verdict honnête en 2 phrases courtes (FR). JSON: {"verdict":"juste|élevé|aubaine|inconnu","verdict_pct":number|null,"advice":"string ≤120 car"}. Si confidence=low, sois prudent.' },
          { role: 'user', content: `Recherche: ${opts.query}\nVille: ${opts.city || '?'}\nPrix demandé: ${opts.askedPrice ?? '?'} FCFA\nStats: ${JSON.stringify(opts.stats)}\nConfidence: ${opts.confidence}\nComparables:\n${topSamples}` },
        ],
        response_format: { type: 'json_object' },
      }),
    });
    if (!r.ok) return { verdict: 'inconnu', verdict_pct: null, advice: 'Analyse limitée.' };
    const j = await r.json();
    return JSON.parse(j.choices?.[0]?.message?.content ?? '{}');
  } catch {
    return { verdict: 'inconnu', verdict_pct: null, advice: '' };
  }
}

function buildReply(opts: {
  title: string; city: string | null; stats: any; confidence: string; askedPrice: number | null;
  verdict: any; samples: Sample[]; counts: { internal: number; radar: number; web: number };
}) {
  const { stats, confidence, askedPrice, verdict, samples, counts } = opts;
  const n = stats.n || 0;
  if (n === 0) {
    return `📊 *Analyse prix — ${opts.title}*\n\n⚠️ Aucun comparable trouvé pour ${opts.city || 'cette zone'}. Estimation impossible — basez-vous sur l'état réel du produit.`;
  }
  const range = `${fmt(stats.p25 ?? stats.min)} – ${fmt(stats.p75 ?? stats.max)}`;
  const medianLine = stats.median ? `(médiane ${fmt(stats.median)} · ${n} annonce${n > 1 ? 's' : ''} analysée${n > 1 ? 's' : ''})` : `(${n} annonce${n > 1 ? 's' : ''})`;

  let verdictLine = '';
  if (askedPrice && stats.median) {
    const pct = Math.round(((askedPrice - stats.median) / stats.median) * 100);
    const label = verdict?.verdict ? String(verdict.verdict).toUpperCase() : (pct < -15 ? 'AUBAINE' : pct > 15 ? 'ÉLEVÉ' : 'CORRECT');
    const sign = pct > 0 ? '+' : '';
    verdictLine = `\n🎯 Prix ${fmt(askedPrice)} → *${label}* (${sign}${pct}% vs médiane)`;
  }

  const top = samples.slice(0, 3).map((s) => `• ${s.source} · ${fmt(s.price)}`).join('\n');
  const sourcesLine = top ? `\n\n🔎 Sources réelles :\n${top}` : '';

  const advice = verdict?.advice ? `\n\n💡 ${verdict.advice}` : '';
  const warn = confidence === 'low' ? `\n\n⚠️ Confiance limitée (peu de comparables) — à confirmer.` : '';
  const layers = `\n_Sources: ${counts.internal} interne · ${counts.radar} radar WA · ${counts.web} web_`;

  return `📊 *Analyse prix réel — ${opts.title}${opts.city ? ' (' + opts.city + ')' : ''}*\n\n💰 Fourchette marché : ${range}\n   ${medianLine}${verdictLine}${sourcesLine}${advice}${warn}${layers}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { article_id, query, offered_price } = await req.json();
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    let article: any = null;
    let title = query || 'produit';
    let city: string | null = null;
    let category: string | null = null;
    let searchQuery = query || '';

    if (article_id) {
      const { data } = await sb.from('waouh_articles').select('*').eq('id', article_id).single();
      article = data;
      if (article) {
        title = `${article.title}${article.brand ? ' ' + article.brand : ''}${article.model ? ' ' + article.model : ''}`.trim();
        searchQuery = `${article.title} ${article.brand || ''} ${article.model || ''}`.trim();
        city = article.city ?? null;
        category = article.category ?? null;
      }
    }

    const askedPrice = Number(offered_price) || Number(article?.price) || null;

    // Cache 6h
    const cacheKey = `price_v2:${searchQuery}:${city || ''}`.slice(0, 200);
    const { data: cached } = await sb.from('waouh_cache').select('value, expires_at').eq('cache_key', cacheKey).maybeSingle();
    if (cached && new Date(cached.expires_at) > new Date()) {
      const v = cached.value as any;
      return new Response(JSON.stringify({ success: true, cached: true, ...v }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 3 couches en parallèle
    const [internal, radar, web] = await Promise.all([
      fetchInternal(sb, article, searchQuery, city, category).catch(() => []),
      fetchRadar(sb, searchQuery, city).catch(() => []),
      fetchWeb(searchQuery, city).catch(() => []),
    ]);

    const samples = [...web, ...radar, ...internal]; // priorité web pour affichage
    const stats = aggregate(samples);
    const confidence = computeConfidence(internal.length, radar.length, web.length);

    const verdict = stats.n > 0
      ? await aiVerdict({ query: searchQuery, city, askedPrice, stats, confidence, samples })
      : { verdict: 'inconnu', advice: '' };

    const reply = buildReply({
      title, city, stats, confidence, askedPrice, verdict, samples,
      counts: { internal: internal.length, radar: radar.length, web: web.length },
    });

    const payload = {
      success: true,
      stats,
      confidence,
      min: stats.p25 ?? stats.min,
      max: stats.p75 ?? stats.max,
      average: stats.average,
      median: stats.median,
      sources: samples.slice(0, 10).map((s) => ({ source: s.source, price: s.price, url: s.url, title: s.title })),
      counts: { internal: internal.length, radar: radar.length, web: web.length },
      reply,
    };

    // Snapshot + cache
    await sb.from('waouh_cache').upsert({
      cache_key: cacheKey,
      value: payload,
      expires_at: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
    });

    await sb.from('waouh_price_snapshots').insert({
      article_id: article?.id ?? null,
      query: searchQuery,
      city,
      category,
      stats,
      sources: payload.sources,
      confidence,
      n_internal: internal.length,
      n_radar: radar.length,
      n_web: web.length,
    }).then(() => {}, (e) => console.error('[snapshot insert]', e));

    // Met à jour l'article avec la fourchette serrée
    if (article && stats.p25 && stats.p75) {
      await sb.from('waouh_articles').update({
        market_price_min: stats.p25,
        market_price_max: stats.p75,
      }).eq('id', article.id);
    }

    return new Response(JSON.stringify(payload), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('[waouh-price-compare]', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
