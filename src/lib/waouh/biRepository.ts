// Parité Web ↔ Flutter (branche codex) : BI / Analyse.
// Mêmes tables (waouh_bi_sources, waouh_bi_source_rows), même RPC
// waouh_bi_store_source et même edge function waouh-bi-query (source_id).
import { supabase } from "@/integrations/supabase/client";

export type BiSource = {
  id: string;
  user_id: string;
  name: string;
  source_type: string;
  source_url: string | null;
  status: string | null;
  row_count: number | null;
  column_count: number | null;
  columns: any;
  metadata: any;
  created_at: string;
  updated_at: string;
};

const db = supabase as any;

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error("Connectez-vous avant d'utiliser BI / Analyse.");
  return id;
}

export const biRepository = {
  async fetchSources(): Promise<BiSource[]> {
    const userId = await currentUserId();
    const { data, error } = await db
      .from("waouh_bi_sources")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []) as BiSource[];
  },

  async fetchSource(sourceId: string): Promise<BiSource | null> {
    const { data, error } = await db
      .from("waouh_bi_sources")
      .select("*")
      .eq("id", sourceId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as BiSource) || null;
  },

  async fetchRows(sourceId: string, limit = 200): Promise<Record<string, any>[]> {
    const userId = await currentUserId();
    const { data, error } = await db
      .from("waouh_bi_source_rows")
      .select("row_number,row_data")
      .eq("source_id", sourceId)
      .eq("user_id", userId)
      .order("row_number")
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data || []).map((r: any) => (r.row_data && typeof r.row_data === "object" ? r.row_data : {}));
  },

  async importSource(payload: {
    name: string;
    type: string;
    sourceUrl?: string | null;
    columns: string[];
    rows: Record<string, any>[];
    metadata?: Record<string, any>;
  }): Promise<BiSource> {
    if (!payload.rows.length) throw new Error("La source ne contient aucune ligne exploitable.");
    if (payload.rows.length > 5000) throw new Error("Import limité à 5 000 lignes par source.");
    const userId = await currentUserId();

    const { data: sourceId, error } = await db.rpc("waouh_bi_store_source", {
      p_name: payload.name.trim(),
      p_source_type: payload.type,
      p_source_url: payload.sourceUrl?.trim() || null,
      p_columns: payload.columns,
      p_rows: payload.rows,
      p_metadata: payload.metadata || {},
    });
    if (error) throw new Error(error.message);
    const id = String(sourceId || "").trim();
    if (!id || id === "null") throw new Error("La source BI n'a pas été enregistrée.");

    const { data: row, error: readError } = await db
      .from("waouh_bi_sources")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    if (readError) throw new Error(readError.message);
    return row as BiSource;
  },

  async ask(sourceId: string, question: string) {
    const clean = question.trim();
    if (!clean) throw new Error("Question obligatoire");
    const { data, error } = await supabase.functions.invoke("waouh-bi-query", {
      body: { source_id: sourceId, question: clean },
    });
    if (error) throw new Error(error.message);
    if ((data as any)?.error) throw new Error(String((data as any).error));
    return data as any;
  },
};

/** Convertit un texte CSV en { columns, rows } exploitables par waouh_bi_store_source. */
export function parseCsv(text: string): { columns: string[]; rows: Record<string, any>[] } {
  const lines = text.replace(/\r\n?/g, "\n").split("\n").filter((l) => l.trim().length);
  if (!lines.length) return { columns: [], rows: [] };

  const splitLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (quoted && line[i + 1] === '"') { cur += '"'; i++; }
        else quoted = !quoted;
      } else if ((ch === "," || ch === ";" || ch === "\t") && !quoted) {
        out.push(cur); cur = "";
      } else cur += ch;
    }
    out.push(cur);
    return out.map((v) => v.trim());
  };

  const columns = splitLine(lines[0]).map((c, i) => c || `col_${i + 1}`);
  const rows = lines.slice(1).map((line) => {
    const cells = splitLine(line);
    const row: Record<string, any> = {};
    columns.forEach((col, i) => {
      const raw = cells[i] ?? "";
      const num = raw !== "" && !isNaN(Number(raw.replace(/\s/g, "").replace(",", ".")))
        ? Number(raw.replace(/\s/g, "").replace(",", "."))
        : null;
      row[col] = num !== null ? num : raw;
    });
    return row;
  });
  return { columns, rows };
}
