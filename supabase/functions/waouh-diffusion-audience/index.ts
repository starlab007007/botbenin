// Diffusion audience builder — query v_diffusion_audience with filters
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface Filters {
  sources?: string[];           // ['radar','catalog','signal','wa_contact']
  secteurs?: string[];
  villes?: string[];
  classes?: string[];           // A/B/C/D
  min_freshness_days?: number;  // last_seen within X
  min_qualite?: number;
  min_intent?: number;
  include_opt_out?: boolean;
  limit_sample?: number;        // sample rows to return (default 10)
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const filters: Filters = await req.json().catch(() => ({}));

    let q = admin.from("v_diffusion_audience").select("*", { count: "exact" });
    if (!filters.include_opt_out) q = q.eq("opt_out", false);
    q = q.eq("is_whatsapp", true);
    if (filters.secteurs?.length) q = q.in("secteur", filters.secteurs);
    if (filters.villes?.length) q = q.in("ville", filters.villes);
    if (filters.classes?.length) q = q.in("classe", filters.classes);
    if (typeof filters.min_intent === "number") q = q.gte("intent_score", filters.min_intent);
    if (typeof filters.min_qualite === "number") q = q.gte("qualite_score", filters.min_qualite);
    if (typeof filters.min_freshness_days === "number") q = q.lte("freshness_days", filters.min_freshness_days);
    if (filters.sources?.length) q = q.overlaps("sources", filters.sources);

    const sample = await q.order("intent_score", { ascending: false }).limit(filters.limit_sample ?? 10);
    if (sample.error) throw sample.error;

    // Breakdown by class
    const breakdown: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
    for (const klass of ["A", "B", "C", "D"]) {
      let bq = admin.from("v_diffusion_audience").select("*", { count: "exact", head: true })
        .eq("classe", klass).eq("is_whatsapp", true);
      if (!filters.include_opt_out) bq = bq.eq("opt_out", false);
      if (filters.secteurs?.length) bq = bq.in("secteur", filters.secteurs);
      if (filters.villes?.length) bq = bq.in("ville", filters.villes);
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
