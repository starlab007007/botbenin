import { supabase } from "@/integrations/supabase/client";
import { invokeWaouhAgentic } from "./agenticClient";

export type NexusSummary = {
  missions: number;
  watches: number;
  approvals: number;
  offers: number;
  seller_articles: number;
  buyer_intents: number;
  preference?: NexusPreference | null;
};

export type NexusPreference = {
  mode?: "buyer" | "seller" | "both";
  relevance_weight?: number;
  price_weight?: number;
  trust_weight?: number;
  location_weight?: number;
  freshness_weight?: number;
  availability_weight?: number;
  contact_mode?: "manual" | "approval" | "auto_opted_in";
  auto_negotiate?: boolean;
  preferred_city?: string | null;
};

export type NexusScores = {
  total_score: number;
  relevance_score: number;
  price_score: number;
  trust_score: number;
  location_score: number;
  freshness_score: number;
  availability_score: number;
  reasons: string[];
};

export type NexusSearchItem = {
  kind: "article" | "catalog";
  article_id: string | null;
  catalog_id: string | null;
  title: string;
  description?: string | null;
  category?: string | null;
  brand?: string | null;
  model?: string | null;
  condition?: string | null;
  price?: number | null;
  currency?: string;
  city?: string | null;
  photos?: string[];
  source?: string | null;
  seller?: {
    display_name?: string | null;
    verified?: boolean;
    reputation?: number | null;
  } | null;
  scores: NexusScores;
  badges: string[];
  advice: string;
};

export type NexusMarket = {
  min: number | null;
  median: number | null;
  max: number | null;
  average: number | null;
  sample_count: number;
};

export type NexusSearchResponse = {
  query: string;
  market: NexusMarket;
  results: NexusSearchItem[];
  explanation?: string;
  buyer_profile?: { id: string; query_text?: string } | null;
};

export type NexusBuyerOpportunity = {
  buyer_profile_id: string;
  query: string;
  category?: string | null;
  budget_max?: number | null;
  source?: string | null;
  buyer?: { display_name?: string | null; verified?: boolean } | null;
  scores: Omit<NexusScores, "trust_score"> & { trust_score?: number };
};

export type NexusSellerGroup = {
  article: {
    id: string;
    title: string;
    price?: number | null;
    currency?: string;
    city?: string | null;
    photos?: string[];
  };
  matched_count: number;
  opportunities: NexusBuyerOpportunity[];
};

export async function getNexusSummary() {
  return invokeWaouhAgentic<NexusSummary>("nexus.summary", {});
}

export async function searchNexus(input: {
  query: string;
  budget_max?: number;
  budget_min?: number;
  city?: string;
  limit?: number;
  persist_intent?: boolean;
}) {
  return invokeWaouhAgentic<NexusSearchResponse>("nexus.search", input);
}

export async function getSellerOpportunities(articleId?: string) {
  return invokeWaouhAgentic<{ articles: NexusSellerGroup[]; total_matches: number }>(
    "nexus.seller_opportunities",
    articleId ? { article_id: articleId } : {},
  );
}

export async function notifyMatchingBuyers(articleId: string) {
  return invokeWaouhAgentic<{ article_id: string; notified: number; note: string }>(
    "nexus.notify_buyers",
    { article_id: articleId },
  );
}

export async function saveNexusPreference(preference: NexusPreference) {
  return invokeWaouhAgentic<{ preference: NexusPreference }>("nexus.preferences.upsert", preference);
}

export async function expressNexusInterest(item: Pick<NexusSearchItem, "article_id" | "catalog_id">) {
  const body = item.article_id
    ? { article_id: item.article_id, source: "nexus", intent: "interest" }
    : { catalog_id: item.catalog_id, source: "nexus", intent: "interest" };
  const { data, error } = await supabase.functions.invoke("waouh-buyer-interest", { body });
  if (error) throw new Error(error.message || "Impossible de contacter le vendeur.");
  if (data?.error) throw new Error(String(data.error));
  return data as { ok?: boolean; duplicate?: boolean; seller_notified?: boolean };
}

export function nexusSourceLabel(source?: string | null) {
  const value = String(source ?? "").toLowerCase();
  if (value.includes("partner")) return "Partenaire";
  if (value.includes("radar")) return "Radar IA";
  if (value.includes("whatsapp")) return "WhatsApp";
  if (value.includes("status")) return "Statut";
  return "WAOUH";
}

export function nexusScoreLabel(score: number) {
  if (score >= 85) return "Excellent match";
  if (score >= 70) return "Très compatible";
  if (score >= 55) return "Compatible";
  return "À vérifier";
}

export function nexusBadgeLabel(value: string) {
  if (value === "recommended") return "Recommandé";
  if (value === "cheapest") return "Moins cher";
  if (value === "trusted") return "Confiance";
  return value;
}


export type NexusSourceStatus = {
  providers: Array<{ provider: string; active: boolean; daily_quota?: number | null; usage_today?: number | null; last_test_at?: string | null; last_test_status?: string | null }>;
  offers: Record<string, number>;
  demands: Record<string, number>;
  radar: { sources: Record<string, number>; intents: Record<string, number>; contacts_ready: number };
};

export async function identifyNexusVisual(imageUrl: string, hint?: string) {
  return invokeWaouhAgentic<{ identification: Record<string, unknown>; query: string; image_url: string }>(
    "nexus.identify_visual",
    { image_url: imageUrl, ...(hint ? { hint } : {}) },
  );
}

export async function lookupNexusBarcode(code: string) {
  return invokeWaouhAgentic<{
    code: string;
    query: string;
    articles: unknown[];
    catalog: unknown[];
    observations: unknown[];
  }>("nexus.barcode_lookup", { code });
}

export async function getNexusMarketHistory(query: string, city?: string) {
  return invokeWaouhAgentic<{ query: string; points: Array<{
    observed_at: string;
    min_amount?: number | null;
    median_amount?: number | null;
    max_amount?: number | null;
    average_amount?: number | null;
    sample_count?: number;
    source_mix?: Record<string, number>;
  }> }>("nexus.market_history", { query, ...(city ? { city } : {}) });
}

export async function getNexusSources() {
  return invokeWaouhAgentic<NexusSourceStatus>("nexus.sources", {});
}

export async function submitNexusScoutReport(payload: {
  title: string;
  observed_price?: number;
  city?: string;
  place_name?: string;
  source_type?: "field" | "shop" | "market" | "barcode" | "photo" | "receipt" | "partner";
  photo_urls?: string[];
  gtin?: string;
  availability?: "available" | "low_stock" | "out_of_stock" | "unknown";
  note?: string;
}) {
  return invokeWaouhAgentic<{ report: Record<string, unknown> }>("nexus.scout.submit", payload);
}

export async function createNexusBuyerAutopilot(payload: {
  goal: string;
  budget_max?: number;
  city?: string;
}) {
  return invokeWaouhAgentic<{ mode: "buyer"; mission: Record<string, unknown>; watch: Record<string, unknown> }>(
    "nexus.autopilot.create",
    { mode: "buyer", ...payload },
  );
}

export async function createNexusSellerAutopilot(payload: {
  article_id: string;
  goal: string;
  min_price_amount?: number;
  max_discount_percent?: number;
  delivery_zones?: string[];
}) {
  return invokeWaouhAgentic<{ mode: "seller"; article: Record<string, unknown>; policy: Record<string, unknown> }>(
    "nexus.autopilot.create",
    { mode: "seller", ...payload },
  );
}
