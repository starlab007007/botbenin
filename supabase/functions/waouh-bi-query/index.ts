// Répond à une question en langage naturel sur une datasource BI.
// Renvoie une spec de visualisation + calcul côté serveur sur les échantillons.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function askAi(question: string, schema: any[], sample: any[]): Promise<any> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY manquant");
  const sys = `Tu es un expert BI. À partir d'un schéma et d'un échantillon de données, tu réponds UNIQUEMENT en JSON valide avec la spec suivante:
{
  "chart_type": "bar" | "line" | "pie" | "kpi" | "table",
  "x": "nom_colonne",
  "y": "nom_colonne",
  "aggregation": "sum" | "avg" | "count" | "max" | "min" | "none",
  "group_by": "nom_colonne" | null,
  "filter": null | { "column": "...", "op": "eq|gt|lt|contains", "value": "..." },
  "top_n": 10,
  "summary": "phrase courte en français expliquant l'insight"
}`;
  const user = `Schéma: ${JSON.stringify(schema)}\nÉchantillon (5 lignes): ${JSON.stringify(sample.slice(0, 5))}\nQuestion: ${question}`;
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "system", content: sys }, { role: "user", content: user }],
      response_format: { type: "json_object" },
    }),
  });
  if (!r.ok) throw new Error(`AI ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return JSON.parse(j.choices?.[0]?.message?.content || "{}");
}

function computeResult(rows: any[], spec: any) {
  let data = [...rows];
  if (spec.filter) {
    const { column, op, value } = spec.filter;
    data = data.filter((r) => {
      const v = r[column]; const t = String(v ?? "");
      if (op === "eq") return t == String(value);
      if (op === "gt") return Number(v) > Number(value);
      if (op === "lt") return Number(v) < Number(value);
      if (op === "contains") return t.toLowerCase().includes(String(value).toLowerCase());
      return true;
    });
  }
  if (spec.chart_type === "kpi") {
    const nums = data.map((r) => Number(r[spec.y])).filter((n) => !isNaN(n));
    const agg = spec.aggregation || "sum";
    let v = 0;
    if (agg === "sum") v = nums.reduce((a, b) => a + b, 0);
    else if (agg === "avg") v = nums.reduce((a, b) => a + b, 0) / (nums.length || 1);
    else if (agg === "count") v = data.length;
    else if (agg === "max") v = Math.max(...nums);
    else if (agg === "min") v = Math.min(...nums);
    return { value: v };
  }
  if (spec.chart_type === "table") return { rows: data.slice(0, spec.top_n || 20) };
  // group + aggregate
  const key = spec.x;
  const groups: Record<string, number[]> = {};
  for (const r of data) {
    const k = String(r[key] ?? "—");
    const v = Number(r[spec.y]);
    if (!groups[k]) groups[k] = [];
    if (!isNaN(v)) groups[k].push(v);
  }
  const agg = spec.aggregation || "sum";
  const points = Object.entries(groups).map(([k, arr]) => {
    let v = 0;
    if (agg === "sum") v = arr.reduce((a, b) => a + b, 0);
    else if (agg === "avg") v = arr.reduce((a, b) => a + b, 0) / (arr.length || 1);
    else if (agg === "count") v = arr.length;
    else if (agg === "max") v = arr.length ? Math.max(...arr) : 0;
    else if (agg === "min") v = arr.length ? Math.min(...arr) : 0;
    return { name: k, value: Math.round(v * 100) / 100 };
  }).sort((a, b) => b.value - a.value).slice(0, spec.top_n || 10);
  return { points };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const auth = req.headers.get("Authorization") || "";
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

    const { datasource_id, question } = await req.json();
    if (!datasource_id || !question) throw new Error("datasource_id & question requis");

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: ds, error } = await admin.from("waouh_bi_datasources").select("*").eq("id", datasource_id).eq("user_id", user.id).single();
    if (error || !ds) throw new Error("Source introuvable");

    const spec = await askAi(question, ds.schema || [], ds.sample_rows || []);
    const result = computeResult(ds.sample_rows || [], spec);

    await admin.from("waouh_bi_queries").insert({
      datasource_id, user_id: user.id, question, spec, result, summary: spec.summary || null,
    });

    return new Response(JSON.stringify({ ok: true, spec, result }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
