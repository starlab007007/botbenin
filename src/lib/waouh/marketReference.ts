import { supabase } from "@/integrations/supabase/client";

export type MarketSource = {
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
export type MarketPoint = { text: string; cites: number[] };
export type MarketReference = {
  stats: { count: number; priced: number; low: number | null; median: number | null; high: number | null };
  sources: MarketSource[];
  points: MarketPoint[];
  advice: MarketPoint | null;
  assisted: boolean;
  generated_at: string;
};

/** Analyse sourcée du marché : chaque constat renvoie à des sources numérotées et vérifiables. */
export async function fetchMarketReference(input: { query?: string; city?: string | null; fabricIds: string[] }): Promise<MarketReference | null> {
  const ids = [...new Set(input.fabricIds.filter(Boolean))].slice(0, 24);
  if (!ids.length) return null;
  try {
    const { data, error } = await supabase.functions.invoke("waouh-market-reference", {
      body: { query: input.query || "", city: input.city || "", fabric_ids: ids },
    });
    if (error || !data?.ok) return null;
    return data.data as MarketReference;
  } catch {
    return null;
  }
}

export function sourceDate(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}
