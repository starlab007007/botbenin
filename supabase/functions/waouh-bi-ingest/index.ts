// Ingère une source de données pour l'agent BI : Google Sheet CSV export, CSV public, ou JSON URL.
// Extrait schéma + 100 lignes d'échantillon et met à jour waouh_bi_datasources.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-waouh-session",
};

function parseCsv(text: string): { headers: string[]; rows: any[] } {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim());
  if (!lines.length) return { headers: [], rows: [] };
  const split = (line: string) => {
    const out: string[] = []; let cur = ""; let q = false;
    for (const ch of line) {
      if (ch === '"') q = !q;
      else if (ch === "," && !q) { out.push(cur); cur = ""; }
      else cur += ch;
    }
    out.push(cur);
    return out.map((s) => s.trim().replace(/^"|"$/g, ""));
  };
  const headers = split(lines[0]);
  const rows = lines.slice(1, 501).map((l) => {
    const cells = split(l);
    return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? ""]));
  });
  return { headers, rows };
}

function inferSchema(rows: any[], headers: string[]) {
  return headers.map((h) => {
    const vals = rows.slice(0, 50).map((r) => r[h]).filter((v) => v !== "" && v != null);
    const nums = vals.filter((v) => !isNaN(Number(v))).length;
    const type = vals.length > 0 && nums / vals.length > 0.8 ? "number" : "string";
    return { name: h, type };
  });
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

    const { name, source_type, source_url, csv_text } = await req.json();
    if (!name || !source_type) throw new Error("name & source_type requis");

    let rows: any[] = [];
    let headers: string[] = [];

    if (source_type === "csv_inline") {
      if (!csv_text) throw new Error("csv_text requis pour csv_inline");
      const p = parseCsv(csv_text); rows = p.rows; headers = p.headers;
    } else if (source_type === "google_sheet") {
      const m = String(source_url).match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (!m) throw new Error("URL Google Sheet invalide");
      const sheetId = m[1];
      const gidMatch = String(source_url).match(/[#?&]gid=(\d+)/);
      const gid = gidMatch ? gidMatch[1] : "0";
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
      const r = await fetch(csvUrl);
      if (!r.ok) throw new Error("Impossible de lire le Google Sheet (rendez-le public en lecture)");
      const text = await r.text();
      const p = parseCsv(text); rows = p.rows; headers = p.headers;
    } else if (source_type === "csv") {
      const r = await fetch(source_url);
      const text = await r.text();
      const p = parseCsv(text); rows = p.rows; headers = p.headers;
    } else if (source_type === "json_url") {
      const r = await fetch(source_url);
      const j = await r.json();
      const arr = Array.isArray(j) ? j : (j.data || j.results || j.items || []);
      if (!Array.isArray(arr) || !arr.length) throw new Error("JSON: aucun tableau détecté");
      headers = Object.keys(arr[0]);
      rows = arr.slice(0, 500).map((o: any) => {
        const r: any = {}; headers.forEach((h) => r[h] = typeof o[h] === "object" ? JSON.stringify(o[h]) : o[h]); return r;
      });
    } else {
      throw new Error("source_type non supporté");
    }

    if (!headers.length) throw new Error("Aucune colonne détectée dans la source");

    const stored_type = source_type === "csv_inline" ? "file" : source_type;

    const schema = inferSchema(rows, headers);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await admin.from("waouh_bi_datasources").insert({
      user_id: user.id, name, source_type: stored_type, source_url: source_url ?? null,
      schema, sample_rows: rows.slice(0, 100), row_count: rows.length,
    }).select().single();
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, datasource: data }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
