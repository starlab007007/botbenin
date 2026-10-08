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
  if (error) throw new Error(error.message || "Votre intérêt n'a pas pu être envoyé. Réessayez.");
  if (data?.error) throw new Error(String(data.error));
  return data as { ok?: boolean; duplicate?: boolean; seller_notified?: boolean };
}

export function nexusSourceLabel(source?: string | null) {
  const value = String(source ?? "").toLowerCase();
  if (value.includes("google_places") || value.includes("maps")) return "Google Maps";
  if (value.includes("facebook")) return "Facebook";
  if (value.includes("instagram")) return "Instagram";
  if (value.includes("telegram")) return "Telegram";
  if (value.includes("tiktok")) return "TikTok";
  if (value.includes("serpapi") || value.includes("web_social")) return "Web public";
  if (value.includes("apify")) return "Apify";
  if (value.includes("sms") || value.includes("rcs")) return "SMS/RCS";
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
  channels?: Record<string, { status: string; label: string; checked_at?: string | null }>;
  providers: Array<{ provider: string; source_key?: string | null; label?: string | null; auth_mode?: string | null; active: boolean; configured?: boolean; reason?: string | null; daily_quota?: number | null; usage_today?: number | null; last_test_at?: string | null; last_test_status?: string | null; last_sync_at?: string | null; last_sync_status?: string | null }>;
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

export type NexusReadinessLevel = "R0" | "R1" | "R2" | "R3" | "R4" | "R5";
export type NexusNextBestAction =
  | "ENRICH"
  | "CONTACT_NOW"
  | "REQUEST_APPROVAL"
  | "OPEN_DEAL_ROOM"
  | "WAIT_REPLY"
  | "FOLLOW_UP"
  | "NEGOTIATE"
  | "EXECUTE"
  | "COMPLETE"
  | "DROP_LOW_QUALITY";

export type NexusContactPack = {
  fabric_id: string;
  source_key?: string | null;
  contactability_level: string;
  readiness_level: NexusReadinessLevel;
  readiness_score: number;
  actionability_score: number;
  next_best_action: NexusNextBestAction;
  best_channel?: string | null;
  available_channels: Array<{
    channel: string;
    score: number;
    verified?: boolean;
    reachable?: boolean | null;
    public_business?: boolean;
    consent_state?: string | null;
    last4?: string | null;
  }>;
  masked_contacts: Array<{ channel: string; last4?: string | null }>;
  verified_channel?: boolean;
  message_template?: string | null;
  entity_id?: string | null;
};

export type NexusAvatarMandate = {
  metrics?: Record<string, number>;
  metadata?: { completion_goal?: string; agreement_reached_at?: string; terms?: Record<string, unknown>; [key: string]: unknown };
  id: string;
  owner_id: string;
  mode: "buy" | "sell" | "ask";
  autonomy_mode: "assisted" | "semi_autonomous" | "autonomous";
  goal: string;
  normalized_query?: string | null;
  city?: string | null;
  budget_max?: number | null;
  max_contacts: number;
  max_followups: number;
  allow_waouh: boolean;
  allow_whatsapp: boolean;
  allow_public_business: boolean;
  allow_blind_message: boolean;
  allow_email: boolean;
  allow_sms_rcs: boolean;
  require_approval_for_c1: boolean;
  min_match_score: number;
  min_actionability_score: number;
  status: "draft" | "active" | "paused" | "completed" | "cancelled" | "expired";
  contacted_count: number;
  replied_count: number;
  qualified_count: number;
  last_run_at?: string | null;
  next_run_at?: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
};

export type NexusPersistentIntent = {
  id: string;
  owner_id: string;
  mandate_id?: string | null;
  mode: NexusDiscoveryMode;
  query_text: string;
  city?: string | null;
  budget_max?: number | null;
  min_match_score: number;
  min_actionability_score: number;
  scan_interval_minutes: number;
  status: "active" | "paused" | "completed" | "cancelled" | "expired";
  last_scan_at?: string | null;
  next_scan_at: string;
  last_result_count: number;
  last_actionable_count: number;
  expires_at?: string | null;
};

export type NexusConversationBusEvent = {
  id: string;
  fabric_id?: string | null;
  journey_id?: string | null;
  mandate_id?: string | null;
  article_id?: string | null;
  thread_id?: string | null;
  negotiation_id?: string | null;
  deal_id?: string | null;
  channel: string;
  direction: "in" | "out" | "system";
  event_type: string;
  status: string;
  payload: Record<string, unknown>;
  created_at: string;
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
  contactability_level?: "C0" | "C1" | "C2" | "C3" | "C4" | "C5" | string;
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
    level: "C0" | "C1" | "C2" | "C3" | "C4" | "C5";
    can_reveal: boolean;
    can_auto_contact: boolean;
    requires_approval: boolean;
    label: string;
  };
  contact_pack?: NexusContactPack;
  readiness_level?: NexusReadinessLevel;
  readiness_score?: number;
  actionability_score?: number;
  next_best_action?: NexusNextBestAction;
  best_channel?: string | null;
};

export type NexusDiscoverySource = {
  health?: string; health_reason?: string; last_verified_at?: string | null;
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

export type NexusSourceSyncProvider =
  | "serpapi"
  | "apify"
  | "firecrawl"
  | "google_places"
  | "facebook_business"
  | "instagram_business"
  | "telegram_public"
  | "tiktok_connected"
  | "whatsapp_groups"
  | "sms_rcs";

export async function syncNexusSource(input: {
  provider: NexusSourceSyncProvider;
  query?: string;
  city?: string;
  mode?: "find_sellers" | "find_buyers";
  limit?: number;
}) {
  return invokeWaouhAgentic<{
    provider: NexusSourceSyncProvider;
    configured: boolean;
    inserted: number;
    push_mode?: boolean;
    active_group_count?: number;
    reason?: string | null;
  }>("nexus.source.sync", input);
}

export async function searchGooglePlacesWithNexus(input: { query: string; city?: string; limit?: number }) {
  return invokeWaouhAgentic<{
    configured: boolean;
    inserted: number;
    results: unknown[];
    reason?: string | null;
  }>("nexus.google_places.search", input);
}

export type NexusOpportunityJourney = {
  id: string;
  fabric_id: string;
  mode: "buy" | "sell" | "ask";
  stage: "discovered" | "enriching" | "contact_ready" | "contacting" | "waiting_reply" | "negotiating" | "agreed" | "executing" | "completed" | "cancelled";
  contactability_level: "C0" | "C1" | "C2" | "C3" | "C4" | "C5";
  progress: number;
  source_key?: string | null;
  source_url?: string | null;
  subject?: string | null;
  contact_channel?: string | null;
  masked_contact?: Record<string, unknown>;
  last_action?: string | null;
  next_action?: string | null;
  last_message?: string | null;
  timeline?: Array<Record<string, unknown>>;
  article_id?: string | null;
  thread_id?: string | null;
  negotiation_id?: string | null;
  deal_id?: string | null;
  mandate_id?: string | null;
  readiness_level?: NexusReadinessLevel;
  readiness_score?: number;
  actionability_score?: number;
  next_best_action?: NexusNextBestAction;
  contact_pack?: NexusContactPack | Record<string, unknown>;
};

export async function startNexusOpportunity(
  fabricId: string,
  mode: "buy" | "sell" | "ask" = "buy",
  mandateId?: string,
) {
  return invokeWaouhAgentic<{
    journey: NexusOpportunityJourney;
    contact_policy: NexusDiscoveryResult["contact_policy"];
    next_action: string;
    internal_article: boolean;
    contact_pack?: NexusContactPack;
    readiness_level?: NexusReadinessLevel;
    actionability_score?: number;
    next_best_action?: NexusNextBestAction;
  }>("nexus.opportunity.start", { fabric_id: fabricId, mode, ...(mandateId ? { mandate_id: mandateId } : {}) });
}

export async function enrichNexusOpportunity(fabricId: string, mode: "buy" | "sell" | "ask" = "buy") {
  return invokeWaouhAgentic<{
    journey: NexusOpportunityJourney;
    contact_policy: NexusDiscoveryResult["contact_policy"];
    public_channels: string[];
    masked_contact: Record<string, unknown>;
    next_action: string;
    contact_pack?: NexusContactPack;
    readiness_level?: NexusReadinessLevel;
    actionability_score?: number;
    next_best_action?: NexusNextBestAction;
  }>("nexus.opportunity.enrich", { fabric_id: fabricId, mode });
}

export async function getNexusOpportunityStatus(input: { journey_id?: string; fabric_id?: string }) {
  return invokeWaouhAgentic<{ journey: NexusOpportunityJourney }>("nexus.opportunity.status", input);
}

export async function listNexusOpportunityJourneys(input: { include_completed?: boolean; limit?: number; mandate_id?: string } = {}) {
  return invokeWaouhAgentic<{
    journeys: NexusOpportunityJourney[];
    items: NexusOpportunityJourney[];
    active_count: number;
  }>("nexus.opportunity.list", {
    include_completed: input.include_completed === true,
    limit: input.limit ?? 20,
  });
}

export async function prepareNexusContact(fabricId: string) {
  return invokeWaouhAgentic<{
    fabric_id: string;
    kind: "external" | "internal";
    source_url?: string | null;
    actor_name?: string | null;
    product_name?: string | null;
    contact_policy: {
      level: "C0" | "C1" | "C2" | "C3" | "C4" | "C5";
      can_reveal: boolean;
      can_auto_contact: boolean;
      requires_approval: boolean;
      can_blind_message?: boolean;
      can_user_confirm_contact?: boolean;
      label: string;
    };
    contact_pack?: NexusContactPack;
    readiness_level?: NexusReadinessLevel;
    actionability_score?: number;
    next_best_action?: NexusNextBestAction;
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
  mandate_id?: string;
}) {
  return invokeWaouhAgentic<{
    queued: boolean;
    blind?: boolean;
    approval_id?: string;
    channel: string;
    contactability_level: string;
    phone_last4?: string | null;
    journey?: NexusOpportunityJourney | null;
    next_action?: string | null;
  }>("nexus.contact.send", input);
}


export async function getNexusContactPack(fabricId: string) {
  return invokeWaouhAgentic<{
    contact_pack: NexusContactPack;
    contact_policy: NexusDiscoveryResult["contact_policy"];
  }>("nexus.contact_pack.get", { fabric_id: fabricId });
}

export async function listNexusOwnedArticles() {
  return invokeWaouhAgentic<{ articles: Array<{ id: string; title: string; price: number }> }>("nexus.owned_articles", {});
}

export async function createNexusMandate(payload: {
  article_id?: string;
  price_floor?: number;
  completion_goal?: "transaction" | "agreement" | "recommendations";
  quantity?: number; delivery_terms?: string; acceptance_terms?: string;
  mode: "buy" | "sell" | "ask";
  goal: string;
  autonomy_mode?: "assisted" | "semi_autonomous" | "autonomous";
  city?: string;
  budget_max?: number;
  max_contacts?: number;
  max_followups?: number;
  duration_hours?: number;
  scan_interval_minutes?: number;
  min_match_score?: number;
  min_actionability_score?: number;
  allow_waouh?: boolean;
  allow_whatsapp?: boolean;
  allow_public_business?: boolean;
  allow_blind_message?: boolean;
  allow_email?: boolean;
  allow_sms_rcs?: boolean;
  origin_surface?: string;
}) {
  return invokeWaouhAgentic<{
    mandate: NexusAvatarMandate;
    intent: NexusPersistentIntent;
    results: NexusDiscoveryResult[];
    actionable_count: number;
  }>("nexus.mandate.create", payload);
}

export async function listNexusMandates() {
  return invokeWaouhAgentic<{
    mandates: NexusAvatarMandate[];
    intents: NexusPersistentIntent[];
  }>("nexus.mandate.list", {});
}

export async function updateNexusMandate(
  mandateId: string,
  patch: Partial<Pick<
    NexusAvatarMandate,
    "status" | "autonomy_mode" | "max_contacts" | "max_followups" |
    "min_match_score" | "min_actionability_score" | "allow_waouh" |
    "allow_whatsapp" | "allow_public_business" | "allow_blind_message" |
    "allow_email" | "allow_sms_rcs"
  >> & { duration_hours?: number; completion_goal?: "transaction" | "agreement" | "recommendations" },
) {
  return invokeWaouhAgentic<{ mandate: NexusAvatarMandate }>(
    "nexus.mandate.update",
    { mandate_id: mandateId, ...patch },
  );
}

export async function runNexusMandate(mandateId: string) {
  return invokeWaouhAgentic<{
    mandate: NexusAvatarMandate;
    results: NexusDiscoveryResult[];
    actionable_count: number;
  }>("nexus.mandate.run", { mandate_id: mandateId });
}

export async function listNexusConversationBus(input: { fabric_id?: string; thread_id?: string; limit?: number } = {}) {
  return invokeWaouhAgentic<{ events: NexusConversationBusEvent[] }>(
    "nexus.conversation_bus.list",
    input,
  );
}

export async function bindNexusJourneyArticle(journeyId: string, articleId: string) {
  return invokeWaouhAgentic("nexus.opportunity.bind_article", { journey_id: journeyId, article_id: articleId });
}
