import { supabase } from "@/integrations/supabase/client";

export type WaouhProductIntelligence = {
  article_id: string;
  generated_at?: string;
  details: { text: string; quality_score?: number | null; last_verified_at?: string | null; origin?: string | null };
  market: { text: string; sample_count: number; min?: number | null; median?: number | null; max?: number | null; source_mix?: string[]; city?: string | null };
  comparison: { text: string; current_price?: number | null; median_price?: number | null; delta_percent?: number | null };
  recommendation: { text: string; tone?: string; confidence?: number; rationale?: string[] };
  activity?: { interests?: number; open_negotiations?: number; accepted_negotiations?: number; views?: number };
};

const cache = new Map<string, Promise<WaouhProductIntelligence | null>>();

export function loadWaouhProductIntelligence(articleId: string) {
  const id = String(articleId || "").trim();
  if (!id) return Promise.resolve(null);
  const previous = cache.get(id);
  if (previous) return previous;
  const request = supabase.functions
    .invoke("setup-test-accounts", { body: { article_id: id } })
    .then(({ data, error }) => {
      if (error || !data?.ok) return null;
      return data as WaouhProductIntelligence;
    })
    .catch(() => null);
  cache.set(id, request);
  return request;
}
