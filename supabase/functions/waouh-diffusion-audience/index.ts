// Diffusion audience builder — query v_diffusion_audience with filters
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-waouh-session",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface Filters {
  sources?: string[];
  secteurs?: string[];
  sous_categories?: string[];
  keywords?: string;             // free-text: comma/space separated tokens, ILIKE on display_name + sous_categorie
  villes?: string[];
  classes?: string[];
  min_freshness_days?: number;
  min_qualite?: number;
  min_intent?: number;
  include_opt_out?: boolean;
  limit_sample?: number;
}

function tokenizeKeywords(s?: string): string[] {
  if (!s) return [];
  return s.split(/[,;\n]+/).map(t => t.trim()).filter(t => t.length >= 2).slice(0, 10);
}

function applyCommonFilters(q: any, f: Filters) {
  if (!f.include_opt_out) q = q.eq("opt_out", false);
  q = q.eq("is_whatsapp", true);
  if (f.secteurs?.length) q = q.in("secteur", f.secteurs);
  if (f.villes?.length) q = q.in("ville", f.villes);
  if (f.classes?.length) q = q.in("classe", f.classes);
  if (typeof f.min_intent === "number") q = q.gte("intent_score", f.min_intent);
  if (typeof f.min_qualite === "number") q = q.gte("qualite_score", f.min_qualite);
  if (typeof f.min_freshness_days === "number") q = q.lte("freshness_days", f.min_freshness_days);
  if (f.sources?.length) q = q.overlaps("sources", f.sources);
  // Niches: OR match on sous_categorie (ILIKE any)
  if (f.sous_categories?.length) {
    const ors = f.sous_categories.map(n => `sous_categorie.ilike.%${n.replace(/[%,]/g, "")}%`).join(",");
    q = q.or(ors);
  }
  // Free-text keywords: OR match on sous_categorie + display_name
  const kws = tokenizeKeywords(f.keywords);
  if (kws.length) {
    const ors = kws.flatMap(k => {
      const safe = k.replace(/[%,]/g, "");
      return [`sous_categorie.ilike.%${safe}%`, `display_name.ilike.%${safe}%`];
    }).join(",");
    q = q.or(ors);
  }
  return q;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const filters: Filters = await req.json().catch(() => ({}));

    let q = admin.from("v_diffusion_audience").select("*", { count: "exact" });
    q = applyCommonFilters(q, filters);

    const sample = await q.order("intent_score", { ascending: false }).limit(filters.limit_sample ?? 10);
    if (sample.error) throw sample.error;

    // Breakdown by class (apply same filters)
    const breakdown: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
    for (const klass of ["A", "B", "C", "D"]) {
      let bq = admin.from("v_diffusion_audience").select("*", { count: "exact", head: true });
      bq = applyCommonFilters(bq, { ...filters, classes: [klass] });
      const { count } = await bq;
      breakdown[klass] = count ?? 0;
    }

    return new Response(JSON.stringify({
      ok: true,
      total: sample.count ?? 0,
      breakdown,
      sample: (sample.data ?? []).map((r: any) => ({
        phone_masked: maskPhone(r.phone_e164),
        display_name: r.display_name,
        secteur: r.secteur, ville: r.ville, classe: r.classe,
        intent_score: r.intent_score, qualite_score: r.qualite_score,
        sources: r.sources,
      })),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function maskPhone(p: string | null): string {
  if (!p) return "";
  return p.length > 6 ? p.slice(0, 4) + "***" + p.slice(-2) : p;
}
