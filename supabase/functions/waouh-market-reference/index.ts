// waouh-market-reference
// Analyse du marché pilotée par l'IA, mais vérifiable : chaque constat renvoie à des sources numérotées
// (annonce d'origine ou annonce WAOUH) et tous les chiffres sont recalculés ici à partir de ces sources.
// Un constat sans source valide, ou contenant un chiffre qui ne vient pas des sources, est écarté.
//
// Body : { query?: string, city?: string, fabric_ids: string[] }   Auth : JWT utilisateur.
import { createClient } from "npm:@supabase/supabase-js@2.49.8";
import { getRequestUser, jsonResponse, waouhCorsHeaders } from "../_shared/waouh-auth.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";

type Source = {
  n: number;
  fabric_id: string;
  title: string;
  host: string;
  kind: "waouh" | "partner" | "web";
  url: string | null;
  observed_at: string | null;
  price: number | null;
  city: string | null;
};
type Point = { text: string; cites: number[] };

const clean = (v: unknown, limit = 200) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, limit);
const priceOf = (row: any): number | null => {
  const p = Number(row.price_min ?? row.price_max);
  return Number.isFinite(p) && p > 0 ? p : null;
};
const median = (values: number[]): number | null => {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};
const money = (n: number) => `${Math.round(n).toLocaleString("fr-FR").replace(/ /g, " ")} F`;

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return /^https?:$/.test(u.protocol) ? u.hostname.replace(/^www\./, "") : null;
  } catch { return null; }
}

function toSource(row: any, n: number): Source {
  const id = String(row.fabric_id || "");
  const url = hostOf(row.source_url) ? String(row.source_url) : null;
  const evidence = (row.evidence ?? {}) as Record<string, unknown>;
  const kind: Source["kind"] = id.startsWith("article:") ? "waouh" : id.startsWith("catalog:") && evidence.source === "partner" ? "partner" : "web";
  const host = kind === "waouh" ? "Annonce WAOUH" : kind === "partner" ? "Partenaire WAOUH" : hostOf(row.source_url) ?? clean(evidence.hostname, 60) ?? "Source en ligne";
  return { n, fabric_id: id, title: clean(row.subject || row.raw_text, 120) || "Offre", host: host || "Source en ligne", kind, url, observed_at: row.observed_at ? String(row.observed_at) : null, price: priceOf(row), city: row.city ? clean(row.city, 60) : null };
}

/** Constats calculés sans IA : toujours disponibles, toujours sourcés. */
function deterministic(sources: Source[], query: string): { points: Point[]; advice: Point | null } {
  const priced = sources.filter((s) => s.price !== null);
  const points: Point[] = [];
  if (priced.length) {
    const prices = priced.map((s) => s.price as number);
    const med = median(prices) as number;
    const lowS = priced.reduce((a, b) => ((b.price as number) < (a.price as number) ? b : a));
    const highS = priced.reduce((a, b) => ((b.price as number) > (a.price as number) ? b : a));
    points.push({ text: `Le prix le plus bas relevé est ${money(lowS.price as number)} (${lowS.host}).`, cites: [lowS.n] });
    if (highS.n !== lowS.n) points.push({ text: `Le prix le plus haut relevé est ${money(highS.price as number)} (${highS.host}).`, cites: [highS.n] });
    if (priced.length >= 3) points.push({ text: `La médiane de ${priced.length} offres comparées est ${money(med)}.`, cites: priced.map((s) => s.n) });
  }
  const unpriced = sources.filter((s) => s.price === null);
  if (unpriced.length) points.push({ text: `${unpriced.length} offre${unpriced.length > 1 ? "s" : ""} sans prix affiché : le prix est à confirmer avec le vendeur.`, cites: unpriced.map((s) => s.n) });
  let advice: Point | null = null;
  if (priced.length >= 3) {
    const med = median(priced.map((s) => s.price as number)) as number;
    advice = { text: `Proposez autour de ${money(Math.round(med * 0.9))}, soit 10 % sous la médiane relevée.`, cites: priced.map((s) => s.n) };
  } else if (priced.length) {
    advice = { text: "Peu de prix à comparer : gardez une marge de négociation prudente.", cites: priced.map((s) => s.n) };
  }
  return { points, advice };
}

/** Chiffres que le texte de l'IA a le droit de citer : ceux des sources et ceux qui en sont calculés. */
function allowedNumbers(sources: Source[]): Set<number> {
  const set = new Set<number>();
  const prices = sources.map((s) => s.price).filter((p): p is number => p !== null);
  prices.forEach((p) => set.add(Math.round(p)));
  const med = median(prices);
  if (med) {
    set.add(Math.round(med));
    set.add(Math.round(med * 0.9));
    prices.forEach((p) => set.add(Math.abs(Math.round(((p - med) / med) * 100))));
  }
  if (prices.length) { set.add(Math.min(...prices)); set.add(Math.max(...prices)); }
  for (let i = 0; i <= sources.length + 1; i++) set.add(i);
  set.add(10);
  return set;
}

function numbersOk(text: string, allowed: Set<number>): boolean {
  const tokens = text.match(/\d[\d\s  .,]*\d|\d/g) ?? [];
  return tokens.every((t) => {
    const value = Number(t.replace(/[\s  ]/g, "").replace(/,/g, "."));
    if (!Number.isFinite(value)) return false;
    // Les petits nombres (modèles, quantités, pourcentages) sont libres ; tout montant à 3 chiffres ou plus doit venir des sources.
    return value < 100 || allowed.has(Math.round(value));
  });
}

function validPoint(raw: any, sources: Source[], allowed: Set<number>): Point | null {
  const text = clean(raw?.text, 260);
  const cites = Array.isArray(raw?.cites) ? [...new Set(raw.cites.map(Number))].filter((n: number) => Number.isInteger(n) && n >= 1 && n <= sources.length) as number[] : [];
  if (!text || !cites.length || !numbersOk(text, allowed)) return null;
  return { text, cites: cites.slice(0, 8) };
}

async function aiPoints(query: string, city: string, sources: Source[]): Promise<{ points: Point[]; advice: Point | null } | null> {
  if (!GEMINI_API_KEY) return null;
  const list = sources.map((s) => `[${s.n}] ${s.title} — ${s.price !== null ? money(s.price) : "prix non affiché"} — ${s.city ?? "ville ?"} — ${s.host}${s.observed_at ? ` — relevé le ${s.observed_at.slice(0, 10)}` : ""}`).join("\n");
  const prompt = `Tu es l'avatar d'achat de WAOUH au Bénin. Analyse le marché pour la demande « ${clean(query, 120)} »${city ? ` à ${clean(city, 60)}` : ""}.
Tu disposes UNIQUEMENT de ces sources numérotées :
${list}

Règles impératives :
1. Réponds par un JSON valide uniquement : {"points":[{"text":"...","cites":[1,2]}],"advice":{"text":"...","cites":[1]}}
2. 3 à 5 constats courts en français (une phrase), utiles pour acheter : écart de prix, offres atypiques (très bas ou très haut), fiabilité de la source, proximité de la zone, vendeurs joignables.
3. Chaque constat cite au moins une source par son numéro dans "cites". N'affirme rien qui ne soit pas visible dans ces lignes. Aucune connaissance extérieure, aucun prix inventé.
4. Les seuls chiffres autorisés sont les prix des lignes ci-dessus, leur médiane, des pourcentages d'écart calculés à partir d'eux et des nombres d'offres.
5. "advice" : une recommandation de négociation prudente (une phrase), sourcée de la même façon.
6. Ne parle jamais de ton fonctionnement, d'un modèle, d'un fournisseur ou d'une technologie.`;
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, topP: 0.8, maxOutputTokens: 700, responseMimeType: "application/json" } }),
      signal: AbortSignal.timeout(9000),
    });
    if (!response.ok) return null;
    const payload = await response.json();
    const text = String(payload?.candidates?.[0]?.content?.parts?.[0]?.text ?? "").replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(text);
    const allowed = allowedNumbers(sources);
    const points = (Array.isArray(parsed?.points) ? parsed.points : []).map((p: unknown) => validPoint(p, sources, allowed)).filter(Boolean).slice(0, 5) as Point[];
    const advice = validPoint(parsed?.advice, sources, allowed);
    if (!points.length) return null;
    return { points, advice };
  } catch (_e) {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: waouhCorsHeaders });
  if (req.method !== "POST") return jsonResponse({ ok: false, error: "method_not_allowed" }, 405);
  const user = await getRequestUser(req);
  if (!user) return jsonResponse({ ok: false, error: "authentication_required" }, 401);
  try {
    const body = await req.json().catch(() => ({}));
    const ids = (Array.isArray(body?.fabric_ids) ? body.fabric_ids : []).map((v: unknown) => clean(v, 80)).filter(Boolean).slice(0, 24);
    if (!ids.length) return jsonResponse({ ok: false, error: "offers_required" }, 400);
    const query = clean(body?.query, 160);
    const city = clean(body?.city, 60);
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const { data, error } = await sb.from("waouh_signal_fabric").select("fabric_id,subject,raw_text,price_min,price_max,city,source_url,observed_at,evidence").in("fabric_id", ids);
    if (error) return jsonResponse({ ok: false, error: "lookup_failed" }, 500);
    const byId = new Map((data ?? []).map((r: any) => [r.fabric_id, r]));
    const sources = ids.map((id: string) => byId.get(id)).filter(Boolean).map((row: any, i: number) => toSource(row, i + 1));
    if (!sources.length) return jsonResponse({ ok: false, error: "offers_not_found" }, 404);
    const prices = sources.map((s: Source) => s.price).filter((p: number | null): p is number => p !== null);
    const stats = { count: sources.length, priced: prices.length, low: prices.length ? Math.min(...prices) : null, median: median(prices), high: prices.length ? Math.max(...prices) : null };
    const ai = await aiPoints(query, city, sources);
    const base = deterministic(sources, query);
    const result = ai ?? base;
    return jsonResponse({ ok: true, data: { stats, sources, points: result.points, advice: result.advice ?? base.advice, assisted: ai !== null, generated_at: new Date().toISOString() } });
  } catch (_e) {
    return jsonResponse({ ok: false, error: "analysis_unavailable" }, 500);
  }
});
