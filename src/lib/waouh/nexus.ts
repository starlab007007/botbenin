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
  return data as {
    ok?: boolean;
    duplicate?: boolean;
    seller_notified?: boolean;
    skipped?: string;
    article_id?: string | null;
    buyer_user_id?: string | null;
    seller_user_id?: string | null;
    thread_id?: string | null;
    negotiation_id?: string | null;
    title?: string | null;
    price?: number | null;
  };
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
  providers: Array<{ provider: string; active: boolean; configured?: boolean; daily_quota?: number | null; usage_today?: number | null; last_test_at?: string | null; last_test_status?: string | null }>;
  registry?: NexusDiscoverySource[];
  fabric?: { total: number; by_source: Record<string, number>; by_intent: Record<string, number>; by_contactability: Record<string, number> };
  offers: Record<string, number>;
  demands: Record<string, number>;
  radar: { sources: Record<string, number>; intents: Record<string, number>; contacts_ready: number };
  google_places?: { configured: boolean };
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


export type NexusDiscoveryMode = "auto" | "find_sellers" | "find_buyers";
export type NexusResolvedDiscoveryMode = Exclude<NexusDiscoveryMode, "auto">;

export type NexusSmartDiscoveryPlan = {
  mode: NexusResolvedDiscoveryMode;
  normalized_query: string;
  city?: string | null;
  budget_max?: number | null;
  priorities: string[];
  source_families: string[];
  missing: string[];
  next_actions: string[];
  confidence: number;
  rationale: string;
};

export type NexusDiscoveryResult = {
  fabric_id: string;
  source_record_id?: string | null;
  source_key: string;
  intent: "BUY" | "SELL" | "ANNOUNCE" | "RFQ" | string;
  actor_type?: string | null;
  subject?: string | null;
  raw_text?: string | null;
  category?: string | null;
  brand?: string | null;
  model?: string | null;
  condition?: string | null;
  price_min?: number | null;
  price_max?: number | null;
  currency?: string | null;
  city?: string | null;
  canonical_key?: string | null;
  contactability_level?: "C0" | "C1" | "C2" | "C3" | "C4" | string;
  trust_score?: number | null;
  observed_at?: string | null;
  source_url?: string | null;
  evidence?: Record<string, unknown> | null;
  scores: {
    total_score: number;
    relevance_score: number;
    intent_score: number;
    trust_score: number;
    price_score: number;
    location_score: number;
    freshness_score: number;
    contactability_score: number;
    reasons: string[];
  };
  contact_policy: {
    level: "C0" | "C1" | "C2" | "C3" | "C4";
    can_reveal: boolean;
    can_auto_contact: boolean;
    requires_approval: boolean;
    label: string;
  };
};

export type NexusDiscoverySource = {
  source_key: string;
  label: string;
  family: string;
  connector_mode: string;
  operational_state: "live" | "requires_config" | "ingest_only" | "planned" | "disabled";
  configured: boolean;
  reason?: string | null;
  supports_buy: boolean;
  supports_sell: boolean;
  supports_business: boolean;
  supports_contact: boolean;
  default_contactability: string;
  capabilities?: Record<string, unknown>;
  signal_count: number;
};

export async function globalNexusDiscovery(input: {
  query: string;
  mode?: NexusDiscoveryMode;
  city?: string;
  budget_max?: number;
  limit?: number;
  refresh_external?: boolean;
  smart?: boolean;
}) {
  return invokeWaouhAgentic<{
    requested_mode?: NexusDiscoveryMode;
    mode: NexusResolvedDiscoveryMode;
    query: string;
    normalized_query?: string;
    city?: string | null;
    budget_max?: number | null;
    results: NexusDiscoveryResult[];
    source_mix: Record<string, number>;
    refresh: Record<string, {
      configured?: boolean;
      inserted?: number;
      reason?: string | null;
      surfaces?: Record<string, number>;
    }>;
    intelligence?: NexusSmartDiscoveryPlan;
    explanation?: string;
  }>("nexus.global_discovery", { mode: "auto", smart: true, ...input });
}

export async function ingestSharedCommerceSignal(input: {
  raw_text?: string;
  image_url?: string;
  source_url?: string;
  origin_surface?: "whatsapp" | "facebook" | "instagram" | "tiktok" | "telegram" | "web" | "b2b" | "other" | string;
  source_key?: "share_to_waouh" | "b2b_rfq";
  evidence?: Record<string, unknown>;
}) {
  return invokeWaouhAgentic<{
    signal: {
      id: string;
      source_key: string;
      intent: string;
      actor_type: string;
      product_name?: string | null;
      category?: string | null;
      price_min?: number | null;
      price_max?: number | null;
      city?: string | null;
      confidence: number;
      contactability_level: string;
    };
    entity: { id: string; entity_type: string; primary_name?: string | null; verification_state: string; trust_score: number };
    contact_policy: { level: string; can_reveal: boolean; can_auto_contact: boolean; requires_approval: boolean; label: string };
  }>("nexus.signal.ingest", {
    source_key: input.source_key ?? "share_to_waouh",
    ...input,
  });
}

export async function searchGooglePlacesWithNexus(input: { query: string; city?: string; limit?: number }) {
  return invokeWaouhAgentic<{
    configured: boolean;
    inserted: number;
    results: unknown[];
    reason?: string | null;
  }>("nexus.google_places.search", input);
}

export async function prepareNexusContact(fabricId: string) {
  return invokeWaouhAgentic<{
    fabric_id: string;
    kind: "external" | "internal";
    source_url?: string | null;
    actor_name?: string | null;
    product_name?: string | null;
    contact_policy: {
      level: "C0" | "C1" | "C2" | "C3" | "C4";
      can_reveal: boolean;
      can_auto_contact: boolean;
      requires_approval: boolean;
      can_blind_message?: boolean;
      label: string;
    };
    contacts: Array<{
      id: string;
      channel: string;
      value: string;
      value_last4?: string | null;
      contactability_level: string;
      consent_state: string;
      is_public_business: boolean;
      can_auto_contact: boolean;
    }>;
    note?: string;
  }>("nexus.contact.prepare", { fabric_id: fabricId });
}

export async function sendNexusDiscoveryContact(input: {
  fabric_id: string;
  message: string;
  confirmed: true;
}) {
  return invokeWaouhAgentic<{
    queued: boolean;
    blind?: boolean;
    approval_id?: string;
    channel: string;
    contactability_level: string;
    phone_last4?: string | null;
  }>("nexus.contact.send", input);
}
