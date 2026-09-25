import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.49.8";
import {
  getRequestUser,
  jsonResponse,
  waouhCorsHeaders,
} from "../_shared/waouh-auth.ts";
import { chatCompletion, visionCompletion } from "../_shared/agent-ai.ts";
import { encryptPhone, decryptPhone, hashPhone, sha256Hex } from "../_shared/waouh-tel/crypto.ts";
import { normalizeE164, phoneLast4 } from "../_shared/waouh-tel/phone.ts";
import {
  getRadarApiKey,
  getRadarProviderConfig,
  incrementRadarUsage,
  markRadarProviderSync,
} from "../_shared/radar-api-config.ts";
import { rehostMedia } from "../_shared/waouhContact.ts";
import {
  contactabilityPolicy,
  extractPublicContactHints,
  normalizeFabricText,
  redactPublicContacts,
  scoreFabricSignal,
  safeSourceUrl as safeFabricSourceUrl,
  type Contactability,
  type FabricSignal,
} from "../_shared/waouh-signal-fabric.ts";
import {
  marketStats,
  nexusTokens,
  rankArticle,
  rankBuyer,
  type ArticleLike,
  type BuyerLike,
  type NexusWeights,
} from "../_shared/waouh-nexus.ts";

type JsonObject = Record<string, unknown>;

const ALLOWED_APPROVAL_ACTIONS = new Set([
  "external_browse",
  "send_message",
  "publish_listing",
  "share_contact",
  "negotiate_offer",
  "accept_offer",
  "create_watch",
  "access_location",
  "use_media",
  "seller_policy_change",
]);
const PAYMENT_PATTERN = /(payment|checkout|purchase|payer|paiement|momo|stripe|kkiapay|fedapay)/i;

class ApiError extends Error {
  constructor(public status: number, public code: string, message?: string) {
    super(message ?? code);
  }
}

function errorResponse(status: number, code: string, message?: string) {
  return jsonResponse({
    ok: false,
    error: { code, message: message ?? code },
  }, status);
}

function asObject(value: unknown, name = "payload"): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(422, "invalid_payload", `${name} must be an object`);
  }
  return value as JsonObject;
}

function asString(value: unknown, name: string, min = 1, max = 2_000): string {
  if (typeof value !== "string") throw new ApiError(422, `invalid_${name}`);
  const result = value.trim();
  if (result.length < min || result.length > max) throw new ApiError(422, `invalid_${name}`);
  return result;
}

function optionalString(value: unknown, name: string, max = 2_000): string | null {
  if (value == null || value === "") return null;
  return asString(value, name, 1, max);
}

function uuid(value: unknown, name: string): string {
  const result = asString(value, name, 36, 36);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result)) {
    throw new ApiError(422, `invalid_${name}`);
  }
  return result;
}

function positiveNumber(value: unknown, name: string, optional = false): number | null {
  if (optional && (value == null || value === "")) return null;
  const result = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(result) || result < 0) throw new ApiError(422, `invalid_${name}`);
  return result;
}

function integer(value: unknown, name: string, fallback: number, min: number, max: number): number {
  if (value == null) return fallback;
  const result = Number(value);
  if (!Number.isInteger(result) || result < min || result > max) throw new ApiError(422, `invalid_${name}`);
  return result;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function jsonObject(value: unknown, name: string): JsonObject {
  if (value == null) return {};
  return asObject(value, name);
}

function stringArray(value: unknown, name: string, max = 50): string[] {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > max) throw new ApiError(422, `invalid_${name}`);
  return value.map((entry) => asString(entry, name, 1, 160));
}

function isoDate(value: unknown, name: string): string | null {
  if (value == null || value === "") return null;
  const raw = asString(value, name, 10, 64);
  const timestamp = Date.parse(raw);
  if (!Number.isFinite(timestamp)) throw new ApiError(422, `invalid_${name}`);
  return new Date(timestamp).toISOString();
}

function cursor(value: unknown): string | null {
  return isoDate(value, "cursor");
}

function safeUrl(value: unknown, name: string): string | null {
  const raw = optionalString(value, name, 2_048);
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("protocol");
    return parsed.toString();
  } catch {
    throw new ApiError(422, `invalid_${name}`);
  }
}

function pickEnum<T extends string>(value: unknown, name: string, allowed: readonly T[], fallback?: T): T {
  if (value == null && fallback) return fallback;
  if (typeof value !== "string" || !allowed.includes(value as T)) throw new ApiError(422, `invalid_${name}`);
  return value as T;
}

function ensureNoFinancialAction(action: string, payload: JsonObject) {
  const containsFinancialDirective = (value: unknown, parentKey = ""): boolean => {
    if (PAYMENT_PATTERN.test(parentKey)) return true;
    if (Array.isArray(value)) return value.some((entry) => containsFinancialDirective(entry, parentKey));
    if (value && typeof value === "object") {
      return Object.entries(value as JsonObject).some(([key, entry]) => containsFinancialDirective(entry, key));
    }
    return typeof value === "string"
      && ["action_type", "tool_name", "operation", "provider"].includes(parentKey)
      && PAYMENT_PATTERN.test(value);
  };
  if (PAYMENT_PATTERN.test(action) || containsFinancialDirective(payload)) {
    throw new ApiError(422, "financial_action_not_supported", "Payments are intentionally outside this API");
  }
}

async function queryOne<T>(promise: PromiseLike<{ data: T | null; error: { message: string } | null }>, code: string): Promise<T> {
  const { data, error } = await promise;
  if (error) throw new ApiError(500, code, error.message);
  if (!data) throw new ApiError(404, code);
  return data;
}

async function ownedArticle(sb: SupabaseClient, authUserId: string, articleId: string) {
  const article = await queryOne<any>(
    sb.from("waouh_articles").select("id,seller_id,title,price,currency,status").eq("id", articleId).maybeSingle(),
    "article_not_found",
  );
  const seller = await queryOne<any>(
    sb.from("waouh_users").select("id,auth_user_id").eq("id", article.seller_id).maybeSingle(),
    "seller_not_found",
  );
  if (seller.auth_user_id !== authUserId) throw new ApiError(403, "article_not_owned");
  return article;
}

async function ownedBusiness(sb: SupabaseClient, authUserId: string, businessId: string) {
  const business = await queryOne<any>(
    sb.from("waouh_partner_businesses").select("id,partner_id,nom_entreprise,statut").eq("id", businessId).maybeSingle(),
    "business_not_found",
  );
  const partner = await queryOne<any>(
    sb.from("waouh_partners").select("id,user_id").eq("id", business.partner_id).maybeSingle(),
    "partner_not_found",
  );
  if (partner.user_id !== authUserId) throw new ApiError(403, "business_not_owned");
  return business;
}

async function ownedMission(sb: SupabaseClient, authUserId: string, missionId: string) {
  const mission = await queryOne<any>(
    sb.from("waouh_agent_missions").select("*").eq("id", missionId).maybeSingle(),
    "mission_not_found",
  );
  if (mission.owner_id !== authUserId) throw new ApiError(403, "mission_not_owned");
  return mission;
}

async function audit(
  sb: SupabaseClient,
  ownerId: string,
  eventType: string,
  entityType: string,
  entityId: string | null,
  details: JsonObject = {},
  missionId: string | null = null,
  actorId: string | null = ownerId,
  actorType: "user" | "agent" | "worker" | "system" = "user",
) {
  const { error } = await sb.from("waouh_agent_audit_log").insert({
    owner_id: ownerId,
    actor_id: actorId,
    actor_type: actorType,
    mission_id: missionId,
    event_type: eventType,
    entity_type: entityType,
    entity_id: entityId,
    details,
  });
  if (error) throw new ApiError(500, "audit_write_failed", error.message);
}

async function enqueue(
  sb: SupabaseClient,
  ownerId: string,
  eventType: string,
  aggregateType: string,
  aggregateId: string,
  payload: JsonObject,
  dedupeKey: string,
  missionId: string | null = null,
) {
  const { error } = await sb.from("waouh_agent_outbox").upsert({
    owner_id: ownerId,
    mission_id: missionId,
    event_type: eventType,
    aggregate_type: aggregateType,
    aggregate_id: aggregateId,
    payload,
    dedupe_key: dedupeKey,
  }, { onConflict: "dedupe_key", ignoreDuplicates: true });
  if (error) throw new ApiError(500, "outbox_write_failed", error.message);
}

function listMeta(rows: any[], limit: number) {
  return rows.length === limit ? rows[rows.length - 1]?.created_at ?? null : null;
}

function nexusWeights(row: any): Partial<NexusWeights> {
  if (!row) return {};
  return {
    relevance: Number(row.relevance_weight ?? 0.30),
    price: Number(row.price_weight ?? 0.24),
    trust: Number(row.trust_weight ?? 0.18),
    location: Number(row.location_weight ?? 0.10),
    freshness: Number(row.freshness_weight ?? 0.10),
    availability: Number(row.availability_weight ?? 0.08),
  };
}

async function getNexusPreference(sb: SupabaseClient, ownerId: string) {
  const { data, error } = await sb.from("waouh_nexus_preferences")
    .select("*").eq("owner_id", ownerId).maybeSingle();
  if (error && !/does not exist/i.test(error.message)) {
    throw new ApiError(500, "nexus_preferences_failed", error.message);
  }
  return data ?? null;
}

async function getOrCreateNexusUser(
  sb: SupabaseClient,
  ownerId: string,
  fallbackName: string,
) {
  const { data: existing, error } = await sb.from("waouh_users")
    .select("id,auth_user_id,display_name,city,reputation,sales_count,is_verified")
    .eq("auth_user_id", ownerId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new ApiError(500, "nexus_user_lookup_failed", error.message);
  if (existing) return existing;
  return await queryOne<any>(
    sb.from("waouh_users").insert({
      auth_user_id: ownerId,
      display_name: fallbackName || "Utilisateur WAOUH",
      channel: "web",
    }).select("id,auth_user_id,display_name,city,reputation,sales_count,is_verified").single(),
    "nexus_user_create_failed",
  );
}

function nexusAdvice(item: any, market: ReturnType<typeof marketStats>) {
  const price = Number(item.price ?? 0);
  const parts: string[] = [];
  if (market.median != null && price > 0) {
    const delta = ((price - market.median) / Math.max(market.median, 1)) * 100;
    if (delta <= -8) parts.push(`Prix ${Math.abs(Math.round(delta))}% sous la médiane observée.`);
    else if (delta >= 8) parts.push(`Prix ${Math.round(delta)}% au-dessus de la médiane observée.`);
    else parts.push("Prix proche de la médiane observée.");
  }
  if (item.scores?.trust_score >= 75) parts.push("Confiance vendeur élevée.");
  if (item.scores?.location_score >= 90) parts.push("Option locale.");
  if (item.scores?.freshness_score >= 90) parts.push("Annonce récente.");
  return parts.join(" ") || "Option compatible avec votre besoin.";
}

type NexusIntent = {
  product?: string | null;
  category?: string | null;
  brand?: string | null;
  model?: string | null;
  condition?: string | null;
  city?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  priorities?: string[];
  keywords?: string[];
};

async function enrichNexusIntent(query: string, defaults: NexusIntent): Promise<NexusIntent> {
  try {
    const raw = await chatCompletion({
      jsonMode: true,
      temperature: 0.1,
      system: `Tu es le parseur d'intention commerce de WAOUH au Bénin.
Retourne uniquement un JSON compact avec: product, category, brand, model, condition, city, budget_min, budget_max, priorities, keywords.
- Montants en FCFA numériques, sans symbole.
- N'invente pas un champ absent ou non déductible: null.
- priorities parmi: price, trust, distance, speed, condition, warranty.
- keywords: 2 à 8 termes utiles pour retrouver le même produit malgré une annonce mal écrite.
- Aucun paiement, aucune donnée personnelle.`,
      messages: [{ role: "user", content: query }],
    });
    const parsed = JSON.parse(raw);
    const n = (value: unknown) => {
      if (value == null || value === "") return null;
      const candidate = Number(value);
      return Number.isFinite(candidate) && candidate >= 0 ? candidate : null;
    };
    const s = (value: unknown, max = 160) =>
      typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
    const list = (value: unknown) =>
      Array.isArray(value) ? value.filter((item) => typeof item === "string").map((item) => item.trim().slice(0, 80)).filter(Boolean).slice(0, 8) : [];
    return {
      product: s(parsed.product) ?? defaults.product ?? null,
      category: s(parsed.category) ?? defaults.category ?? null,
      brand: s(parsed.brand) ?? defaults.brand ?? null,
      model: s(parsed.model) ?? defaults.model ?? null,
      condition: s(parsed.condition) ?? defaults.condition ?? null,
      city: s(parsed.city) ?? defaults.city ?? null,
      budget_min: n(parsed.budget_min) ?? defaults.budget_min ?? null,
      budget_max: n(parsed.budget_max) ?? defaults.budget_max ?? null,
      priorities: list(parsed.priorities),
      keywords: list(parsed.keywords),
    };
  } catch (error) {
    console.warn("[waouh-nexus] AI intent enrichment fallback", error instanceof Error ? error.message : error);
    return defaults;
  }
}


type DiscoveryMode = "find_sellers" | "find_buyers";

type NexusSmartDiscoveryPlan = {
  mode: DiscoveryMode;
  normalized_query: string;
  city: string | null;
  budget_max: number | null;
  priorities: string[];
  source_families: string[];
  missing: string[];
  next_actions: string[];
  confidence: number;
  rationale: string;
};

async function planNexusGoal(
  goal: string,
  hints: { mode?: DiscoveryMode | null; city?: string | null; budgetMax?: number | null } = {},
): Promise<NexusSmartDiscoveryPlan> {
  const sellSignals = /\b(je\s+vends?|vendre|à\s+vendre|ecouler|écouler|trouver\s+(?:des\s+)?acheteurs?|clients?|prospects?|preneurs?)\b/i;
  const fallbackMode: DiscoveryMode = hints.mode ?? (sellSignals.test(goal) ? "find_buyers" : "find_sellers");
  const fallbackSources = fallbackMode === "find_buyers"
    ? ["waouh", "partners", "whatsapp_shared", "web_public", "social_public", "b2b_rfq", "scout"]
    : ["waouh", "partners", "whatsapp_shared", "maps", "web_public", "social_public", "directories", "scout"];
  const fallback: NexusSmartDiscoveryPlan = {
    mode: fallbackMode,
    normalized_query: goal.trim().slice(0, 700),
    city: hints.city ?? null,
    budget_max: hints.budgetMax ?? null,
    priorities: ["relevance", "trust", "price", "distance", "freshness", "contactability"],
    source_families: fallbackSources,
    missing: [
      ...(hints.city ? [] : ["zone"]),
      ...(hints.budgetMax != null || fallbackMode === "find_buyers" ? [] : ["budget"]),
    ],
    next_actions: fallbackMode === "find_buyers"
      ? ["Comparer les demandes actives", "Prioriser les acheteurs contactables", "Préparer une prise de contact sous contrôle"]
      : ["Comparer les offres", "Vérifier prix, confiance et proximité", "Préparer le meilleur contact sous contrôle"],
    confidence: 0.55,
    rationale: fallbackMode === "find_buyers"
      ? "Objectif interprété comme une recherche d’acheteurs ou de demandes."
      : "Objectif interprété comme une recherche de vendeurs ou d’offres.",
  };

  try {
    const raw = await chatCompletion({
      jsonMode: true,
      temperature: 0.08,
      system: [
        "Tu es le planificateur commercial NEXUS de WAOUH pour le Bénin et l'Afrique de l'Ouest.",
        "Retourne uniquement un JSON compact avec: mode, normalized_query, city, budget_max, priorities, source_families, missing, next_actions, confidence, rationale.",
        "mode doit être find_sellers ou find_buyers.",
        "find_sellers = l'utilisateur veut acheter, trouver une offre, un fournisseur ou un vendeur.",
        "find_buyers = l'utilisateur veut vendre, écouler, trouver des clients, acheteurs, demandes ou RFQ.",
        "Si un mode imposé est fourni, respecte-le.",
        "normalized_query doit être courte, commerciale et utile à la recherche, sans inventer marque/modèle/quantité.",
        "source_families uniquement parmi: waouh, partners, whatsapp_shared, maps, web_public, social_public, directories, b2b_rfq, scout, voice, barcode, qr, sms_rcs, ussd.",
        "N'ordonne jamais de scraper des espaces privés. Réseaux fermés: API officielle, partage utilisateur ou connecteur autorisé.",
        "Aucune donnée personnelle inventée. Aucun paiement autonome.",
        "priorities: 3 à 6 critères utiles parmi relevance, trust, price, distance, freshness, contactability, availability, speed.",
        "missing: seulement les informations réellement utiles qui manquent.",
        "next_actions: 2 à 4 actions courtes et concrètes.",
        "confidence entre 0 et 1."
      ].join("\n"),
      messages: [{
        role: "user",
        content: JSON.stringify({
          goal: goal.slice(0, 1800),
          mode_hint: hints.mode ?? null,
          city_hint: hints.city ?? null,
          budget_max_hint: hints.budgetMax ?? null,
        }),
      }],
    });
    const parsed = JSON.parse(raw);
    const txt = (value: unknown, max = 700) =>
      typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
    const num = (value: unknown) => {
      if (value == null || value === "") return null;
      const n = Number(value);
      return Number.isFinite(n) && n >= 0 ? n : null;
    };
    const list = (value: unknown, max = 8) =>
      Array.isArray(value)
        ? value.filter((item) => typeof item === "string")
            .map((item) => item.trim().slice(0, 120))
            .filter(Boolean)
            .slice(0, max)
        : [];
    const aiMode = ["find_sellers", "find_buyers"].includes(String(parsed.mode))
      ? String(parsed.mode) as DiscoveryMode
      : fallback.mode;
    const allowedSources = new Set([
      "waouh", "partners", "whatsapp_shared", "maps", "web_public", "social_public",
      "directories", "b2b_rfq", "scout", "voice", "barcode", "qr", "sms_rcs", "ussd",
    ]);
    const sourceFamilies = list(parsed.source_families, 12).filter((item) => allowedSources.has(item));
    const priorities = list(parsed.priorities, 6);
    const nextActions = list(parsed.next_actions, 4);
    const confidence = Number(parsed.confidence);
    return {
      mode: hints.mode ?? aiMode,
      normalized_query: txt(parsed.normalized_query) ?? fallback.normalized_query,
      city: hints.city ?? txt(parsed.city, 120) ?? fallback.city,
      budget_max: hints.budgetMax ?? num(parsed.budget_max) ?? fallback.budget_max,
      priorities: priorities.length ? priorities : fallback.priorities,
      source_families: sourceFamilies.length ? sourceFamilies : fallback.source_families,
      missing: list(parsed.missing, 6),
      next_actions: nextActions.length ? nextActions : fallback.next_actions,
      confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : fallback.confidence,
      rationale: txt(parsed.rationale, 500) ?? fallback.rationale,
    };
  } catch (error) {
    console.warn("[waouh-nexus] smart discovery planning fallback", error instanceof Error ? error.message : error);
    return fallback;
  }
}


function contactabilityFromBasis(
  sourceDefault: string,
  basis: string,
  isPublicBusiness: boolean,
): Contactability {
  if (basis === "partner_contract") return "C4";
  if (basis === "opt_in") return "C3";
  if (basis === "initiated") return "C2";
  if (basis === "public_business" || isPublicBusiness) return "C1";
  return (["C0","C1","C2","C3","C4"].includes(sourceDefault) ? sourceDefault : "C0") as Contactability;
}

function actorRoleFromIntent(intent: string, actorType?: string | null) {
  if (actorType && ["buyer","seller","announcer","business","broker","scout"].includes(actorType)) return actorType;
  if (intent === "BUY" || intent === "RFQ") return "buyer";
  if (intent === "SELL") return "seller";
  return "announcer";
}

async function extractSignalIntent(
  rawText: string,
  expectedIntent?: "BUY" | "SELL" | "ANNOUNCE" | "RFQ" | null,
) {
  const fallbackIntent = expectedIntent ?? (/\b(cherche|recherche|besoin|wanted|looking for|demande de cotation|appel d.?offres)\b/i.test(rawText) ? "BUY" : "UNKNOWN");
  try {
    const raw = await chatCompletion({
      jsonMode: true,
      temperature: 0.05,
      system: `Tu es le normaliseur de signaux commerciaux de WAOUH.
Analyse un contenu volontairement partagé ou public et retourne uniquement JSON:
{
  "intent":"BUY|SELL|ANNOUNCE|RFQ|UNKNOWN",
  "actor_type":"buyer|seller|announcer|business|broker|unknown",
  "actor_name":string|null,
  "actor_handle":string|null,
  "product_name":string|null,
  "category":string|null,
  "brand":string|null,
  "model":string|null,
  "condition":string|null,
  "quantity":number|null,
  "unit":string|null,
  "price_min":number|null,
  "price_max":number|null,
  "city":string|null,
  "country_code":string|null,
  "availability":"available|low_stock|out_of_stock|unknown"|null,
  "confidence":number
}
Règles:
- Ne fabrique jamais un téléphone, email, nom, prix ou localisation absent.
- confidence entre 0 et 1.
- Montants en FCFA quand la devise est identifiable.
- ANNOUNCE = information commerciale sans intention BUY/SELL suffisamment certaine.
- RFQ = demande professionnelle de devis/fournisseur.
- expected_intent=${expectedIntent ?? "aucun"} est un indice, pas une obligation.`,
      messages: [{ role: "user", content: rawText.slice(0, 12000) }],
    });
    const parsed = JSON.parse(raw);
    const text = (value: unknown, max = 240) => typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
    const number = (value: unknown) => {
      const n = Number(value);
      return Number.isFinite(n) && n >= 0 ? n : null;
    };
    const intent = ["BUY","SELL","ANNOUNCE","RFQ","UNKNOWN"].includes(String(parsed.intent))
      ? String(parsed.intent) : fallbackIntent;
    return {
      intent,
      actor_type: actorRoleFromIntent(intent, text(parsed.actor_type, 40)),
      actor_name: text(parsed.actor_name),
      actor_handle: text(parsed.actor_handle),
      product_name: text(parsed.product_name),
      category: text(parsed.category, 120),
      brand: text(parsed.brand, 120),
      model: text(parsed.model, 120),
      condition: text(parsed.condition, 120),
      quantity: number(parsed.quantity),
      unit: text(parsed.unit, 80),
      price_min: number(parsed.price_min),
      price_max: number(parsed.price_max),
      city: text(parsed.city, 120),
      country_code: text(parsed.country_code, 2) ?? "BJ",
      availability: ["available","low_stock","out_of_stock","unknown"].includes(String(parsed.availability))
        ? String(parsed.availability) : null,
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence ?? 0.5))),
    };
  } catch (error) {
    console.warn("[waouh-signal-fabric] AI extraction fallback", error instanceof Error ? error.message : error);
    return {
      intent: fallbackIntent,
      actor_type: actorRoleFromIntent(fallbackIntent),
      actor_name: null,
      actor_handle: null,
      product_name: null,
      category: null,
      brand: null,
      model: null,
      condition: null,
      quantity: null,
      unit: null,
      price_min: null,
      price_max: null,
      city: null,
      country_code: "BJ",
      availability: null,
      confidence: 0.25,
    };
  }
}

async function resolveCommerceEntity(
  sb: SupabaseClient,
  input: {
    sourceKey: string;
    actorType: string;
    actorName?: string | null;
    actorHandle?: string | null;
    city?: string | null;
    contactPhones?: string[];
    whatsappPhones?: string[];
    contactEmails?: string[];
    contactability: Contactability;
    consentBasis: string;
    isPublicBusiness: boolean;
  },
) {
  const normalizedWhatsapp = [...new Set(
    (input.whatsappPhones ?? [])
      .map((phone) => normalizeE164(phone))
      .filter((phone): phone is string => !!phone),
  )];
  const whatsappSet = new Set(normalizedWhatsapp);
  const normalizedPhones = [...new Set([
    ...(input.contactPhones ?? [])
      .map((phone) => normalizeE164(phone))
      .filter((phone): phone is string => !!phone),
    ...normalizedWhatsapp,
  ])];
  const phoneHashes: string[] = [];
  for (const phone of normalizedPhones) phoneHashes.push(await hashPhone(phone));

  let entity: any = null;
  if (phoneHashes.length) {
    const { data: contactMatches, error: contactLookupError } = await sb.from("waouh_entity_contacts")
      .select("entity_id").in("value_hash", phoneHashes).limit(1);
    if (contactLookupError) throw new ApiError(500, "nexus_entity_contact_lookup_failed", contactLookupError.message);
    if (contactMatches?.[0]?.entity_id) {
      const { data, error } = await sb.from("waouh_commerce_entities").select("*")
        .eq("id", contactMatches[0].entity_id).maybeSingle();
      if (error) throw new ApiError(500, "nexus_entity_lookup_failed", error.message);
      entity = data;
    }
  }

  const canonicalKey = input.actorName
    ? normalizeFabricText(`${input.actorName} ${input.city ?? ""}`).replace(/\s+/g, "-").slice(0, 240)
    : null;
  if (!entity && canonicalKey) {
    const { data, error } = await sb.from("waouh_commerce_entities").select("*")
      .eq("canonical_key", canonicalKey).order("last_seen_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw new ApiError(500, "nexus_entity_key_lookup_failed", error.message);
    entity = data;
  }

  if (!entity) {
    entity = await queryOne<any>(
      sb.from("waouh_commerce_entities").insert({
        entity_type: ["person","business","organization","broker","announcer","scout"].includes(input.actorType)
          ? input.actorType : "unknown",
        primary_name: input.actorName ?? input.actorHandle ?? null,
        canonical_key: canonicalKey,
        city: input.city ?? null,
        country_code: "BJ",
        verification_state: input.consentBasis === "partner_contract" ? "partner_verified"
          : input.isPublicBusiness ? "source_verified" : "unverified",
        trust_score: input.isPublicBusiness ? 70 : 50,
        source_keys: [input.sourceKey],
        metadata: input.actorHandle ? { primary_handle: input.actorHandle } : {},
      }).select("*").single(),
      "nexus_entity_create_failed",
    );
  } else {
    const sourceKeys = [...new Set([...(Array.isArray(entity.source_keys) ? entity.source_keys : []), input.sourceKey])];
    const { data, error } = await sb.from("waouh_commerce_entities").update({
      source_keys: sourceKeys,
      last_seen_at: new Date().toISOString(),
      primary_name: entity.primary_name ?? input.actorName ?? input.actorHandle ?? null,
      city: entity.city ?? input.city ?? null,
    }).eq("id", entity.id).select("*").single();
    if (error) throw new ApiError(500, "nexus_entity_update_failed", error.message);
    entity = data;
  }

  for (let index = 0; index < normalizedPhones.length; index++) {
    const phone = normalizedPhones[index];
    const hash = phoneHashes[index];
    const encrypted = await encryptPhone(phone);
    const { data: existing, error: existingError } = await sb.from("waouh_entity_contacts")
      .select("id").eq("entity_id", entity.id)
      .eq("channel", whatsappSet.has(phone) || input.sourceKey === "whatsapp" || input.sourceKey === "whatsapp_groups" ? "whatsapp" : "phone")
      .eq("value_hash", hash).maybeSingle();
    if (existingError) throw new ApiError(500, "nexus_contact_lookup_failed", existingError.message);
    const values = {
      source_key: input.sourceKey,
      value_encrypted: encrypted,
      value_hash: hash,
      value_last4: phoneLast4(phone),
      is_public_business: input.isPublicBusiness,
      consent_state: input.consentBasis,
      contactability_level: input.contactability,
      verified_at: input.isPublicBusiness || ["opt_in","partner_contract","initiated"].includes(input.consentBasis)
        ? new Date().toISOString() : null,
    };
    if (existing?.id) {
      const { error } = await sb.from("waouh_entity_contacts").update(values).eq("id", existing.id);
      if (error) throw new ApiError(500, "nexus_contact_update_failed", error.message);
    } else {
      const { error } = await sb.from("waouh_entity_contacts").insert({
        entity_id: entity.id,
        channel: whatsappSet.has(phone) || input.sourceKey === "whatsapp" || input.sourceKey === "whatsapp_groups" ? "whatsapp" : "phone",
        ...values,
      });
      if (error) throw new ApiError(500, "nexus_contact_create_failed", error.message);
    }
  }

  for (const emailRaw of input.contactEmails ?? []) {
    const email = emailRaw.trim().toLowerCase();
    if (!email) continue;
    const hash = await sha256Hex(email);
    const encrypted = await encryptPhone(email);
    const { data: existing } = await sb.from("waouh_entity_contacts").select("id")
      .eq("entity_id", entity.id).eq("channel", "email").eq("value_hash", hash).maybeSingle();
    const values = {
      source_key: input.sourceKey,
      value_encrypted: encrypted,
      value_hash: hash,
      value_last4: null,
      is_public_business: input.isPublicBusiness,
      consent_state: input.consentBasis,
      contactability_level: input.contactability,
      verified_at: input.isPublicBusiness || ["opt_in","partner_contract","initiated"].includes(input.consentBasis)
        ? new Date().toISOString() : null,
    };
    if (existing?.id) await sb.from("waouh_entity_contacts").update(values).eq("id", existing.id);
    else await sb.from("waouh_entity_contacts").insert({ entity_id: entity.id, channel: "email", ...values });
  }

  if (input.actorHandle) {
    const socialChannel = input.sourceKey.includes("facebook") ? "facebook"
      : input.sourceKey.includes("instagram") ? "instagram"
      : input.sourceKey.includes("tiktok") ? "tiktok"
      : input.sourceKey.includes("telegram") ? "telegram" : null;
    if (socialChannel) {
      const publicValue = input.actorHandle.slice(0, 500);
      const hash = await sha256Hex(`${socialChannel}:${publicValue.toLowerCase()}`);
      const { data: existing } = await sb.from("waouh_entity_contacts").select("id")
        .eq("entity_id", entity.id).eq("channel", socialChannel).eq("value_hash", hash).maybeSingle();
      const values = {
        source_key: input.sourceKey,
        value_hash: hash,
        public_value: publicValue,
        is_public_business: input.isPublicBusiness,
        consent_state: input.consentBasis,
        contactability_level: input.contactability,
      };
      if (existing?.id) await sb.from("waouh_entity_contacts").update(values).eq("id", existing.id);
      else await sb.from("waouh_entity_contacts").insert({ entity_id: entity.id, channel: socialChannel, ...values });
    }
  }

  return entity;
}

function extractWhatsappPhones(...values: unknown[]): string[] {
  const found = new Set<string>();
  for (const value of values) {
    const text = String(value ?? "");
    const patterns = [
      /(?:https?:\/\/)?wa\.me\/(\d{8,15})/gi,
      /api\.whatsapp\.com\/send\?[^\s"'<>]*?phone=(\d{8,15})/gi,
      /whatsapp[^\d+]{0,20}(\+?\d[\d\s().-]{7,20})/gi,
    ];
    for (const pattern of patterns) {
      for (const match of text.matchAll(pattern)) {
        const normalized = normalizeE164(match[1]);
        if (normalized) found.add(normalized);
      }
    }
  }
  return [...found].slice(0, 5);
}

function publicPhotoUrls(value: unknown): string[] {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  const out = new Set<string>();
  for (const item of values) {
    const raw = typeof item === "string"
      ? item
      : item && typeof item === "object"
        ? String((item as any).url ?? (item as any).src ?? (item as any).image_url ?? "")
        : "";
    if (!raw.trim()) continue;
    try {
      const url = new URL(raw.trim());
      if (["https:","http:"].includes(url.protocol)) out.add(url.toString());
    } catch {
      // Ignore malformed/non-public media references.
    }
  }
  return [...out].slice(0, 12);
}

async function ingestCommerceSignal(
  sb: SupabaseClient,
  ownerId: string | null,
  input: JsonObject,
  trusted: { expectedIntent?: "BUY" | "SELL" | "ANNOUNCE" | "RFQ" | null; publicBusiness?: boolean } = {},
) {
  const sourceKey = asString(input.source_key, "source_key", 2, 80);
  const { data: source, error: sourceError } = await sb.from("waouh_discovery_sources")
    .select("*").eq("source_key", sourceKey).maybeSingle();
  if (sourceError) throw new ApiError(500, "nexus_source_lookup_failed", sourceError.message);
  if (!source) throw new ApiError(422, "unknown_discovery_source");

  const rawTextInput = optionalString(input.raw_text, "raw_text", 20_000) ?? "";
  const sourceUrl = safeFabricSourceUrl(input.source_url);
  if (!rawTextInput && !sourceUrl) throw new ApiError(422, "signal_content_required");

  const extraction = await extractSignalIntent(
    rawTextInput || String(input.product_name ?? input.actor_name ?? ""),
    trusted.expectedIntent ?? null,
  );

  const hints = extractPublicContactHints(rawTextInput);
  const explicitPhones = stringArray(input.contact_phones, "contact_phones", 5);
  const explicitEmails = stringArray(input.contact_emails, "contact_emails", 5);
  const explicitWhatsapp = [
    ...stringArray(input.whatsapp_phones, "whatsapp_phones", 5),
    ...stringArray(input.contact_whatsapp == null ? [] : [input.contact_whatsapp], "contact_whatsapp", 5),
  ];
  const whatsappPhones = [...new Set([
    ...explicitWhatsapp
      .map((phone) => normalizeE164(phone))
      .filter((phone): phone is string => !!phone),
    ...extractWhatsappPhones(rawTextInput, sourceUrl, ...hints.urls),
  ])];
  const contactPhones = [...new Set([...explicitPhones, ...hints.phones])];
  const contactEmails = [...new Set([...explicitEmails, ...hints.emails])];
  const photos = publicPhotoUrls(
    input.photo_urls ?? input.photos ?? input.image_urls ?? input.image_url,
  );

  const consentBasis = pickEnum(
    input.contact_consent_basis,
    "contact_consent_basis",
    ["unknown","public_business","initiated","opt_in","partner_contract","shared_by_user"] as const,
    sourceKey === "share_to_waouh" ? "shared_by_user" : "unknown",
  );
  const isPublicBusiness = trusted.publicBusiness === true || input.public_business === true || consentBasis === "public_business";
  const contactability = contactabilityFromBasis(
    String(source.default_contactability ?? "C0"),
    consentBasis,
    isPublicBusiness,
  );

  const actorName = optionalString(input.actor_name, "actor_name", 240) ?? extraction.actor_name;
  const actorHandle = optionalString(input.actor_handle, "actor_handle", 500) ?? extraction.actor_handle;
  const actorType = pickEnum(
    input.actor_type ?? extraction.actor_type,
    "actor_type",
    ["buyer","seller","announcer","business","broker","scout","unknown"] as const,
    actorRoleFromIntent(extraction.intent) as any,
  );
  const entity = await resolveCommerceEntity(sb, {
    sourceKey,
    actorType,
    actorName,
    actorHandle,
    city: optionalString(input.city, "city", 120) ?? extraction.city,
    contactPhones,
    whatsappPhones,
    contactEmails,
    contactability,
    consentBasis,
    isPublicBusiness,
  });

  const externalIdRaw = optionalString(input.source_external_id, "source_external_id", 500);
  const externalId = externalIdRaw ?? await sha256Hex(
    `${sourceKey}|${sourceUrl ?? ""}|${rawTextInput.slice(0, 5000)}|${actorName ?? ""}`,
  );
  const row = {
    submitted_by: ownerId,
    source_id: source.id,
    source_key: sourceKey,
    source_external_id: externalId,
    source_url: sourceUrl,
    intent: pickEnum(
      input.intent ?? extraction.intent,
      "intent",
      ["BUY","SELL","ANNOUNCE","RFQ","UNKNOWN"] as const,
      extraction.intent as any,
    ),
    actor_type: actorType,
    entity_id: entity.id,
    actor_name: actorName,
    actor_handle: actorHandle,
    contactability_level: contactability,
    contact_consent_basis: consentBasis,
    product_name: optionalString(input.product_name, "product_name", 240) ?? extraction.product_name,
    canonical_key: optionalString(input.canonical_key, "canonical_key", 240),
    category: optionalString(input.category, "category", 120) ?? extraction.category,
    brand: optionalString(input.brand, "brand", 120) ?? extraction.brand,
    model: optionalString(input.model, "model", 120) ?? extraction.model,
    condition: optionalString(input.condition, "condition", 120) ?? extraction.condition,
    quantity: positiveNumber(input.quantity ?? extraction.quantity, "quantity", true),
    unit: optionalString(input.unit, "unit", 80) ?? extraction.unit,
    price_min: positiveNumber(input.price_min ?? extraction.price_min, "price_min", true),
    price_max: positiveNumber(input.price_max ?? extraction.price_max, "price_max", true),
    currency: "XOF",
    city: optionalString(input.city, "city", 120) ?? extraction.city,
    country_code: optionalString(input.country_code, "country_code", 2) ?? extraction.country_code ?? "BJ",
    latitude: input.latitude == null ? null : Number(input.latitude),
    longitude: input.longitude == null ? null : Number(input.longitude),
    availability: input.availability != null
      ? pickEnum(input.availability, "availability", ["available","low_stock","out_of_stock","unknown"] as const)
      : extraction.availability,
    raw_text: redactPublicContacts(rawTextInput).slice(0, 20_000) || null,
    evidence: {
      ...(jsonObject(input.evidence, "evidence")),
      contact_hints: {
        phone_count: contactPhones.length,
        whatsapp_verified_count: whatsappPhones.length,
        email_count: contactEmails.length,
      },
      ...(photos.length ? { photos } : {}),
    },
    ai_extraction: extraction,
    confidence: Math.max(0, Math.min(1, Number(input.confidence ?? extraction.confidence ?? 0.5))),
    trust_score: Math.max(0, Math.min(100, Number(input.trust_score ?? Number(source.trust_weight ?? 0.6) * 100))),
    status: "active",
    observed_at: isoDate(input.observed_at, "observed_at") ?? new Date().toISOString(),
    expires_at: isoDate(input.expires_at, "expires_at"),
  };

  const { data: existing, error: lookupError } = await sb.from("waouh_external_commerce_signals")
    .select("id").eq("source_key", sourceKey).eq("source_external_id", externalId).maybeSingle();
  if (lookupError) throw new ApiError(500, "nexus_signal_lookup_failed", lookupError.message);
  const signal = existing?.id
    ? await queryOne<any>(
        sb.from("waouh_external_commerce_signals").update(row).eq("id", existing.id).select("*").single(),
        "nexus_signal_update_failed",
      )
    : await queryOne<any>(
        sb.from("waouh_external_commerce_signals").insert(row).select("*").single(),
        "nexus_signal_create_failed",
      );

  const role = actorType === "business" ? "business"
    : actorType === "broker" ? "broker"
    : actorType === "buyer" ? "buyer"
    : actorType === "seller" ? "seller"
    : actorType === "scout" ? "observer" : "announcer";
  await sb.from("waouh_signal_entity_links").upsert({
    signal_id: signal.id,
    entity_id: entity.id,
    role,
    confidence: signal.confidence,
  }, { onConflict: "signal_id,entity_id,role" });

  return { signal, entity, contactability: contactabilityPolicy(contactability) };
}

async function refreshGooglePlaces(
  sb: SupabaseClient,
  ownerId: string,
  query: string,
  city?: string | null,
  limit = 10,
) {
  const key = await getRadarApiKey(sb as any, "google_places", "GOOGLE_PLACES_API_KEY");
  if (!key.ok || !key.key) {
    return { configured: false, inserted: 0, results: [] as any[], reason: key.reason ?? "google_places_key_missing" };
  }
  const apiKey = key.key;
  const textQuery = [query, city, "Bénin"].filter(Boolean).join(" ");
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": [
        "places.id","places.displayName","places.formattedAddress","places.location",
        "places.nationalPhoneNumber","places.internationalPhoneNumber","places.websiteUri",
        "places.googleMapsUri","places.businessStatus","places.rating","places.userRatingCount","places.types","places.photos",
      ].join(","),
    },
    body: JSON.stringify({
      textQuery,
      languageCode: "fr",
      regionCode: "BJ",
      pageSize: Math.min(Math.max(limit, 1), 20),
    }),
  });
  const raw = await response.text();
  await incrementRadarUsage(sb as any, key.configId, 1);
  if (!response.ok) {
    await markRadarProviderSync(sb as any, "google_places", "ko", `HTTP ${response.status}`);
    return { configured: true, inserted: 0, results: [], reason: `google_places_${response.status}`, detail: raw.slice(0, 300) };
  }
  const data = JSON.parse(raw);
  const places = Array.isArray(data?.places) ? data.places : [];
  const saved: any[] = [];
  for (const place of places) {
    const actorName = place?.displayName?.text ?? null;
    if (!actorName || !place?.id) continue;
    const contactPhones = [place.internationalPhoneNumber, place.nationalPhoneNumber].filter(Boolean);
    const photoUrls: string[] = [];
    for (const photo of (Array.isArray(place.photos) ? place.photos : []).slice(0, 3)) {
      const name = String(photo?.name ?? "").trim();
      if (!name) continue;
      try {
        const photoResponse = await fetch(
          `https://places.googleapis.com/v1/${name}/media?maxWidthPx=1200&skipHttpRedirect=true`,
          { headers: { "X-Goog-Api-Key": apiKey } },
        );
        if (photoResponse.ok) {
          const photoData = await photoResponse.json().catch(() => ({}));
          if (typeof photoData?.photoUri === "string") photoUrls.push(photoData.photoUri);
        }
      } catch {
        // A photo failure never blocks the place/business signal.
      }
    }
    const ingested = await ingestCommerceSignal(sb, ownerId, {
      source_key: "google_places",
      source_external_id: String(place.id),
      source_url: place.googleMapsUri ?? place.websiteUri ?? null,
      raw_text: [actorName, place.formattedAddress, Array.isArray(place.types) ? place.types.join(" ") : ""].filter(Boolean).join(" · "),
      intent: "ANNOUNCE",
      actor_type: "business",
      actor_name: actorName,
      product_name: query,
      city: city ?? null,
      latitude: place?.location?.latitude ?? null,
      longitude: place?.location?.longitude ?? null,
      contact_phones: contactPhones,
      photo_urls: photoUrls,
      contact_consent_basis: "public_business",
      public_business: true,
      confidence: 0.72,
      trust_score: Math.min(95, 65 + Math.min(20, Number(place.rating ?? 0) * 4)),
      evidence: {
        google_place_id: place.id,
        formatted_address: place.formattedAddress ?? null,
        business_status: place.businessStatus ?? null,
        rating: place.rating ?? null,
        user_rating_count: place.userRatingCount ?? null,
        website_uri: place.websiteUri ?? null,
        google_maps_uri: place.googleMapsUri ?? null,
        types: place.types ?? [],
        photo_count: photoUrls.length,
      },
    }, { expectedIntent: "ANNOUNCE", publicBusiness: true });
    saved.push(ingested.signal);
  }
  await markRadarProviderSync(sb as any, "google_places", "ok", `${saved.length} signaux unifiés`);
  return { configured: true, inserted: saved.length, results: saved };
}

function publicSourceKey(urlValue: string, mode: DiscoveryMode) {
  try {
    const host = new URL(urlValue).hostname.toLowerCase().replace(/^www\./, "");
    if (host === "facebook.com" || host.endsWith(".facebook.com") || host === "fb.com") return "facebook_business";
    if (host === "instagram.com" || host.endsWith(".instagram.com")) return "instagram_business";
    if (host === "tiktok.com" || host.endsWith(".tiktok.com")) return "tiktok_connected";
    if (host === "t.me" || host.endsWith(".telegram.me") || host.endsWith(".telegram.org")) return "telegram_public";
    if (host === "monentreprise.bj" || host.endsWith(".cci.bj") || host.endsWith(".apiex.bj")) return "benin_directory";
    if (mode === "find_buyers" && (
      host.includes("marches-publics") || host.includes("appeloffres") || host.includes("tender") ||
      host.includes("procurement") || host.includes("dgmp") || host.includes("armp")
    )) return "b2b_rfq";
  } catch {
    // Keep generic public Web source.
  }
  return "serpapi";
}

function publicSearchProfiles(mode: DiscoveryMode, query: string, city?: string | null) {
  const clean = query.replace(/"/g, "").trim();
  const where = [city, "Bénin"].filter(Boolean).join(" ");
  const sellIntent = '("à vendre" OR vente OR prix OR disponible OR arrivage OR boutique OR fournisseur)';
  const buyIntent = '("je cherche" OR "besoin de" OR "qui vend" OR "cherche fournisseur" OR "demande de cotation" OR RFQ OR "appel d\'offres")';
  const intent = mode === "find_sellers" ? sellIntent : buyIntent;
  const socialSites = "(site:facebook.com OR site:instagram.com OR site:tiktok.com OR site:t.me)";
  const localBusinessSites = "(site:monentreprise.bj OR site:cci.bj OR site:apiex.bj OR site:.bj)";
  const commerceSites = "(site:jiji.bj OR site:afribaba.bj OR site:expat.com OR site:linkedin.com)";
  const b2bSites = "(site:marches-publics.bj OR site:armp.bj OR site:dgmp.bj OR site:linkedin.com OR site:.bj)";
  const profiles = [
    { key: "social", q: `"${clean}" ${intent} ${where} ${socialSites}` },
    { key: "local", q: `"${clean}" ${intent} ${where} ${localBusinessSites}` },
    {
      key: mode === "find_buyers" ? "b2b" : "commerce",
      q: `"${clean}" ${intent} ${where} ${mode === "find_buyers" ? b2bSites : commerceSites}`,
    },
  ];
  return profiles;
}

async function refreshSerpApi(
  sb: SupabaseClient,
  ownerId: string,
  mode: DiscoveryMode,
  query: string,
  city?: string | null,
  limit = 10,
) {
  const key = await getRadarApiKey(sb as any, "serpapi", "SERPAPI_KEY");
  if (!key.ok || !key.key) {
    return {
      configured: false,
      inserted: 0,
      results: [] as any[],
      reason: key.reason ?? "serpapi_not_ready",
      surfaces: {} as Record<string, number>,
    };
  }

  const profiles = publicSearchProfiles(mode, query, city);
  const perProfile = Math.max(2, Math.min(6, Math.ceil(limit / profiles.length)));
  const saved: any[] = [];
  const seen = new Set<string>();
  const surfaces: Record<string, number> = {};
  let calls = 0;

  for (const profile of profiles) {
    const url = new URL("https://serpapi.com/search.json");
    url.searchParams.set("engine", "google");
    url.searchParams.set("q", profile.q);
    url.searchParams.set("num", String(perProfile));
    url.searchParams.set("gl", "bj");
    url.searchParams.set("hl", "fr");
    url.searchParams.set("tbs", "qdr:m");
    url.searchParams.set("api_key", key.key);

    const response = await fetch(url.toString());
    calls += 1;
    await incrementRadarUsage(sb as any, key.configId, 1);
    if (!response.ok) {
      surfaces[profile.key] = 0;
      continue;
    }

    const data = await response.json();
    const organic = Array.isArray(data?.organic_results) ? data.organic_results.slice(0, perProfile) : [];
    let insertedForProfile = 0;
    for (const item of organic) {
      const link = typeof item?.link === "string" ? item.link : "";
      if (!link || seen.has(link)) continue;
      seen.add(link);
      let hostname = "web";
      try { hostname = new URL(link).hostname.replace(/^www\./, ""); } catch { /* keep web */ }
      const sourceKey = publicSourceKey(link, mode);
      const publicBusiness = sourceKey === "benin_directory";
      const expectedIntent = mode === "find_sellers" ? "SELL" : (sourceKey === "b2b_rfq" ? "RFQ" : "BUY");
      const rawText = [item.title, item.snippet].filter(Boolean).join("\n");

      const ingested = await ingestCommerceSignal(sb, ownerId, {
        source_key: sourceKey,
        source_external_id: link,
        source_url: link,
        raw_text: rawText,
        intent: expectedIntent,
        actor_type: publicBusiness ? "business" : (mode === "find_sellers" ? "seller" : "buyer"),
        product_name: query,
        city: city ?? null,
        contact_phones: item.phone ? [String(item.phone)] : [],
        photo_urls: [item.thumbnail, item.image, item.favicon].filter((value) => typeof value === "string"),
        contact_consent_basis: publicBusiness ? "public_business" : "unknown",
        public_business: publicBusiness,
        confidence: publicBusiness ? 0.72 : 0.60,
        trust_score: publicBusiness ? 82 : undefined,
        evidence: {
          position: item.position ?? null,
          hostname,
          title: item.title ?? null,
          search_surface: profile.key,
          discovered_via: "serpapi",
        },
      }, { expectedIntent, publicBusiness });
      saved.push(ingested.signal);
      insertedForProfile += 1;
    }
    surfaces[profile.key] = insertedForProfile;
  }

  await markRadarProviderSync(
    sb as any,
    "serpapi",
    saved.length ? "ok" : "skipped",
    `${saved.length} signaux unifiés · ${calls} appels`,
  );
  return {
    configured: true,
    inserted: saved.length,
    results: saved,
    calls,
    surfaces,
    reason: saved.length ? null : "no_public_results",
  };
}


async function refreshFacebookBusiness(
  sb: SupabaseClient,
  ownerId: string,
  query: string,
  limit = 8,
) {
  const ready = await getRadarApiKey(sb as any, "facebook_business");
  if (!ready.ok || !ready.key) {
    return { configured: false, inserted: 0, results: [] as any[], reason: ready.reason ?? "facebook_not_ready" };
  }
  const cfg = ready.config?.extra_config ?? {};
  let pageIds = Array.isArray((cfg as any).page_ids)
    ? (cfg as any).page_ids.map((v: any) => String(v).trim()).filter(Boolean)
    : [];
  const { data: fbPageSources } = await sb.from("waouh_radar_sources")
    .select("identifier").eq("type", "fb_page").eq("active", true);
  for (const row of fbPageSources ?? []) {
    let value = String((row as any).identifier ?? "").trim();
    try {
      if (/^https?:\/\//i.test(value)) {
        const url = new URL(value);
        value = url.pathname.split("/").filter(Boolean)[0] || value;
      }
    } catch {
      // Keep raw Page ID / username.
    }
    if (value && !pageIds.includes(value)) pageIds.push(value);
  }
  if (!pageIds.length) {
    try {
      const pagesRes = await fetch(
        `https://graph.facebook.com/me/accounts?fields=id,name&limit=25&access_token=${encodeURIComponent(ready.key)}`,
      );
      const pagesData = await pagesRes.json().catch(() => ({}));
      pageIds = Array.isArray(pagesData?.data)
        ? pagesData.data.map((p: any) => String(p?.id ?? "")).filter(Boolean)
        : [];
    } catch {
      // Admin can explicitly configure page_ids when account discovery is unavailable.
    }
  }
  const saved: any[] = [];
  for (const pageId of pageIds.slice(0, 10)) {
    try {
      const infoRes = await fetch(
        `https://graph.facebook.com/${encodeURIComponent(pageId)}?fields=id,name,phone,website,link&access_token=${encodeURIComponent(ready.key)}`,
      );
      const page = await infoRes.json().catch(() => ({}));
      const postsRes = await fetch(
        `https://graph.facebook.com/${encodeURIComponent(pageId)}/posts?fields=id,message,permalink_url,full_picture,created_time&limit=${Math.min(limit, 12)}&access_token=${encodeURIComponent(ready.key)}`,
      );
      const posts = await postsRes.json().catch(() => ({}));
      if (!postsRes.ok || posts?.error) continue;
      for (const post of Array.isArray(posts?.data) ? posts.data : []) {
        const raw = String(post?.message ?? "").trim();
        if (!raw) continue;
        const ingested = await ingestCommerceSignal(sb, ownerId, {
          source_key: "facebook_business",
          source_external_id: String(post.id),
          source_url: post.permalink_url ?? page.link ?? null,
          raw_text: raw,
          actor_type: "business",
          actor_name: page.name ?? null,
          actor_handle: page.link ?? null,
          product_name: query,
          contact_phones: page.phone ? [page.phone] : [],
          photo_urls: post.full_picture ? [post.full_picture] : [],
          contact_consent_basis: page.phone ? "public_business" : "unknown",
          public_business: !!page.phone,
          observed_at: post.created_time ?? null,
          confidence: 0.74,
          evidence: { page_id: pageId, page_website: page.website ?? null, connector: "facebook_graph" },
        }, { publicBusiness: !!page.phone });
        saved.push(ingested.signal);
      }
    } catch {
      // One inaccessible page must not fail the entire discovery cycle.
    }
  }
  await incrementRadarUsage(sb as any, ready.configId, Math.max(1, pageIds.length));
  await markRadarProviderSync(sb as any, "facebook_business", saved.length ? "ok" : "skipped", `${saved.length} publications unifiées`);
  return {
    configured: true,
    inserted: saved.length,
    results: saved,
    reason: pageIds.length ? (saved.length ? null : "no_accessible_posts") : "no_authorized_pages",
  };
}

async function refreshInstagramBusiness(
  sb: SupabaseClient,
  ownerId: string,
  query: string,
  limit = 8,
) {
  const ready = await getRadarApiKey(sb as any, "instagram_business");
  if (!ready.ok || !ready.key) {
    return { configured: false, inserted: 0, results: [] as any[], reason: ready.reason ?? "instagram_not_ready" };
  }
  const cfg = ready.config?.extra_config ?? {};
  const accountIds = Array.isArray((cfg as any).account_ids)
    ? (cfg as any).account_ids.map((v: any) => String(v).trim()).filter(Boolean)
    : [];
  const saved: any[] = [];
  for (const accountId of accountIds.slice(0, 10)) {
    try {
      const userRes = await fetch(
        `https://graph.facebook.com/${encodeURIComponent(accountId)}?fields=id,username,name,profile_picture_url&access_token=${encodeURIComponent(ready.key)}`,
      );
      const user = await userRes.json().catch(() => ({}));
      const mediaRes = await fetch(
        `https://graph.facebook.com/${encodeURIComponent(accountId)}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=${Math.min(limit, 12)}&access_token=${encodeURIComponent(ready.key)}`,
      );
      const media = await mediaRes.json().catch(() => ({}));
      if (!mediaRes.ok || media?.error) continue;
      for (const item of Array.isArray(media?.data) ? media.data : []) {
        const raw = String(item?.caption ?? "").trim();
        if (!raw) continue;
        const photo = item.thumbnail_url ?? item.media_url;
        const ingested = await ingestCommerceSignal(sb, ownerId, {
          source_key: "instagram_business",
          source_external_id: String(item.id),
          source_url: item.permalink ?? null,
          raw_text: raw,
          actor_type: "business",
          actor_name: user.name ?? user.username ?? null,
          actor_handle: user.username ? `@${user.username}` : null,
          product_name: query,
          photo_urls: photo ? [photo] : [],
          contact_consent_basis: "unknown",
          public_business: true,
          observed_at: item.timestamp ?? null,
          confidence: 0.70,
          evidence: { account_id: accountId, media_type: item.media_type ?? null, connector: "instagram_graph" },
        }, { publicBusiness: true });
        saved.push(ingested.signal);
      }
    } catch {
      // Continue with the next authorized account.
    }
  }
  await incrementRadarUsage(sb as any, ready.configId, Math.max(1, accountIds.length));
  await markRadarProviderSync(sb as any, "instagram_business", saved.length ? "ok" : "skipped", `${saved.length} médias unifiés`);
  return {
    configured: true,
    inserted: saved.length,
    results: saved,
    reason: accountIds.length ? (saved.length ? null : "no_accessible_media") : "account_ids_required",
  };
}

async function refreshTelegramPublic(
  sb: SupabaseClient,
  ownerId: string,
  query: string,
  limit = 12,
) {
  const ready = await getRadarApiKey(sb as any, "telegram_public");
  if (!ready.ok || !ready.key) {
    return { configured: false, inserted: 0, results: [] as any[], reason: ready.reason ?? "telegram_not_ready" };
  }
  const cfg = ready.config?.extra_config ?? {};
  const allowed = new Set(
    (Array.isArray((cfg as any).chat_ids) ? (cfg as any).chat_ids : [])
      .map((v: any) => String(v).trim().replace(/^@/, ""))
      .filter(Boolean),
  );
  const { data: telegramSources } = await sb.from("waouh_radar_sources")
    .select("identifier").in("type", ["telegram","telegram_channel"]).eq("active", true);
  for (const row of telegramSources ?? []) {
    let value = String((row as any).identifier ?? "").trim();
    try {
      if (/^https?:\/\//i.test(value)) {
        const url = new URL(value);
        value = url.pathname.split("/").filter(Boolean)[0] || value;
      }
    } catch {
      // Keep chat id / username.
    }
    value = value.replace(/^@/, "");
    if (value) allowed.add(value);
  }
  if (!allowed.size) {
    return { configured: true, inserted: 0, results: [], reason: "authorized_chat_ids_required" };
  }
  const offset = Number((cfg as any).last_update_id ?? 0);
  const url = new URL(`https://api.telegram.org/bot${ready.key}/getUpdates`);
  if (offset > 0) url.searchParams.set("offset", String(offset + 1));
  url.searchParams.set("limit", String(Math.min(Math.max(limit, 1), 100)));
  url.searchParams.set("timeout", "0");
  const response = await fetch(url.toString());
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.ok !== true) {
    await markRadarProviderSync(sb as any, "telegram_public", "ko", data?.description || `HTTP ${response.status}`);
    return { configured: true, inserted: 0, results: [], reason: data?.description || "telegram_error" };
  }
  const saved: any[] = [];
  let maxUpdateId = offset;
  for (const update of Array.isArray(data?.result) ? data.result : []) {
    maxUpdateId = Math.max(maxUpdateId, Number(update?.update_id ?? 0));
    const message = update?.channel_post ?? update?.message ?? update?.edited_channel_post ?? null;
    if (!message?.chat) continue;
    const chatId = String(message.chat.id ?? "");
    const chatUsername = String(message.chat.username ?? "");
    if (!allowed.has(chatId) && !allowed.has(chatUsername)) continue;
    const raw = String(message.text ?? message.caption ?? "").trim();
    if (!raw) continue;

    const photos = Array.isArray(message.photo) ? message.photo : [];
    let photoUrl: string | null = null;
    const bestPhoto = photos.length ? photos[photos.length - 1] : null;
    if (bestPhoto?.file_id) {
      try {
        const fileRes = await fetch(`https://api.telegram.org/bot${ready.key}/getFile?file_id=${encodeURIComponent(bestPhoto.file_id)}`);
        const fileData = await fileRes.json().catch(() => ({}));
        if (fileData?.ok && fileData?.result?.file_path) {
          const protectedUrl = `https://api.telegram.org/file/bot${ready.key}/${fileData.result.file_path}`;
          photoUrl = await rehostMedia(sb as any, protectedUrl, "image/jpeg");
        }
      } catch {
        // Text signal remains usable.
      }
    }
    const username = String(message?.from?.username ?? message?.sender_chat?.username ?? chatUsername ?? "");
    const publicUrl = chatUsername
      ? `https://t.me/${chatUsername}/${message.message_id}`
      : null;
    const sharedPhone = message?.contact?.phone_number ? [String(message.contact.phone_number)] : [];
    const ingested = await ingestCommerceSignal(sb, ownerId, {
      source_key: "telegram_public",
      source_external_id: `${chatId}:${message.message_id}`,
      source_url: publicUrl,
      raw_text: raw,
      actor_type: "announcer",
      actor_name: [message?.from?.first_name, message?.from?.last_name].filter(Boolean).join(" ") || message?.chat?.title || null,
      actor_handle: username ? `@${username}` : null,
      product_name: query,
      contact_phones: sharedPhone,
      photo_urls: photoUrl ? [photoUrl] : [],
      contact_consent_basis: sharedPhone.length ? "shared_by_user" : "unknown",
      observed_at: message.date ? new Date(Number(message.date) * 1000).toISOString() : null,
      confidence: 0.67,
      evidence: { telegram_chat_id: chatId, telegram_message_id: message.message_id, authorized_chat: true },
    });
    saved.push(ingested.signal);
  }
  if (maxUpdateId > offset && ready.config?.id) {
    await sb.from("waouh_radar_api_configs").update({
      extra_config: { ...cfg, last_update_id: maxUpdateId },
    }).eq("id", ready.config.id);
  }
  await incrementRadarUsage(sb as any, ready.configId, 1);
  await markRadarProviderSync(sb as any, "telegram_public", saved.length ? "ok" : "skipped", `${saved.length} messages autorisés unifiés`);
  return { configured: true, inserted: saved.length, results: saved, reason: saved.length ? null : "no_new_authorized_messages" };
}

async function refreshTikTokConnected(
  sb: SupabaseClient,
  ownerId: string,
  query: string,
  limit = 10,
) {
  const ready = await getRadarApiKey(sb as any, "tiktok_connected");
  if (!ready.ok || !ready.key) {
    return { configured: false, inserted: 0, results: [] as any[], reason: ready.reason ?? "tiktok_not_ready" };
  }
  let displayName: string | null = null;
  try {
    const userRes = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url", {
      headers: { Authorization: `Bearer ${ready.key}` },
    });
    const userData = await userRes.json().catch(() => ({}));
    displayName = userData?.data?.user?.display_name ?? null;
  } catch {
    // Video ingestion can continue.
  }
  const response = await fetch(
    "https://open.tiktokapis.com/v2/video/list/?fields=id,title,video_description,duration,cover_image_url,share_url,create_time",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${ready.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ max_count: Math.min(Math.max(limit, 1), 20) }),
    },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.error?.code) {
    const message = data?.error?.message || data?.error?.code || `HTTP ${response.status}`;
    await markRadarProviderSync(sb as any, "tiktok_connected", "ko", String(message));
    return { configured: true, inserted: 0, results: [], reason: String(message) };
  }
  const videos = Array.isArray(data?.data?.videos) ? data.data.videos : [];
  const saved: any[] = [];
  for (const video of videos) {
    const raw = String(video.video_description ?? video.title ?? "").trim();
    if (!raw || !video.id) continue;
    const ingested = await ingestCommerceSignal(sb, ownerId, {
      source_key: "tiktok_connected",
      source_external_id: String(video.id),
      source_url: video.share_url ?? null,
      raw_text: raw,
      actor_type: "announcer",
      actor_name: displayName,
      product_name: query,
      photo_urls: video.cover_image_url ? [video.cover_image_url] : [],
      contact_consent_basis: "unknown",
      observed_at: video.create_time ? new Date(Number(video.create_time) * 1000).toISOString() : null,
      confidence: 0.64,
      evidence: { connector: "tiktok_display_api", duration: video.duration ?? null },
    });
    saved.push(ingested.signal);
  }
  await incrementRadarUsage(sb as any, ready.configId, 1);
  await markRadarProviderSync(sb as any, "tiktok_connected", saved.length ? "ok" : "skipped", `${saved.length} vidéos unifiées`);
  return { configured: true, inserted: saved.length, results: saved, reason: saved.length ? null : "no_commercial_video" };
}

async function refreshApifyRadar(sb: SupabaseClient) {
  const ready = await getRadarApiKey(sb as any, "apify", "APIFY_TOKEN");
  if (!ready.ok || !ready.key) {
    return { configured: false, inserted: 0, reason: ready.reason ?? "apify_not_ready" };
  }
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const url = Deno.env.get("SUPABASE_URL") || "";
  if (!url || !serviceKey) return { configured: true, inserted: 0, reason: "server_not_configured" };
  try {
    const response = await fetch(`${url}/functions/v1/waouh-radar-apify`, {
      method: "POST",
      headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey, "Content-Type": "application/json" },
      body: JSON.stringify({ source: "nexus.global_discovery" }),
      signal: AbortSignal.timeout(18000),
    });
    const data = await response.json().catch(() => ({}));
    const inserted = Number(data?.signals ?? 0);
    await markRadarProviderSync(sb as any, "apify", response.ok ? "ok" : "ko", response.ok ? `${inserted} signaux Radar` : `HTTP ${response.status}`);
    return { configured: true, inserted, reason: response.ok ? null : (data?.error || `HTTP ${response.status}`) };
  } catch (error: any) {
    await markRadarProviderSync(sb as any, "apify", "ko", error?.message || String(error));
    return { configured: true, inserted: 0, reason: error?.message || String(error) };
  }
}

async function globalDiscoverySearch(
  sb: SupabaseClient,
  input: {
    query: string;
    mode: DiscoveryMode;
    city?: string | null;
    budgetMax?: number | null;
    limit: number;
  },
) {
  const desired = input.mode === "find_sellers" ? ["SELL","ANNOUNCE"] : ["BUY","RFQ"];
  const { data, error } = await sb.from("waouh_signal_fabric")
    .select("*").in("intent", desired).order("observed_at", { ascending: false }).limit(3500);
  if (error) throw new ApiError(500, "nexus_global_discovery_failed", error.message);
  const ranked = (data ?? []).map((signal: FabricSignal) => ({
    ...signal,
    scores: scoreFabricSignal({
      query: input.query,
      mode: input.mode,
      city: input.city,
      budgetMax: input.budgetMax,
      signal,
    }),
    contact_policy: contactabilityPolicy(signal.contactability_level),
  })).filter((row: any) => row.scores.relevance_score >= 18 && row.scores.total_score >= 32)
    .sort((a: any, b: any) => b.scores.total_score - a.scores.total_score)
    .slice(0, input.limit);
  return ranked;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: waouhCorsHeaders });
  if (req.method !== "POST") return errorResponse(405, "method_not_allowed");

  try {
    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > 1_000_000) throw new ApiError(413, "payload_too_large");

    const requestBody = asObject(await req.json(), "body");
    const action = asString(requestBody.action, "action", 3, 80);
    const payload = asObject(requestBody.payload ?? {}, "payload");
    ensureNoFinancialAction(action, payload);

    const authUser = await getRequestUser(req);
    if (!authUser) throw new ApiError(401, "authentication_required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) throw new ApiError(500, "server_not_configured");
    const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const ownerId = authUser.id;

    switch (action) {
      case "mission.create": {
        const goal = asString(payload.goal, "goal", 3, 2_000);
        const channel = pickEnum(payload.channel, "channel", ["web", "mobile", "whatsapp"] as const, "web");
        const locale = optionalString(payload.locale, "locale", 20) ?? "fr-BJ";
        const constraints = jsonObject(payload.constraints, "constraints");
        const preferences = jsonObject(payload.preferences, "preferences");

        const mission = await queryOne<any>(
          sb.from("waouh_agent_missions").insert({
            owner_id: ownerId,
            goal,
            channel,
            locale,
            constraints,
            preferences,
            status: "active",
          }).select("*").single(),
          "mission_create_failed",
        );
        try {
          await queryOne<any>(
            sb.from("waouh_agent_intents").insert({
              mission_id: mission.id,
              owner_id: ownerId,
              intent_type: "purchase_search",
              normalized_query: goal,
              slots: constraints,
              confidence: 1,
            }).select("id").single(),
            "intent_create_failed",
          );
          const plan = await queryOne<any>(
            sb.from("waouh_agent_plans").insert({
              mission_id: mission.id,
              owner_id: ownerId,
              version: 1,
              status: "active",
              rationale: "Plan initial déterministe : recherche, comparaison et présentation.",
            }).select("*").single(),
            "plan_create_failed",
          );
          const { error: stepsError } = await sb.from("waouh_agent_steps").insert([
            { plan_id: plan.id, mission_id: mission.id, owner_id: ownerId, sequence_no: 1, tool_name: "catalog_search", status: "queued", input: { goal, constraints } },
            { plan_id: plan.id, mission_id: mission.id, owner_id: ownerId, sequence_no: 2, tool_name: "compare_results", status: "blocked", input: {} },
            { plan_id: plan.id, mission_id: mission.id, owner_id: ownerId, sequence_no: 3, tool_name: "present_recommendations", status: "blocked", input: {} },
          ]);
          if (stepsError) throw new ApiError(500, "steps_create_failed", stepsError.message);
          const { data: updated, error: updateError } = await sb.from("waouh_agent_missions")
            .update({ current_plan_id: plan.id }).eq("id", mission.id).select("*").single();
          if (updateError) throw new ApiError(500, "mission_plan_link_failed", updateError.message);
          await audit(sb, ownerId, "mission.created", "mission", mission.id, { channel, locale }, mission.id);
          await enqueue(sb, ownerId, "mission.created", "mission", mission.id, { mission_id: mission.id }, `mission.created:${mission.id}`, mission.id);
          return jsonResponse({ ok: true, data: { mission: updated } }, 201);
        } catch (error) {
          await sb.from("waouh_agent_missions").delete().eq("id", mission.id);
          throw error;
        }
      }

      case "mission.list": {
        const limit = integer(payload.limit, "limit", 25, 1, 100);
        const before = cursor(payload.cursor);
        let query = sb.from("waouh_agent_missions").select("*").eq("owner_id", ownerId)
          .order("created_at", { ascending: false }).limit(limit);
        if (payload.status) query = query.eq("status", asString(payload.status, "status", 2, 32));
        if (before) query = query.lt("created_at", before);
        const { data, error } = await query;
        if (error) throw new ApiError(500, "mission_list_failed", error.message);
        const missions = data ?? [];
        return jsonResponse({ ok: true, data: { missions, items: missions, next_cursor: listMeta(missions, limit) } });
      }

      case "mission.get": {
        const mission = await ownedMission(sb, ownerId, uuid(payload.mission_id, "mission_id"));
        const [intentResult, planResult, stepResult] = await Promise.all([
          sb.from("waouh_agent_intents").select("*").eq("mission_id", mission.id).order("version", { ascending: false }),
          sb.from("waouh_agent_plans").select("*").eq("mission_id", mission.id).order("version", { ascending: false }),
          sb.from("waouh_agent_steps").select("*").eq("mission_id", mission.id).order("sequence_no"),
        ]);
        for (const result of [intentResult, planResult, stepResult]) {
          if (result.error) throw new ApiError(500, "mission_detail_failed", result.error.message);
        }
        return jsonResponse({ ok: true, data: { mission, intents: intentResult.data, plans: planResult.data, steps: stepResult.data } });
      }

      case "mission.pause":
      case "mission.resume":
      case "mission.cancel": {
        const missionId = uuid(payload.mission_id, "mission_id");
        const mission = await ownedMission(sb, ownerId, missionId);
        const nextStatus = action === "mission.pause" ? "paused" : action === "mission.resume" ? "active" : "cancelled";
        const allowed = action === "mission.pause" ? ["active"] : action === "mission.resume" ? ["paused"] : ["active", "paused", "planning"];
        if (!allowed.includes(mission.status)) throw new ApiError(409, "invalid_mission_transition");
        const { data, error } = await sb.from("waouh_agent_missions")
          .update({ status: nextStatus, completed_at: nextStatus === "cancelled" ? new Date().toISOString() : null })
          .eq("id", missionId).eq("owner_id", ownerId).select("*").single();
        if (error) throw new ApiError(500, "mission_update_failed", error.message);
        await audit(sb, ownerId, `mission.${nextStatus}`, "mission", missionId, {}, missionId);
        return jsonResponse({ ok: true, data: { mission: data } });
      }

      case "mission.run": {
        const missionId = uuid(payload.mission_id, "mission_id");
        const mission = await ownedMission(sb, ownerId, missionId);
        if (!["active", "paused"].includes(mission.status)) throw new ApiError(409, "mission_not_runnable");
        const requestedAt = new Date().toISOString();
        const { data, error } = await sb.from("waouh_agent_missions").update({
          status: "active",
          next_run_at: requestedAt,
          last_error: null,
        }).eq("id", missionId).eq("owner_id", ownerId).select("*").single();
        if (error) throw new ApiError(500, "mission_run_failed", error.message);
        const runId = crypto.randomUUID();
        await enqueue(sb, ownerId, "mission.run_requested", "mission", missionId, {
          mission_id: missionId,
          run_id: runId,
        }, `mission.run_requested:${missionId}:${runId}`, missionId);
        await audit(sb, ownerId, "mission.run_requested", "mission", missionId, { run_id: runId }, missionId);
        return jsonResponse({ ok: true, data: { mission: data, run_id: runId } }, 202);
      }

      case "watch.create": {
        const queryText = asString(payload.query, "query", 2, 1_000);
        const articleId = payload.article_id ? uuid(payload.article_id, "article_id") : null;
        const sourceUrl = safeUrl(payload.source_url, "source_url");
        const targetAmount = positiveNumber(payload.target_amount, "target_amount", true);
        const watch = await queryOne<any>(
          sb.from("waouh_watchlists").insert({
            owner_id: ownerId,
            query: queryText,
            article_id: articleId,
            source_url: sourceUrl,
            target_amount: targetAmount,
            currency: pickEnum(payload.currency, "currency", ["XOF"] as const, "XOF"),
            check_interval_minutes: integer(payload.check_interval_minutes, "check_interval_minutes", 60, 15, 10_080),
            expires_at: isoDate(payload.expires_at, "expires_at"),
          }).select("*").single(),
          "watch_create_failed",
        );
        await audit(sb, ownerId, "watch.created", "watch", watch.id, { query: queryText });
        await enqueue(sb, ownerId, "watch.created", "watch", watch.id, { watch_id: watch.id }, `watch.created:${watch.id}`);
        return jsonResponse({ ok: true, data: { watch } }, 201);
      }

      case "watch.list": {
        const limit = integer(payload.limit, "limit", 25, 1, 100);
        const before = cursor(payload.cursor);
        let query = sb.from("waouh_watchlists").select("*").eq("owner_id", ownerId)
          .order("created_at", { ascending: false }).limit(limit);
        if (payload.status) query = query.eq("status", asString(payload.status, "status", 2, 32));
        if (before) query = query.lt("created_at", before);
        const { data, error } = await query;
        if (error) throw new ApiError(500, "watch_list_failed", error.message);
        const watches = data ?? [];
        return jsonResponse({ ok: true, data: { watches, items: watches, next_cursor: listMeta(watches, limit) } });
      }

      case "watch.update": {
        const watchId = uuid(payload.watch_id, "watch_id");
        const existing = await queryOne<any>(sb.from("waouh_watchlists").select("*").eq("id", watchId).eq("owner_id", ownerId).maybeSingle(), "watch_not_found");
        const patch: JsonObject = {};
        if (payload.query != null) patch.query = asString(payload.query, "query", 2, 1_000);
        if (payload.target_amount !== undefined) patch.target_amount = positiveNumber(payload.target_amount, "target_amount", true);
        if (payload.source_url !== undefined) patch.source_url = safeUrl(payload.source_url, "source_url");
        if (payload.check_interval_minutes != null) patch.check_interval_minutes = integer(payload.check_interval_minutes, "check_interval_minutes", 60, 15, 10_080);
        if (payload.expires_at !== undefined) patch.expires_at = isoDate(payload.expires_at, "expires_at");
        if (payload.status != null) patch.status = pickEnum(payload.status, "status", ["active", "paused"] as const);
        if (Object.keys(patch).length === 0) return jsonResponse({ ok: true, data: { watch: existing } });
        const { data, error } = await sb.from("waouh_watchlists").update(patch).eq("id", watchId).eq("owner_id", ownerId).select("*").single();
        if (error) throw new ApiError(500, "watch_update_failed", error.message);
        await audit(sb, ownerId, "watch.updated", "watch", watchId, { fields: Object.keys(patch) });
        return jsonResponse({ ok: true, data: { watch: data } });
      }

      case "watch.delete": {
        const watchId = uuid(payload.watch_id, "watch_id");
        await queryOne<any>(sb.from("waouh_watchlists").select("id").eq("id", watchId).eq("owner_id", ownerId).maybeSingle(), "watch_not_found");
        const { error } = await sb.from("waouh_watchlists").delete().eq("id", watchId).eq("owner_id", ownerId);
        if (error) throw new ApiError(500, "watch_delete_failed", error.message);
        await audit(sb, ownerId, "watch.deleted", "watch", watchId);
        return jsonResponse({ ok: true, data: { deleted: true, watch_id: watchId } });
      }

      case "watch.observe": {
        const watchId = uuid(payload.watch_id, "watch_id");
        const watch = await queryOne<any>(sb.from("waouh_watchlists").select("*").eq("id", watchId).eq("owner_id", ownerId).maybeSingle(), "watch_not_found");
        const amount = positiveNumber(payload.amount, "amount")!;
        const available = bool(payload.available, true);
        const previous = watch.last_observed_amount == null ? null : Number(watch.last_observed_amount);
        const source = pickEnum(payload.source, "source", ["manual"] as const, "manual");
        const observation = await queryOne<any>(
          sb.from("waouh_price_observations").insert({
            watchlist_id: watchId,
            owner_id: ownerId,
            article_id: watch.article_id,
            // Browser/API observations are written by trusted workers directly; users may only add manual evidence.
            source,
            source_url: safeUrl(payload.source_url, "source_url") ?? watch.source_url,
            amount,
            previous_amount: previous,
            currency: "XOF",
            available,
            evidence: jsonObject(payload.evidence, "evidence"),
          }).select("*").single(),
          "observation_create_failed",
        );
        const targetReached = watch.target_amount != null && amount <= Number(watch.target_amount);
        const priceDropped = previous != null && amount < previous;
        const nextCheckAt = new Date(Date.now() + Number(watch.check_interval_minutes) * 60_000).toISOString();
        const nextStatus = targetReached ? "triggered" : watch.status;
        const { error: updateError } = await sb.from("waouh_watchlists").update({
          last_observed_amount: amount,
          last_checked_at: new Date().toISOString(),
          next_check_at: nextCheckAt,
          status: nextStatus,
        }).eq("id", watchId);
        if (updateError) throw new ApiError(500, "watch_observation_update_failed", updateError.message);
        if (targetReached || priceDropped) {
          const eventType = targetReached ? "target_reached" : "price_drop";
          const event = await queryOne<any>(
            sb.from("waouh_watch_events").insert({
              watchlist_id: watchId,
              owner_id: ownerId,
              observation_id: observation.id,
              event_type: eventType,
              title: targetReached ? "Prix cible atteint" : "Baisse de prix détectée",
              body: `${amount.toLocaleString("fr-FR")} FCFA`,
              payload: { amount, previous_amount: previous },
            }).select("*").single(),
            "watch_event_create_failed",
          );
          await enqueue(sb, ownerId, `watch.${eventType}`, "watch", watchId, { watch_id: watchId, event_id: event.id }, `watch.${eventType}:${observation.id}`);
        }
        return jsonResponse({ ok: true, data: { observation, triggered: targetReached || priceDropped, status: nextStatus } }, 201);
      }

      case "watch.events": {
        const limit = integer(payload.limit, "limit", 50, 1, 100);
        const before = cursor(payload.cursor);
        let query = sb.from("waouh_watch_events").select("*").eq("owner_id", ownerId)
          .order("created_at", { ascending: false }).limit(limit);
        if (payload.watch_id) query = query.eq("watchlist_id", uuid(payload.watch_id, "watch_id"));
        if (payload.unread_only === true) query = query.is("read_at", null);
        if (before) query = query.lt("created_at", before);
        const { data, error } = await query;
        if (error) throw new ApiError(500, "watch_events_failed", error.message);
        const events = data ?? [];
        return jsonResponse({ ok: true, data: { events, items: events, next_cursor: listMeta(events, limit) } });
      }

      case "watch.event.read": {
        const eventId = uuid(payload.event_id, "event_id");
        const { data, error } = await sb.from("waouh_watch_events")
          .update({ read_at: new Date().toISOString() }).eq("id", eventId).eq("owner_id", ownerId)
          .select("*").maybeSingle();
        if (error) throw new ApiError(500, "watch_event_update_failed", error.message);
        if (!data) throw new ApiError(404, "watch_event_not_found");
        return jsonResponse({ ok: true, data: { event: data } });
      }

      case "activity.list": {
        const limit = integer(payload.limit, "limit", 50, 1, 100);
        const before = cursor(payload.cursor);
        let query = sb.from("waouh_agent_audit_log").select("*").eq("owner_id", ownerId)
          .order("created_at", { ascending: false }).limit(limit);
        if (payload.mission_id) query = query.eq("mission_id", uuid(payload.mission_id, "mission_id"));
        if (before) query = query.lt("created_at", before);
        const { data, error } = await query;
        if (error) throw new ApiError(500, "activity_list_failed", error.message);
        const activities = data ?? [];
        return jsonResponse({ ok: true, data: { activities, items: activities, next_cursor: listMeta(activities, limit) } });
      }

      case "approval.request": {
        const missionId = payload.mission_id ? uuid(payload.mission_id, "mission_id") : null;
        if (missionId) await ownedMission(sb, ownerId, missionId);
        const actionType = pickEnum(payload.action_type, "action_type", [...ALLOWED_APPROVAL_ACTIONS]);
        const context = jsonObject(payload.context, "context");
        ensureNoFinancialAction(actionType, context);
        const approval = await queryOne<any>(
          sb.from("waouh_agent_approvals").insert({
            owner_id: ownerId,
            mission_id: missionId,
            step_id: payload.step_id ? uuid(payload.step_id, "step_id") : null,
            action_type: actionType,
            action_summary: asString(payload.action_summary, "action_summary", 3, 500),
            context,
            expires_at: isoDate(payload.expires_at, "expires_at") ?? new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
          }).select("*").single(),
          "approval_create_failed",
        );
        await audit(sb, ownerId, "approval.requested", "approval", approval.id, { action_type: actionType }, missionId);
        return jsonResponse({ ok: true, data: { approval } }, 201);
      }

      case "approval.list": {
        const limit = integer(payload.limit, "limit", 50, 1, 100);
        let query = sb.from("waouh_agent_approvals").select("*").eq("owner_id", ownerId)
          .order("created_at", { ascending: false }).limit(limit);
        if (payload.status) query = query.eq("status", asString(payload.status, "status", 2, 20));
        const before = cursor(payload.cursor);
        if (before) query = query.lt("created_at", before);
        const { data, error } = await query;
        if (error) throw new ApiError(500, "approval_list_failed", error.message);
        const approvals = data ?? [];
        return jsonResponse({ ok: true, data: { approvals, items: approvals, next_cursor: listMeta(approvals, limit) } });
      }

      case "approval.decide": {
        const approvalId = uuid(payload.approval_id, "approval_id");
        const decision = pickEnum(payload.decision, "decision", ["approved", "rejected"] as const);
        const approval = await queryOne<any>(
          sb.from("waouh_agent_approvals").select("*").eq("id", approvalId).eq("owner_id", ownerId).maybeSingle(),
          "approval_not_found",
        );
        if (approval.status !== "pending") throw new ApiError(409, "approval_already_decided");
        if (Date.parse(approval.expires_at) <= Date.now()) {
          await sb.from("waouh_agent_approvals").update({ status: "expired" }).eq("id", approvalId);
          throw new ApiError(409, "approval_expired");
        }
        const { data, error } = await sb.from("waouh_agent_approvals").update({
          status: decision,
          decision_note: optionalString(payload.note, "note", 1_000),
          decided_at: new Date().toISOString(),
        }).eq("id", approvalId).eq("status", "pending").select("*").single();
        if (error) throw new ApiError(500, "approval_decide_failed", error.message);
        if (approval.step_id) {
          await sb.from("waouh_agent_steps").update({ status: decision === "approved" ? "queued" : "cancelled" }).eq("id", approval.step_id);
        }
        await audit(sb, ownerId, `approval.${decision}`, "approval", approvalId, { action_type: approval.action_type }, approval.mission_id);
        await enqueue(sb, ownerId, `approval.${decision}`, "approval", approvalId, { approval_id: approvalId }, `approval.${decision}:${approvalId}`, approval.mission_id);
        return jsonResponse({ ok: true, data: { approval: data } });
      }

      case "seller_policy.get": {
        let query = sb.from("waouh_seller_policies").select("*").eq("owner_id", ownerId).eq("active", true);
        if (payload.article_id) query = query.eq("article_id", uuid(payload.article_id, "article_id"));
        if (payload.business_id) query = query.eq("business_id", uuid(payload.business_id, "business_id"));
        const { data, error } = await query.order("updated_at", { ascending: false });
        if (error) throw new ApiError(500, "seller_policy_get_failed", error.message);
        const policies = data ?? [];
        return jsonResponse({ ok: true, data: { policy: policies[0] ?? null, policies, items: policies } });
      }

      case "seller_policy.upsert": {
        const articleId = payload.article_id ? uuid(payload.article_id, "article_id") : null;
        const businessId = payload.business_id ? uuid(payload.business_id, "business_id") : null;
        if (articleId) await ownedArticle(sb, ownerId, articleId);
        if (businessId) await ownedBusiness(sb, ownerId, businessId);
        const values = {
          owner_id: ownerId,
          article_id: articleId,
          business_id: businessId,
          mode: pickEnum(payload.mode, "mode", ["manual", "assisted", "automatic"] as const),
          min_price_amount: positiveNumber(payload.min_price_amount, "min_price_amount", true),
          max_discount_percent: positiveNumber(payload.max_discount_percent, "max_discount_percent", true),
          allow_counteroffers: bool(payload.allow_counteroffers, true),
          auto_expire_minutes: integer(payload.auto_expire_minutes, "auto_expire_minutes", 1_440, 15, 43_200),
          delivery_zones: stringArray(payload.delivery_zones, "delivery_zones"),
          rules: jsonObject(payload.rules, "rules"),
          active: true,
        };
        if (values.max_discount_percent != null && values.max_discount_percent > 100) throw new ApiError(422, "invalid_max_discount_percent");
        let existingQuery = sb.from("waouh_seller_policies").select("id").eq("owner_id", ownerId).eq("active", true);
        existingQuery = articleId ? existingQuery.eq("article_id", articleId) : existingQuery.is("article_id", null);
        existingQuery = businessId ? existingQuery.eq("business_id", businessId) : existingQuery.is("business_id", null);
        const { data: existing, error: findError } = await existingQuery.maybeSingle();
        if (findError) throw new ApiError(500, "seller_policy_lookup_failed", findError.message);
        const mutation = existing
          ? sb.from("waouh_seller_policies").update(values).eq("id", existing.id).select("*").single()
          : sb.from("waouh_seller_policies").insert(values).select("*").single();
        const policy = await queryOne<any>(mutation, "seller_policy_save_failed");
        await audit(sb, ownerId, existing ? "seller_policy.updated" : "seller_policy.created", "seller_policy", policy.id, { mode: policy.mode });
        return jsonResponse({ ok: true, data: { policy } }, existing ? 200 : 201);
      }

      case "offer.create": {
        const missionId = uuid(payload.mission_id, "mission_id");
        const articleId = uuid(payload.article_id, "article_id");
        const mission = await queryOne<any>(sb.from("waouh_agent_missions").select("id,owner_id,status").eq("id", missionId).maybeSingle(), "mission_not_found");
        if (["cancelled", "failed", "completed"].includes(mission.status)) throw new ApiError(409, "mission_not_active");
        const article = await ownedArticle(sb, ownerId, articleId);
        const amount = positiveNumber(payload.amount, "amount")!;
        const quantity = integer(payload.quantity, "quantity", 1, 1, 10_000);
        const { data: policies, error: policyError } = await sb.from("waouh_seller_policies")
          .select("*").eq("owner_id", ownerId).eq("active", true)
          .or(`article_id.eq.${articleId},and(article_id.is.null,business_id.is.null)`)
          .order("article_id", { ascending: false, nullsFirst: false }).limit(1);
        if (policyError) throw new ApiError(500, "seller_policy_lookup_failed", policyError.message);
        const policy = policies?.[0] ?? null;
        if (policy?.min_price_amount != null && amount < Number(policy.min_price_amount)) throw new ApiError(422, "offer_below_policy_floor");
        if (policy?.max_discount_percent != null && article.price != null) {
          const floor = Number(article.price) * (1 - Number(policy.max_discount_percent) / 100);
          if (amount < floor) throw new ApiError(422, "offer_exceeds_discount_policy");
        }
        const expiresAt = isoDate(payload.expires_at, "expires_at")
          ?? new Date(Date.now() + Number(policy?.auto_expire_minutes ?? 1_440) * 60_000).toISOString();
        if (Date.parse(expiresAt) <= Date.now()) throw new ApiError(422, "offer_expiry_must_be_future");
        const offer = await queryOne<any>(
          sb.from("waouh_signed_offers").insert({
            mission_id: missionId,
            article_id: articleId,
            seller_policy_id: policy?.id ?? null,
            issuer_id: ownerId,
            buyer_id: mission.owner_id,
            seller_id: ownerId,
            amount,
            currency: "XOF",
            quantity,
            terms: jsonObject(payload.terms, "terms"),
            expires_at: expiresAt,
          }).select("*").single(),
          "offer_create_failed",
        );
        await sb.from("waouh_offer_events").insert({ offer_id: offer.id, buyer_id: offer.buyer_id, seller_id: offer.seller_id, actor_id: ownerId, event_type: "proposed", payload: { amount, currency: "XOF" } });
        await audit(sb, ownerId, "offer.created", "offer", offer.id, { amount, currency: "XOF" }, missionId);
        await audit(sb, mission.owner_id, "offer.received", "offer", offer.id, { article_id: articleId }, missionId, ownerId);
        await enqueue(sb, mission.owner_id, "offer.proposed", "offer", offer.id, { offer_id: offer.id, mission_id: missionId }, `offer.proposed:${offer.id}`, missionId);
        return jsonResponse({ ok: true, data: { offer } }, 201);
      }

      case "offer.list": {
        const limit = integer(payload.limit, "limit", 50, 1, 100);
        const before = cursor(payload.cursor);
        let query = sb.from("waouh_signed_offers").select("*")
          .or(`buyer_id.eq.${ownerId},seller_id.eq.${ownerId}`).order("created_at", { ascending: false }).limit(limit);
        if (payload.mission_id) query = query.eq("mission_id", uuid(payload.mission_id, "mission_id"));
        if (payload.status) query = query.eq("status", asString(payload.status, "status", 2, 24));
        if (before) query = query.lt("created_at", before);
        const { data, error } = await query;
        if (error) throw new ApiError(500, "offer_list_failed", error.message);
        const offers = data ?? [];
        return jsonResponse({ ok: true, data: { offers, items: offers, next_cursor: listMeta(offers, limit) } });
      }

      case "offer.respond": {
        const offerId = uuid(payload.offer_id, "offer_id");
        const decision = pickEnum(payload.decision, "decision", ["accept", "reject", "counter"] as const);
        const offer = await queryOne<any>(
          sb.from("waouh_signed_offers").select("*").eq("id", offerId)
            .or(`buyer_id.eq.${ownerId},seller_id.eq.${ownerId}`).maybeSingle(),
          "offer_not_found",
        );
        if (offer.issuer_id === ownerId) throw new ApiError(409, "issuer_cannot_respond");
        if (offer.status !== "proposed") throw new ApiError(409, "offer_not_open");
        if (Date.parse(offer.expires_at) <= Date.now()) {
          await sb.from("waouh_signed_offers").update({ status: "expired", responded_at: new Date().toISOString() }).eq("id", offerId);
          throw new ApiError(409, "offer_expired");
        }
        const now = new Date().toISOString();
        const nextStatus = decision === "accept" ? "accepted" : decision === "reject" ? "rejected" : "countered";
        const { data: updated, error: updateError } = await sb.from("waouh_signed_offers")
          .update({ status: nextStatus, responded_at: now, response_note: optionalString(payload.note, "note", 1_000) })
          .eq("id", offerId).eq("status", "proposed").select("*").single();
        if (updateError) throw new ApiError(500, "offer_response_failed", updateError.message);
        let counterOffer = null;
        if (decision === "counter") {
          const counterAmount = positiveNumber(payload.counter_amount, "counter_amount")!;
          const expiresAt = new Date(Date.now() + 24 * 60 * 60_000).toISOString();
          counterOffer = await queryOne<any>(
            sb.from("waouh_signed_offers").insert({
              mission_id: offer.mission_id,
              article_id: offer.article_id,
              seller_policy_id: offer.seller_policy_id,
              parent_offer_id: offer.id,
              issuer_id: ownerId,
              buyer_id: offer.buyer_id,
              seller_id: offer.seller_id,
              amount: counterAmount,
              currency: "XOF",
              quantity: offer.quantity,
              terms: offer.terms,
              expires_at: expiresAt,
            }).select("*").single(),
            "counter_offer_create_failed",
          );
        }
        await sb.from("waouh_offer_events").insert({
          offer_id: offer.id,
          buyer_id: offer.buyer_id,
          seller_id: offer.seller_id,
          actor_id: ownerId,
          event_type: decision === "accept" ? "accepted" : decision === "reject" ? "rejected" : "countered",
          payload: counterOffer ? { counter_offer_id: counterOffer.id, amount: counterOffer.amount } : {},
        });
        const otherParty = ownerId === offer.buyer_id ? offer.seller_id : offer.buyer_id;
        await audit(sb, ownerId, `offer.${nextStatus}`, "offer", offer.id, {}, offer.mission_id);
        await audit(sb, otherParty, `offer.${nextStatus}`, "offer", offer.id, {}, offer.mission_id, ownerId);
        await enqueue(sb, otherParty, `offer.${nextStatus}`, "offer", offer.id, { offer_id: offer.id, counter_offer_id: counterOffer?.id ?? null }, `offer.${nextStatus}:${offer.id}`, offer.mission_id);
        return jsonResponse({ ok: true, data: { offer: updated, counter_offer: counterOffer } });
      }

      case "nexus.summary": {
        const userRows = await sb.from("waouh_users").select("id").eq("auth_user_id", ownerId);
        if (userRows.error) throw new ApiError(500, "nexus_user_lookup_failed", userRows.error.message);
        const waouhUserIds = (userRows.data ?? []).map((row: any) => row.id);
        const sellerArticleQuery = waouhUserIds.length
          ? sb.from("waouh_articles").select("id", { count: "exact", head: true }).in("seller_id", waouhUserIds).eq("status", "active")
          : Promise.resolve({ count: 0, error: null } as any);
        const buyerProfileQuery = waouhUserIds.length
          ? sb.from("waouh_buyer_profiles").select("id", { count: "exact", head: true }).in("user_id", waouhUserIds).eq("is_active", true)
          : Promise.resolve({ count: 0, error: null } as any);
        const [missions, watches, approvals, offers, sellerArticles, buyerProfiles, preference] = await Promise.all([
          sb.from("waouh_agent_missions").select("id", { count: "exact", head: true }).eq("owner_id", ownerId).in("status", ["active", "planning", "paused"]),
          sb.from("waouh_watchlists").select("id", { count: "exact", head: true }).eq("owner_id", ownerId).eq("status", "active"),
          sb.from("waouh_agent_approvals").select("id", { count: "exact", head: true }).eq("owner_id", ownerId).eq("status", "pending"),
          sb.from("waouh_signed_offers").select("id", { count: "exact", head: true }).or(`buyer_id.eq.${ownerId},seller_id.eq.${ownerId}`).eq("status", "proposed"),
          sellerArticleQuery,
          buyerProfileQuery,
          getNexusPreference(sb, ownerId),
        ]);
        for (const result of [missions, watches, approvals, offers, sellerArticles, buyerProfiles]) {
          if ((result as any).error) throw new ApiError(500, "nexus_summary_failed", (result as any).error.message);
        }
        return jsonResponse({ ok: true, data: {
          missions: missions.count ?? 0,
          watches: watches.count ?? 0,
          approvals: approvals.count ?? 0,
          offers: offers.count ?? 0,
          seller_articles: (sellerArticles as any).count ?? 0,
          buyer_intents: (buyerProfiles as any).count ?? 0,
          preference,
        } });
      }

      case "nexus.preferences.get": {
        const preference = await getNexusPreference(sb, ownerId);
        return jsonResponse({ ok: true, data: { preference } });
      }

      case "nexus.preferences.upsert": {
        const boundedWeight = (value: unknown, name: string, fallback: number) => {
          const parsed = value == null ? fallback : positiveNumber(value, name)!;
          if (parsed > 1) throw new ApiError(422, `invalid_${name}`);
          return parsed;
        };
        const values = {
          owner_id: ownerId,
          mode: pickEnum(payload.mode, "mode", ["buyer", "seller", "both"] as const, "both"),
          relevance_weight: boundedWeight(payload.relevance_weight, "relevance_weight", 0.30),
          price_weight: boundedWeight(payload.price_weight, "price_weight", 0.24),
          trust_weight: boundedWeight(payload.trust_weight, "trust_weight", 0.18),
          location_weight: boundedWeight(payload.location_weight, "location_weight", 0.10),
          freshness_weight: boundedWeight(payload.freshness_weight, "freshness_weight", 0.10),
          availability_weight: boundedWeight(payload.availability_weight, "availability_weight", 0.08),
          contact_mode: pickEnum(payload.contact_mode, "contact_mode", ["manual", "approval", "auto_opted_in"] as const, "approval"),
          auto_negotiate: bool(payload.auto_negotiate, false),
          max_auto_discount_percent: positiveNumber(payload.max_auto_discount_percent, "max_auto_discount_percent", true),
          preferred_city: optionalString(payload.preferred_city, "preferred_city", 120),
          metadata: jsonObject(payload.metadata, "metadata"),
        };
        if (values.max_auto_discount_percent != null && values.max_auto_discount_percent > 100) {
          throw new ApiError(422, "invalid_max_auto_discount_percent");
        }
        const preference = await queryOne<any>(
          sb.from("waouh_nexus_preferences").upsert(values, { onConflict: "owner_id" }).select("*").single(),
          "nexus_preferences_save_failed",
        );
        await audit(sb, ownerId, "nexus.preferences.updated", "nexus_preferences", null, {
          mode: preference.mode,
          contact_mode: preference.contact_mode,
          auto_negotiate: preference.auto_negotiate,
        });
        return jsonResponse({ ok: true, data: { preference } });
      }


      case "nexus.identify_visual": {
        const imageUrl = safeUrl(payload.image_url, "image_url");
        if (!imageUrl) throw new ApiError(422, "image_url_required");
        const imageHost = new URL(imageUrl).hostname;
        const storageHost = new URL(supabaseUrl).hostname;
        if (imageHost !== storageHost) throw new ApiError(422, "untrusted_image_host");
        const hint = optionalString(payload.hint, "hint", 500);
        let identification: any = {};
        try {
          const raw = await visionCompletion({
            imageUrl,
            jsonMode: true,
            temperature: 0.05,
            prompt: `Identifie le produit visible pour une recherche commerciale au Bénin.
Retourne uniquement JSON: {product,brand,model,category,condition,color,variant,gtin_visible,confidence,search_query,notes}.
- N'invente pas marque/modèle/GTIN s'ils ne sont pas visibles ou raisonnablement identifiables.
- confidence entre 0 et 1.
- search_query doit être courte et utile pour comparer ce produit.
Indice utilisateur: ${hint ?? "aucun"}`,
          });
          identification = JSON.parse(raw);
        } catch (error) {
          console.warn("[waouh-nexus] vision fallback", error instanceof Error ? error.message : error);
          if (!hint) throw new ApiError(502, "visual_identification_failed");
          identification = { product: hint, search_query: hint, confidence: 0.25, notes: "fallback_text_hint" };
        }
        const query = String(identification.search_query || [
          identification.brand, identification.model, identification.product, identification.variant,
        ].filter(Boolean).join(" ") || hint || "produit").trim().slice(0, 500);
        await audit(sb, ownerId, "nexus.visual_identified", "media", null, {
          query,
          confidence: Number(identification.confidence ?? 0),
        });
        return jsonResponse({ ok: true, data: { identification, query, image_url: imageUrl } });
      }

      case "nexus.barcode_lookup": {
        const code = asString(payload.code, "code", 6, 32).replace(/[^0-9A-Za-z-]/g, "");
        const [articles, catalog, scouts] = await Promise.all([
          sb.from("waouh_articles")
            .select("id,title,brand,model,price,currency,city,photos,status,source_channel,gtin")
            .eq("gtin", code).eq("status", "active").limit(20),
          sb.from("waouh_unified_catalog")
            .select("id,titre,prix_min,prix_max,devise,ville,photos,source,is_active,gtin,promoted_article_id")
            .eq("gtin", code).eq("is_active", true).limit(20),
          sb.from("waouh_scout_reports")
            .select("id,title,observed_price,currency,city,place_name,availability,observed_at,gtin,trust_state")
            .eq("gtin", code).order("observed_at", { ascending: false }).limit(20),
        ]);
        for (const result of [articles, catalog, scouts]) {
          if (result.error) throw new ApiError(500, "barcode_lookup_failed", result.error.message);
        }
        const title = articles.data?.[0]?.title ?? catalog.data?.[0]?.titre ?? scouts.data?.[0]?.title ?? null;
        const query = title ? String(title) : code;
        return jsonResponse({ ok: true, data: {
          code, query, articles: articles.data ?? [], catalog: catalog.data ?? [], observations: scouts.data ?? [],
        } });
      }

      case "nexus.market_history": {
        const queryText = asString(payload.query, "query", 2, 1000);
        const city = optionalString(payload.city, "city", 120);
        const limit = integer(payload.limit, "limit", 30, 1, 120);
        let q = sb.from("waouh_market_snapshots")
          .select("id,query,canonical_key,category,city,min_amount,median_amount,max_amount,average_amount,sample_count,source_mix,observed_at")
          .eq("owner_id", ownerId)
          .ilike("query", `%${queryText.replace(/[%_]/g, "")}%`)
          .order("observed_at", { ascending: false }).limit(limit);
        if (city) q = q.ilike("city", city);
        const { data, error } = await q;
        if (error) throw new ApiError(500, "market_history_failed", error.message);
        return jsonResponse({ ok: true, data: { query: queryText, points: (data ?? []).reverse() } });
      }


      case "nexus.signal.ingest": {
        const sourceKey = pickEnum(
          payload.source_key,
          "source_key",
          ["share_to_waouh","b2b_rfq"] as const,
          "share_to_waouh",
        );
        const originSurface = optionalString(payload.origin_surface, "origin_surface", 80);
        const sourceUrl = safeUrl(payload.source_url, "source_url");
        const imageUrl = safeUrl(payload.image_url, "image_url");
        let rawText = optionalString(payload.raw_text, "raw_text", 20_000) ?? "";
        let visualExtraction: Record<string, unknown> | null = null;

        if (imageUrl) {
          const imageHost = new URL(imageUrl).hostname;
          const storageHost = new URL(supabaseUrl).hostname;
          if (imageHost !== storageHost) throw new ApiError(422, "untrusted_image_host");
          try {
            const visualRaw = await visionCompletion({
              imageUrl,
              jsonMode: true,
              temperature: 0.05,
              prompt: `Analyse cette capture/photo comme un signal commercial au Bénin.
Retourne uniquement JSON:
{transcription,intent,actor_name,actor_handle,product_name,category,brand,model,condition,quantity,unit,price_min,price_max,city,phones,emails,availability,confidence}.
- intent parmi BUY, SELL, ANNOUNCE, RFQ, UNKNOWN.
- Extrais seulement les coordonnées réellement visibles.
- Montants numériques en FCFA quand identifiable.
- N'invente rien.`,
            });
            visualExtraction = JSON.parse(visualRaw);
            const transcription = typeof visualExtraction?.transcription === "string" ? visualExtraction.transcription : "";
            rawText = [rawText, transcription, JSON.stringify(visualExtraction)].filter(Boolean).join("\n").slice(0, 20_000);
          } catch (error) {
            console.warn("[waouh-global-discovery] visual share fallback", error instanceof Error ? error.message : error);
            if (!rawText && !sourceUrl) throw new ApiError(502, "shared_image_analysis_failed");
          }
        }

        if (!rawText && !sourceUrl) throw new ApiError(422, "signal_content_required");
        const visualPhones = Array.isArray(visualExtraction?.phones)
          ? visualExtraction!.phones.filter((v): v is string => typeof v === "string")
          : [];
        const visualEmails = Array.isArray(visualExtraction?.emails)
          ? visualExtraction!.emails.filter((v): v is string => typeof v === "string")
          : [];
        const signalInput: JsonObject = {
          ...payload,
          source_key: sourceKey,
          raw_text: rawText,
          source_url: sourceUrl,
          contact_phones: [...stringArray(payload.contact_phones, "contact_phones", 5), ...visualPhones].slice(0, 5),
          contact_emails: [...stringArray(payload.contact_emails, "contact_emails", 5), ...visualEmails].slice(0, 5),
          contact_consent_basis: sourceKey === "b2b_rfq" ? "initiated" : "shared_by_user",
          public_business: false,
          evidence: {
            ...jsonObject(payload.evidence, "evidence"),
            origin_surface: originSurface,
            user_shared: true,
            image_url: imageUrl,
            visual_extraction: visualExtraction,
          },
        };
        const result = await ingestCommerceSignal(
          sb,
          ownerId,
          signalInput,
          { expectedIntent: sourceKey === "b2b_rfq" ? "RFQ" : null },
        );
        await audit(sb, ownerId, "nexus.signal.ingested", "commerce_signal", result.signal.id, {
          source_key: sourceKey,
          intent: result.signal.intent,
          actor_type: result.signal.actor_type,
          contactability: result.signal.contactability_level,
        });
        return jsonResponse({ ok: true, data: {
          signal: {
            id: result.signal.id,
            source_key: result.signal.source_key,
            intent: result.signal.intent,
            actor_type: result.signal.actor_type,
            product_name: result.signal.product_name,
            category: result.signal.category,
            price_min: result.signal.price_min,
            price_max: result.signal.price_max,
            city: result.signal.city,
            confidence: result.signal.confidence,
            contactability_level: result.signal.contactability_level,
          },
          entity: {
            id: result.entity.id,
            entity_type: result.entity.entity_type,
            primary_name: result.entity.primary_name,
            verification_state: result.entity.verification_state,
            trust_score: result.entity.trust_score,
          },
          contact_policy: result.contactability,
        } }, 201);
      }

      case "nexus.source.sync": {
        const provider = pickEnum(
          payload.provider,
          "provider",
          [
            "serpapi",
            "apify",
            "firecrawl",
            "google_places",
            "facebook_business",
            "instagram_business",
            "telegram_public",
            "tiktok_connected",
            "whatsapp_groups",
            "sms_rcs",
          ] as const,
        );
        const queryText = optionalString(payload.query, "query", 500) ?? "commerce";
        const city = optionalString(payload.city, "city", 120);
        const mode = pickEnum(
          payload.mode,
          "mode",
          ["find_sellers","find_buyers"] as const,
          "find_sellers",
        );
        const limit = integer(payload.limit, "limit", 12, 1, 30);

        let result: any;
        if (provider === "serpapi") {
          result = await refreshSerpApi(sb, ownerId, mode, queryText, city, limit);
        } else if (provider === "apify") {
          result = await refreshApifyRadar(sb);
        } else if (provider === "google_places") {
          result = await refreshGooglePlaces(sb, ownerId, queryText, city, Math.min(limit, 20));
        } else if (provider === "facebook_business") {
          result = await refreshFacebookBusiness(sb, ownerId, queryText, Math.min(limit, 20));
        } else if (provider === "instagram_business") {
          result = await refreshInstagramBusiness(sb, ownerId, queryText, Math.min(limit, 20));
        } else if (provider === "telegram_public") {
          result = await refreshTelegramPublic(sb, ownerId, queryText, Math.min(limit, 30));
        } else if (provider === "tiktok_connected") {
          result = await refreshTikTokConnected(sb, ownerId, queryText, Math.min(limit, 20));
        } else if (provider === "firecrawl") {
          const serviceUrl = Deno.env.get("SUPABASE_URL") || "";
          const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
          if (!serviceUrl || !serviceKey) {
            result = { configured: false, inserted: 0, reason: "server_not_configured" };
          } else {
            try {
              const response = await fetch(`${serviceUrl}/functions/v1/waouh-radar-site-scraper`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${serviceKey}`,
                  apikey: serviceKey,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ source: "nexus.source.sync" }),
                signal: AbortSignal.timeout(30000),
              });
              const data = await response.json().catch(() => ({}));
              result = {
                configured: true,
                inserted: Number(data?.signals ?? 0),
                reason: response.ok ? null : (data?.error || `HTTP ${response.status}`),
                details: data,
              };
              await markRadarProviderSync(
                sb as any,
                "firecrawl",
                response.ok ? "ok" : "ko",
                response.ok ? `${Number(data?.signals ?? 0)} signaux sites Web` : String(result.reason),
              );
            } catch (error: any) {
              result = { configured: true, inserted: 0, reason: error?.message || String(error) };
              await markRadarProviderSync(sb as any, "firecrawl", "ko", String(result.reason));
            }
          }
        } else if (provider === "whatsapp_groups") {
          const { count } = await sb.from("waouh_radar_sources")
            .select("id", { count: "exact", head: true })
            .eq("type", "wa_group")
            .eq("active", true);
          result = {
            configured: true,
            inserted: 0,
            push_mode: true,
            active_group_count: count ?? 0,
            reason: "webhook_realtime_allowlist",
          };
        } else {
          const { data: settings } = await sb.from("waouh_tel_settings")
            .select("enabled").eq("key", "default").maybeSingle();
          result = {
            configured: settings?.enabled === true,
            inserted: 0,
            push_mode: true,
            reason: settings?.enabled === true ? "native_inbound_active" : "native_messaging_disabled",
          };
        }

        await audit(sb, ownerId, "nexus.source.sync", "discovery_source", null, {
          provider,
          query: queryText,
          city,
          mode,
          inserted: Number(result?.inserted ?? 0),
          configured: result?.configured !== false,
          reason: result?.reason ?? null,
        });
        return jsonResponse({ ok: true, data: { provider, ...result } });
      }

      case "nexus.google_places.search": {
        const queryText = asString(payload.query, "query", 2, 500);
        const city = optionalString(payload.city, "city", 120);
        const limit = integer(payload.limit, "limit", 10, 1, 20);
        const refreshed = await refreshGooglePlaces(sb, ownerId, queryText, city, limit);
        await audit(sb, ownerId, "nexus.google_places.search", "discovery_source", null, {
          query: queryText, city, configured: refreshed.configured, inserted: refreshed.inserted,
        });
        return jsonResponse({ ok: true, data: refreshed });
      }

      case "nexus.global_discovery": {
        const queryText = asString(payload.query, "query", 2, 1000);
        const requestedMode = pickEnum(
          payload.mode,
          "mode",
          ["auto","find_sellers","find_buyers"] as const,
          "auto",
        );
        const suppliedCity = optionalString(payload.city, "city", 120);
        const suppliedBudgetMax = positiveNumber(payload.budget_max, "budget_max", true);
        const limit = integer(payload.limit, "limit", 20, 1, 50);
        const refreshExternal = bool(payload.refresh_external, true);
        const smart = bool(payload.smart, true);

        const forcedMode: DiscoveryMode | null = requestedMode === "auto" ? null : requestedMode;
        const intelligence = (smart || requestedMode === "auto")
          ? await planNexusGoal(queryText, {
              mode: forcedMode,
              city: suppliedCity,
              budgetMax: suppliedBudgetMax,
            })
          : {
              mode: forcedMode ?? "find_sellers",
              normalized_query: queryText,
              city: suppliedCity,
              budget_max: suppliedBudgetMax,
              priorities: ["relevance", "trust", "price", "distance", "freshness", "contactability"],
              source_families: ["waouh", "partners", "web_public", "scout"],
              missing: [],
              next_actions: ["Comparer les résultats", "Préparer le contact sous contrôle"],
              confidence: 1,
              rationale: "Mode manuel appliqué sans replanification IA.",
            } satisfies NexusSmartDiscoveryPlan;

        const mode: DiscoveryMode = forcedMode ?? intelligence.mode;
        const semanticQuery = intelligence.normalized_query || queryText;
        const city = suppliedCity ?? intelligence.city ?? null;
        const budgetMax = mode === "find_sellers"
          ? (suppliedBudgetMax ?? intelligence.budget_max ?? null)
          : null;

        const refresh: Record<string, unknown> = {};
        if (refreshExternal) {
          const sourcePlan = new Set(intelligence.source_families ?? []);
          const useMaps = mode === "find_sellers" && (sourcePlan.size === 0 || sourcePlan.has("maps"));
          const usePublicWeb = sourcePlan.size === 0 || [
            "web_public", "social_public", "directories", "b2b_rfq",
          ].some((family) => sourcePlan.has(family));
          const useSocial = sourcePlan.size === 0 ||
            sourcePlan.has("social_public") || sourcePlan.has("web_public");

          const skipped = Promise.resolve({
            configured: true,
            inserted: 0,
            reason: "not_selected_by_ai_plan",
          });
          const [
            places,
            serp,
            facebook,
            instagram,
            telegram,
            tiktok,
            apify,
          ] = await Promise.all([
            useMaps
              ? refreshGooglePlaces(sb, ownerId, semanticQuery, city, Math.min(limit, 10))
              : skipped,
            usePublicWeb
              ? refreshSerpApi(sb, ownerId, mode, semanticQuery, city, Math.min(limit, 12))
              : Promise.resolve({
                  configured: true,
                  inserted: 0,
                  reason: "not_selected_by_ai_plan",
                  surfaces: {} as Record<string, number>,
                }),
            useSocial
              ? refreshFacebookBusiness(sb, ownerId, semanticQuery, Math.min(limit, 8))
              : skipped,
            useSocial
              ? refreshInstagramBusiness(sb, ownerId, semanticQuery, Math.min(limit, 8))
              : skipped,
            useSocial
              ? refreshTelegramPublic(sb, ownerId, semanticQuery, Math.min(limit, 12))
              : skipped,
            useSocial
              ? refreshTikTokConnected(sb, ownerId, semanticQuery, Math.min(limit, 10))
              : skipped,
            useSocial ? refreshApifyRadar(sb) : skipped,
          ]);

          refresh.google_places = {
            configured: places.configured,
            inserted: places.inserted,
            reason: places.reason ?? null,
          };
          refresh.serpapi = {
            configured: serp.configured,
            inserted: serp.inserted,
            reason: serp.reason ?? null,
            surfaces: (serp as any).surfaces ?? {},
          };
          refresh.facebook_business = facebook;
          refresh.instagram_business = instagram;
          refresh.telegram_public = telegram;
          refresh.tiktok_connected = tiktok;
          refresh.apify = apify;
        }

        const results = await globalDiscoverySearch(sb, {
          query: semanticQuery,
          mode,
          city,
          budgetMax,
          limit,
        });
        const sourceMix = results.reduce((acc: Record<string, number>, row: any) => {
          const key = String(row.source_key ?? "unknown");
          acc[key] = (acc[key] ?? 0) + 1;
          return acc;
        }, {});
        await audit(sb, ownerId, "nexus.global_discovery", "discovery", null, {
          requested_mode: requestedMode,
          resolved_mode: mode,
          query: queryText,
          normalized_query: semanticQuery,
          city,
          budget_max: budgetMax,
          result_count: results.length,
          source_mix: sourceMix,
          ai_confidence: intelligence.confidence,
        });
        return jsonResponse({ ok: true, data: {
          requested_mode: requestedMode,
          mode,
          query: queryText,
          normalized_query: semanticQuery,
          city,
          budget_max: budgetMax,
          results,
          source_mix: sourceMix,
          refresh,
          intelligence: {
            ...intelligence,
            mode,
            normalized_query: semanticQuery,
            city,
            budget_max: budgetMax,
          },
          explanation: mode === "find_sellers"
            ? "WAOUH a compris l’objectif et cherche les meilleures offres, vendeurs, entreprises et annonceurs à travers NEXUS et le Signal Fabric."
            : "WAOUH a compris l’objectif et cherche les demandes, acheteurs et RFQ compatibles à travers NEXUS et le Signal Fabric.",
        } });
      }

      case "nexus.contact.prepare": {
        const fabricId = asString(payload.fabric_id, "fabric_id", 5, 200);

        if (!fabricId.startsWith("external:")) {
          const signal = await queryOne<any>(
            sb.from("waouh_signal_fabric").select("*").eq("fabric_id", fabricId).maybeSingle(),
            "nexus_signal_not_found",
          );
          const policy = contactabilityPolicy(signal.contactability_level);
          const evidence = signal.evidence && typeof signal.evidence === "object"
            ? signal.evidence as Record<string, unknown>
            : {};

          let targetWaouhUserId: string | null = null;
          if (fabricId.startsWith("buyer:")) {
            targetWaouhUserId = typeof evidence.user_id === "string" ? evidence.user_id : null;
          } else if (fabricId.startsWith("article:")) {
            targetWaouhUserId = typeof evidence.seller_id === "string" ? evidence.seller_id : null;
          }

          let targetAuthUserId: string | null = null;
          let actorName: string | null = null;
          if (targetWaouhUserId) {
            const { data: targetUser, error: targetError } = await sb.from("waouh_users")
              .select("auth_user_id,display_name")
              .eq("id", targetWaouhUserId)
              .maybeSingle();
            if (targetError) throw new ApiError(500, "nexus_internal_target_failed", targetError.message);
            targetAuthUserId = targetUser?.auth_user_id ?? null;
            actorName = targetUser?.display_name ?? null;
          }

          const canBlindMessage =
            policy.level === "C2" &&
            !!targetAuthUserId &&
            targetAuthUserId !== ownerId;

          await audit(sb, ownerId, "nexus.contact.prepared", "commerce_signal", signal.source_record_id ?? null, {
            fabric_id: fabricId,
            contactability: policy.level,
            internal: true,
            can_blind_message: canBlindMessage,
          });

          return jsonResponse({ ok: true, data: {
            fabric_id: fabricId,
            kind: "internal",
            source_url: signal.source_url ?? null,
            actor_name: actorName,
            product_name: signal.subject ?? null,
            contact_policy: {
              ...policy,
              // Les parcours C3/C4 internes restent gérés par les flux WAOUH
              // intégrés tant qu'aucun connecteur contractuel dédié n'est résolu.
              can_auto_contact: false,
              can_blind_message: canBlindMessage,
            },
            contacts: [],
            note: canBlindMessage
              ? "WAOUH peut transmettre votre proposition à cet utilisateur sans révéler ses coordonnées privées. Le destinataire garde le contrôle."
              : policy.level === "C0"
                ? "Découverte uniquement : aucune donnée privée n’est révélée et aucun contact n’est initié."
                : policy.level === "C2"
                  ? "Le contact privé reste protégé. Utilisez le parcours WAOUH intégré lorsque la contrepartie devient joignable."
                  : "Cette opportunité interne reste gérée par le chat, l’intérêt, la négociation ou le connecteur partenaire WAOUH.",
          } });
        }

        const signalId = uuid(fabricId.slice("external:".length), "signal_id");
        const signal = await queryOne<any>(
          sb.from("waouh_external_commerce_signals").select("*").eq("id", signalId).maybeSingle(),
          "nexus_signal_not_found",
        );
        const policy = contactabilityPolicy(signal.contactability_level);
        const canBlindMessage = policy.level === "C2" && !!signal.submitted_by && signal.submitted_by !== ownerId;
        const contacts: any[] = [];
        if (policy.can_reveal && signal.entity_id) {
          const { data, error } = await sb.from("waouh_entity_contacts").select("*")
            .eq("entity_id", signal.entity_id)
            .order("contactability_level", { ascending: false });
          if (error) throw new ApiError(500, "nexus_contacts_failed", error.message);
          for (const contact of data ?? []) {
            const contactPolicy = contactabilityPolicy(contact.contactability_level);
            if (!contactPolicy.can_reveal) continue;
            let value: string | null = contact.public_value ?? null;
            if (!value && contact.value_encrypted) {
              try { value = await decryptPhone(contact.value_encrypted); } catch { value = null; }
            }
            if (!value) continue;
            contacts.push({
              id: contact.id,
              channel: contact.channel,
              value,
              value_last4: contact.value_last4,
              contactability_level: contact.contactability_level,
              consent_state: contact.consent_state,
              is_public_business: contact.is_public_business === true,
              can_auto_contact: contactPolicy.can_auto_contact,
            });
          }
        }
        await audit(sb, ownerId, "nexus.contact.prepared", "commerce_signal", signalId, {
          contactability: signal.contactability_level,
          revealed_count: contacts.length,
        });
        return jsonResponse({ ok: true, data: {
          fabric_id: fabricId,
          kind: "external",
          source_url: signal.source_url,
          actor_name: signal.actor_name,
          product_name: signal.product_name,
          contact_policy: { ...policy, can_blind_message: canBlindMessage },
          contacts,
          note: policy.level === "C0"
            ? "Le signal peut être utilisé pour la découverte, mais WAOUH ne révèle ni ne sollicite automatiquement ce contact."
            : policy.level === "C1"
              ? "Coordonnée professionnelle publique : l’utilisateur peut initier lui-même le contact."
              : canBlindMessage
                ? "WAOUH peut transmettre une proposition sans révéler les coordonnées privées de l’acheteur."
                : "Contact utilisable uniquement dans son contexte autorisé.",
        } });
      }

      case "nexus.contact.send": {
        const fabricId = asString(payload.fabric_id, "fabric_id", 5, 200);
        if (payload.confirmed !== true) throw new ApiError(422, "explicit_confirmation_required");
        const message = asString(payload.message, "message", 5, 1000);

        if (!fabricId.startsWith("external:")) {
          const signal = await queryOne<any>(
            sb.from("waouh_signal_fabric").select("*").eq("fabric_id", fabricId).maybeSingle(),
            "nexus_signal_not_found",
          );
          const policy = contactabilityPolicy(signal.contactability_level);
          if (policy.level !== "C2") {
            throw new ApiError(403, "integrated_contact_path_required");
          }

          const evidence = signal.evidence && typeof signal.evidence === "object"
            ? signal.evidence as Record<string, unknown>
            : {};
          let targetWaouhUserId: string | null = null;
          if (fabricId.startsWith("buyer:")) {
            targetWaouhUserId = typeof evidence.user_id === "string" ? evidence.user_id : null;
          } else if (fabricId.startsWith("article:")) {
            targetWaouhUserId = typeof evidence.seller_id === "string" ? evidence.seller_id : null;
          }
          if (!targetWaouhUserId) throw new ApiError(403, "blind_contact_not_available");

          const target = await queryOne<any>(
            sb.from("waouh_users")
              .select("id,auth_user_id,display_name")
              .eq("id", targetWaouhUserId)
              .maybeSingle(),
            "nexus_internal_target_not_found",
          );
          if (!target.auth_user_id || target.auth_user_id === ownerId) {
            throw new ApiError(403, "blind_contact_not_available");
          }

          const approval = await queryOne<any>(
            sb.from("waouh_agent_approvals").insert({
              owner_id: target.auth_user_id,
              action_type: "send_message",
              action_summary: signal.intent === "BUY"
                ? "Un vendeur WAOUH souhaite répondre à votre demande."
                : "Un acheteur WAOUH souhaite répondre à votre offre.",
              context: {
                operation: "nexus.internal_blind_message",
                fabric_id: fabricId,
                source_record_id: signal.source_record_id,
                from_auth_user: ownerId,
                message,
                subject: signal.subject,
                intent: signal.intent,
                source_key: signal.source_key,
              },
              status: "pending",
              expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            }).select("*").single(),
            "nexus_blind_approval_create_failed",
          );

          await enqueue(
            sb,
            target.auth_user_id,
            "nexus.internal_blind_message_requested",
            "approval",
            approval.id,
            {
              approval_id: approval.id,
              fabric_id: fabricId,
              source_record_id: signal.source_record_id,
            },
            `nexus.internal.blind:${fabricId}:${ownerId}:${approval.id}`,
          );
          await audit(sb, ownerId, "nexus.blind_message.sent", "commerce_signal", signal.source_record_id ?? null, {
            fabric_id: fabricId,
            recipient_auth_user: target.auth_user_id,
            approval_id: approval.id,
            internal: true,
          });
          await audit(sb, target.auth_user_id, "nexus.blind_message.received", "approval", approval.id, {
            fabric_id: fabricId,
            source_record_id: signal.source_record_id,
          });

          return jsonResponse({ ok: true, data: {
            queued: true,
            blind: true,
            approval_id: approval.id,
            channel: "waouh",
            contactability_level: "C2",
            phone_last4: null,
          } }, 202);
        }

        const signalId = uuid(fabricId.slice("external:".length), "signal_id");
        const signal = await queryOne<any>(
          sb.from("waouh_external_commerce_signals").select("*").eq("id", signalId).maybeSingle(),
          "nexus_signal_not_found",
        );
        const signalPolicy = contactabilityPolicy(signal.contactability_level);

        if (signalPolicy.level === "C2") {
          if (!signal.submitted_by || signal.submitted_by === ownerId) {
            throw new ApiError(403, "blind_contact_not_available");
          }
          const approval = await queryOne<any>(
            sb.from("waouh_agent_approvals").insert({
              owner_id: signal.submitted_by,
              action_type: "send_message",
              action_summary: "Un utilisateur WAOUH souhaite répondre à votre demande commerciale.",
              context: {
                operation: "nexus.blind_message",
                signal_id: signalId,
                from_auth_user: ownerId,
                message,
                product_name: signal.product_name,
                source_key: signal.source_key,
              },
              status: "pending",
              expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            }).select("*").single(),
            "nexus_blind_approval_create_failed",
          );
          await enqueue(
            sb,
            signal.submitted_by,
            "nexus.blind_message_requested",
            "approval",
            approval.id,
            { approval_id: approval.id, signal_id: signalId },
            `nexus.blind:${signalId}:${ownerId}:${approval.id}`,
          );
          await audit(sb, ownerId, "nexus.blind_message.sent", "commerce_signal", signalId, {
            recipient_auth_user: signal.submitted_by,
            approval_id: approval.id,
          });
          await audit(sb, signal.submitted_by, "nexus.blind_message.received", "approval", approval.id, {
            signal_id: signalId,
          });
          return jsonResponse({ ok: true, data: {
            queued: true,
            blind: true,
            approval_id: approval.id,
            channel: "waouh",
            contactability_level: "C2",
            phone_last4: null,
          } }, 202);
        }

        if (!signalPolicy.can_auto_contact || !["C3","C4"].includes(signalPolicy.level)) {
          throw new ApiError(403, "automated_contact_not_permitted");
        }
        if (!signal.entity_id) throw new ApiError(404, "contact_not_found");
        const { data: contacts, error: contactsError } = await sb.from("waouh_entity_contacts")
          .select("*").eq("entity_id", signal.entity_id)
          .in("channel", ["whatsapp","phone"])
          .in("contactability_level", ["C3","C4"])
          .order("contactability_level", { ascending: false }).limit(5);
        if (contactsError) throw new ApiError(500, "nexus_contacts_failed", contactsError.message);
        const target = (contacts ?? []).find((contact: any) => !!contact.value_encrypted);
        if (!target) throw new ApiError(404, "contact_not_found");
        const clear = await decryptPhone(target.value_encrypted);
        const e164 = normalizeE164(clear);
        if (!e164) throw new ApiError(422, "invalid_contact_phone");
        const toPhone = e164.replace(/\D/g, "");
        const dedupeKey = `nexus-discovery:${ownerId}:${signalId}:${await sha256Hex(message)}`;
        const { error: queueError } = await sb.rpc("waouh_enqueue_outbound_v2", {
          p_to_phone: toPhone,
          p_to_user_id: null,
          p_template: "nexus_discovery_outreach",
          p_payload: {
            text: message,
            actions: [],
            signal_id: signalId,
            source_key: signal.source_key,
            initiated_by_auth_user: ownerId,
          },
          p_web_session_id: null,
          p_image_url: null,
          p_channel: "whatsapp",
          p_dedupe_key: dedupeKey,
          p_event_type: "nexus_discovery_outreach",
        });
        if (queueError) throw new ApiError(500, "nexus_contact_queue_failed", queueError.message);
        fetch(`${supabaseUrl}/functions/v1/waouh-outbound-dispatch`, {
          method: "POST",
          headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ limit: 20 }),
        }).catch(() => {});
        await audit(sb, ownerId, "nexus.contact.queued", "commerce_signal", signalId, {
          channel: "whatsapp",
          contactability: signal.contactability_level,
          phone_last4: target.value_last4,
        });
        return jsonResponse({ ok: true, data: {
          queued: true,
          channel: "whatsapp",
          contactability_level: signal.contactability_level,
          phone_last4: target.value_last4,
        } }, 202);
      }

      case "nexus.sources": {
        const [
          providers, articleSources, buyerSources, radar, registry, fabricRows,
          telSettings, telRuntime,
        ] = await Promise.all([
          sb.from("waouh_radar_api_configs")
            .select("provider,source_key,label,auth_mode,active,daily_quota,usage_today,last_test_at,last_test_status,last_sync_at,last_sync_status")
            .order("provider"),
          sb.from("waouh_articles").select("source_channel,status").eq("status", "active").limit(2000),
          sb.from("waouh_buyer_profiles").select("source_channel,is_active").eq("is_active", true).limit(3000),
          sb.from("waouh_radar_signals").select("source_type,intent,contact_phone,status").limit(3000),
          sb.from("waouh_discovery_sources").select("*").order("family").order("label"),
          sb.from("waouh_signal_fabric").select("source_key,intent,contactability_level").limit(5000),
          sb.from("waouh_tel_settings").select("enabled,provider,sms_enabled,rcs_enabled").eq("key","default").maybeSingle(),
          sb.rpc("waouh_tel_runtime_readiness"),
        ]);
        for (const result of [providers, articleSources, buyerSources, radar, registry, fabricRows]) {
          if ((result as any).error) throw new ApiError(500, "nexus_sources_failed", (result as any).error.message);
        }
        const countBy = (rows: any[] | null, key: string) => (rows ?? []).reduce((acc: Record<string, number>, row: any) => {
          const value = String(row?.[key] ?? "unknown");
          acc[value] = (acc[value] ?? 0) + 1;
          return acc;
        }, {});
        const providerMap = new Map((providers.data ?? []).map((row: any) => [String(row.provider), row]));
        const sourceProviderMap = new Map((providers.data ?? []).map((row: any) => [String(row.source_key ?? row.provider), row]));
        const envByProvider: Record<string, string | undefined> = {
          serpapi: "SERPAPI_KEY",
          apify: "APIFY_TOKEN",
          google_places: "GOOGLE_PLACES_API_KEY",
        };
        const readyEntries = await Promise.all(
          (providers.data ?? []).map(async (row: any) => {
            const provider = String(row.provider);
            const state = await getRadarApiKey(sb as any, provider, envByProvider[provider]);
            let ok = state.ok;
            let reason = state.reason ?? null;
            if (provider === "whatsapp_groups") {
              ok = row.active === true && !!Deno.env.get("WAHA_BASE_URL");
              reason = ok ? null : "waha_not_configured_or_disabled";
            }
            if (provider === "sms_rcs") {
              ok = telSettings.data?.enabled === true && telRuntime.data?.runtime_ready === true;
              reason = ok ? null : "native_sms_rcs_not_ready";
            }
            return [provider, { ok, reason }] as const;
          }),
        );
        const readiness = new Map(readyEntries);
        const sourceRegistry = (registry.data ?? []).map((row: any) => {
          let effectiveState = row.operational_state;
          let configured = ["live","ingest_only"].includes(row.operational_state);
          let reason: string | null = null;
          const providerRow = sourceProviderMap.get(String(row.source_key));
          if (providerRow) {
            const state = readiness.get(String(providerRow.provider));
            configured = state?.ok === true;
            effectiveState = configured ? "live" : "requires_config";
            reason = configured ? null : (state?.reason ?? "not_configured");
          } else if (row.source_key === "web_social") {
            const serp = readiness.get("serpapi")?.ok === true;
            const apify = readiness.get("apify")?.ok === true;
            configured = serp || apify;
            effectiveState = configured ? "live" : "requires_config";
            reason = configured ? null : "serpapi_or_apify_required";
          } else if (row.source_key === "sms_rcs") {
            configured = telSettings.data?.enabled === true && telRuntime.data?.runtime_ready === true;
            effectiveState = configured ? "live" : "requires_config";
            reason = configured ? null : "native_sms_rcs_not_ready";
          }
          return {
            source_key: row.source_key,
            label: row.label,
            family: row.family,
            connector_mode: row.connector_mode,
            operational_state: effectiveState,
            configured,
            reason,
            supports_buy: row.supports_buy,
            supports_sell: row.supports_sell,
            supports_business: row.supports_business,
            supports_contact: row.supports_contact,
            default_contactability: row.default_contactability,
            capabilities: row.capabilities,
            signal_count: (fabricRows.data ?? []).filter((signal: any) => signal.source_key === row.source_key).length,
          };
        });
        return jsonResponse({ ok: true, data: {
          providers: (providers.data ?? []).map((row: any) => ({
            provider: row.provider,
            source_key: row.source_key,
            label: row.label,
            auth_mode: row.auth_mode,
            active: row.active,
            daily_quota: row.daily_quota,
            usage_today: row.usage_today,
            last_test_at: row.last_test_at,
            last_test_status: row.last_test_status,
            last_sync_at: row.last_sync_at,
            last_sync_status: row.last_sync_status,
            configured: readiness.get(String(row.provider))?.ok === true,
            reason: readiness.get(String(row.provider))?.reason ?? null,
          })),
          registry: sourceRegistry,
          fabric: {
            total: (fabricRows.data ?? []).length,
            by_source: countBy(fabricRows.data, "source_key"),
            by_intent: countBy(fabricRows.data, "intent"),
            by_contactability: countBy(fabricRows.data, "contactability_level"),
          },
          offers: countBy(articleSources.data, "source_channel"),
          demands: countBy(buyerSources.data, "source_channel"),
          radar: {
            sources: countBy(radar.data, "source_type"),
            intents: countBy(radar.data, "intent"),
            contacts_ready: (radar.data ?? []).filter((row: any) => !!row.contact_phone).length,
          },
          google_places: { configured: readiness.get("google_places")?.ok === true },
          sms_rcs: {
            configured: telSettings.data?.enabled === true && telRuntime.data?.runtime_ready === true,
            settings: telSettings.data ?? null,
          },
          source_provider_map: Object.fromEntries(providerMap),
        } });
      }

      case "nexus.scout.submit": {
        const title = asString(payload.title, "title", 2, 240);
        const price = positiveNumber(payload.observed_price, "observed_price", true);
        const report = await queryOne<any>(
          sb.from("waouh_scout_reports").insert({
            owner_id: ownerId,
            article_id: payload.article_id ? uuid(payload.article_id, "article_id") : null,
            catalog_id: payload.catalog_id ? uuid(payload.catalog_id, "catalog_id") : null,
            title,
            category: optionalString(payload.category, "category", 120),
            observed_price: price,
            city: optionalString(payload.city, "city", 120),
            place_name: optionalString(payload.place_name, "place_name", 240),
            latitude: payload.latitude == null ? null : Number(payload.latitude),
            longitude: payload.longitude == null ? null : Number(payload.longitude),
            source_type: pickEnum(payload.source_type, "source_type", ["field","shop","market","barcode","photo","receipt","partner"] as const, "field"),
            photo_urls: stringArray(payload.photo_urls, "photo_urls", 8),
            gtin: optionalString(payload.gtin, "gtin", 64),
            availability: pickEnum(payload.availability, "availability", ["available","low_stock","out_of_stock","unknown"] as const, "unknown"),
            note: optionalString(payload.note, "note", 2000),
            metadata: jsonObject(payload.metadata, "metadata"),
          }).select("*").single(),
          "scout_report_create_failed",
        );
        await audit(sb, ownerId, "nexus.scout.submitted", "scout_report", report.id, {
          title, observed_price: price, city: report.city, source_type: report.source_type,
        });
        return jsonResponse({ ok: true, data: { report } }, 201);
      }

      case "nexus.autopilot.create": {
        const mode = pickEnum(payload.mode, "mode", ["buyer", "seller"] as const);
        const goal = asString(payload.goal, "goal", 3, 2000);
        if (mode === "buyer") {
          const mission = await queryOne<any>(
            sb.from("waouh_agent_missions").insert({
              owner_id: ownerId, goal, channel: "web", locale: "fr-BJ", status: "active",
              constraints: {
                budget_max_amount: positiveNumber(payload.budget_max, "budget_max", true),
                currency: "XOF",
                city: optionalString(payload.city, "city", 120),
                nexus_autopilot: true,
              },
              preferences: { objective: "best_total_value", approval_before_contact: true },
            }).select("*").single(),
            "nexus_autopilot_mission_failed",
          );
          const intent = await queryOne<any>(
            sb.from("waouh_agent_intents").insert({
              mission_id: mission.id,
              owner_id: ownerId,
              intent_type: "purchase_search",
              normalized_query: goal,
              slots: mission.constraints ?? {},
              confidence: 1,
            }).select("*").single(),
            "nexus_autopilot_intent_failed",
          );
          const plan = await queryOne<any>(
            sb.from("waouh_agent_plans").insert({
              mission_id: mission.id,
              owner_id: ownerId,
              version: 1,
              status: "active",
              rationale: "NEXUS Autopilot : chercher, comparer, demander validation avant contact, puis surveiller le marché.",
            }).select("*").single(),
            "nexus_autopilot_plan_failed",
          );
          const { data: steps, error: stepsError } = await sb.from("waouh_agent_steps").insert([
            {
              plan_id: plan.id, mission_id: mission.id, owner_id: ownerId,
              sequence_no: 1, tool_name: "nexus_market_search", status: "queued",
              input: { goal, constraints: mission.constraints ?? {} },
            },
            {
              plan_id: plan.id, mission_id: mission.id, owner_id: ownerId,
              sequence_no: 2, tool_name: "nexus_price_compare", status: "blocked",
              input: {},
            },
            {
              plan_id: plan.id, mission_id: mission.id, owner_id: ownerId,
              sequence_no: 3, tool_name: "request_contact_approval", status: "blocked",
              requires_approval: true, input: {},
            },
            {
              plan_id: plan.id, mission_id: mission.id, owner_id: ownerId,
              sequence_no: 4, tool_name: "continuous_watch", status: "blocked",
              input: { interval_minutes: 360 },
            },
          ]).select("*");
          if (stepsError) throw new ApiError(500, "nexus_autopilot_steps_failed", stepsError.message);
          const updatedMission = await queryOne<any>(
            sb.from("waouh_agent_missions").update({ current_plan_id: plan.id }).eq("id", mission.id).select("*").single(),
            "nexus_autopilot_mission_link_failed",
          );
          const watch = await queryOne<any>(
            sb.from("waouh_watchlists").insert({
              owner_id: ownerId, query: goal,
              target_amount: positiveNumber(payload.budget_max, "budget_max", true),
              currency: "XOF", status: "active", check_interval_minutes: 360,
            }).select("*").single(),
            "nexus_autopilot_watch_failed",
          );
          await audit(sb, ownerId, "nexus.autopilot.buyer_created", "mission", mission.id, {
            watch_id: watch.id, plan_id: plan.id, intent_id: intent.id,
          });
          return jsonResponse({ ok: true, data: { mode, mission: updatedMission, intent, plan, steps: steps ?? [], watch } }, 201);
        }
        const articleId = uuid(payload.article_id, "article_id");
        const article = await ownedArticle(sb, ownerId, articleId);
        const minPrice = positiveNumber(payload.min_price_amount, "min_price_amount", true);
        const policyValues = {
          owner_id: ownerId, article_id: articleId, business_id: null, mode: "assisted",
          min_price_amount: minPrice,
          max_discount_percent: positiveNumber(payload.max_discount_percent, "max_discount_percent", true) ?? 10,
          allow_counteroffers: true, auto_expire_minutes: 1440,
          delivery_zones: stringArray(payload.delivery_zones, "delivery_zones", 30),
          rules: { nexus_autopilot: true, approval_before_accept: true }, active: true,
        };
        const { data: existingPolicy, error: policyLookupError } = await sb.from("waouh_seller_policies")
          .select("id").eq("owner_id", ownerId).eq("article_id", articleId).eq("active", true)
          .limit(1).maybeSingle();
        if (policyLookupError) throw new ApiError(500, "nexus_autopilot_policy_lookup_failed", policyLookupError.message);
        const policy = existingPolicy?.id
          ? await queryOne<any>(
              sb.from("waouh_seller_policies").update(policyValues).eq("id", existingPolicy.id).select("*").single(),
              "nexus_autopilot_policy_update_failed",
            )
          : await queryOne<any>(
              sb.from("waouh_seller_policies").insert(policyValues).select("*").single(),
              "nexus_autopilot_policy_create_failed",
            );
        await audit(sb, ownerId, "nexus.autopilot.seller_created", "article", articleId, { policy_id: policy.id });
        return jsonResponse({ ok: true, data: { mode, article, policy } }, 201);
      }

      case "nexus.search": {
        const queryText = asString(payload.query, "query", 2, 1_000);
        const suppliedBudgetMax = positiveNumber(payload.budget_max, "budget_max", true);
        const suppliedBudgetMin = positiveNumber(payload.budget_min, "budget_min", true);
        const suppliedCity = optionalString(payload.city, "city", 120);
        const intent = await enrichNexusIntent(queryText, {
          city: suppliedCity,
          budget_min: suppliedBudgetMin,
          budget_max: suppliedBudgetMax,
          keywords: nexusTokens(queryText),
        });
        const budgetMax = suppliedBudgetMax ?? intent.budget_max ?? null;
        const budgetMin = suppliedBudgetMin ?? intent.budget_min ?? null;
        const requestedCity = suppliedCity ?? intent.city ?? null;
        const semanticQuery = [
          intent.product,
          intent.brand,
          intent.model,
          intent.category,
          ...(intent.keywords ?? []),
          queryText,
        ].filter(Boolean).join(" ");
        const limit = integer(payload.limit, "limit", 8, 1, 30);
        const persistIntent = bool(payload.persist_intent, true);
        const preference = await getNexusPreference(sb, ownerId);
        const weights = nexusWeights(preference);

        const [articlesResult, catalogResult] = await Promise.all([
          sb.from("waouh_articles")
            .select("id,title,description,category,brand,model,condition,price,currency,photos,city,status,origin,source_channel,created_at,updated_at,seller:waouh_users!seller_id(id,auth_user_id,display_name,city,reputation,sales_count,is_verified)")
            .eq("status", "active")
            .order("updated_at", { ascending: false })
            .limit(500),
          sb.from("waouh_unified_catalog")
            .select("id,titre,description,categorie,prix_min,prix_max,devise,ville,vendeur_nom,vendeur_whatsapp,source,photos,promoted_article_id,is_active,updated_at")
            .eq("is_active", true)
            .order("updated_at", { ascending: false })
            .limit(500),
        ]);
        if (articlesResult.error) throw new ApiError(500, "nexus_article_search_failed", articlesResult.error.message);
        if (catalogResult.error) throw new ApiError(500, "nexus_catalog_search_failed", catalogResult.error.message);

        const ranked: any[] = [];
        for (const row of articlesResult.data ?? []) {
          const seller = Array.isArray((row as any).seller) ? (row as any).seller[0] : (row as any).seller;
          const article: ArticleLike = { ...(row as any), seller };
          const scores = rankArticle({ query: semanticQuery, budgetMax, budgetMin, city: requestedCity, article, weights });
          if (scores.relevance_score < 18) continue;
          ranked.push({
            kind: "article",
            article_id: row.id,
            catalog_id: null,
            title: row.title,
            description: row.description,
            category: row.category,
            brand: row.brand,
            model: row.model,
            condition: row.condition,
            price: row.price == null ? null : Number(row.price),
            currency: row.currency ?? "XOF",
            city: row.city,
            photos: row.photos ?? [],
            source: row.source_channel ?? row.origin ?? "waouh",
            seller: seller ? {
              display_name: seller.display_name,
              verified: seller.is_verified === true,
              reputation: seller.reputation == null ? null : Number(seller.reputation),
            } : null,
            seller_auth_id: seller?.auth_user_id ?? null,
            scores,
          });
        }

        for (const row of catalogResult.data ?? []) {
          if ((row as any).promoted_article_id) continue;
          const article: ArticleLike = {
            id: `catalog:${row.id}`,
            title: row.titre,
            description: row.description,
            category: row.categorie,
            price: row.prix_min ?? row.prix_max,
            city: row.ville,
            status: "active",
            origin: String(row.source ?? "partner"),
            source_channel: String(row.source ?? "partner"),
            updated_at: row.updated_at ?? null,
            seller: { display_name: row.vendeur_nom ?? "Partenaire WAOUH", is_verified: row.source === "partner" },
          };
          const scores = rankArticle({ query: semanticQuery, budgetMax, budgetMin, city: requestedCity, article, weights });
          if (scores.relevance_score < 18) continue;
          ranked.push({
            kind: "catalog",
            article_id: null,
            catalog_id: row.id,
            title: row.titre,
            description: row.description,
            category: row.categorie,
            brand: null,
            model: null,
            condition: null,
            price: row.prix_min == null ? (row.prix_max == null ? null : Number(row.prix_max)) : Number(row.prix_min),
            currency: row.devise ?? "XOF",
            city: row.ville,
            photos: row.photos ?? [],
            source: String(row.source ?? "partner"),
            seller: { display_name: row.vendeur_nom ?? "Partenaire WAOUH", verified: row.source === "partner", reputation: null },
            seller_auth_id: null,
            scores,
          });
        }

        ranked.sort((a, b) => b.scores.total_score - a.scores.total_score || Number(a.price ?? Infinity) - Number(b.price ?? Infinity));
        const relevant = ranked.filter((item) => item.scores.relevance_score >= 30);
        const pool = relevant.length ? relevant : ranked;
        const market = marketStats(pool.map((item) => item.price));
        const cheapest = pool.filter((item) => item.price != null).sort((a, b) => Number(a.price) - Number(b.price))[0];
        const trusted = [...pool].sort((a, b) => b.scores.trust_score - a.scores.trust_score)[0];
        const selected = pool.slice(0, limit).map((item, index) => ({
          ...item,
          badges: [
            ...(index === 0 ? ["recommended"] : []),
            ...(cheapest && item.kind === cheapest.kind && (item.article_id ?? item.catalog_id) === (cheapest.article_id ?? cheapest.catalog_id) ? ["cheapest"] : []),
            ...(trusted && item.kind === trusted.kind && (item.article_id ?? item.catalog_id) === (trusted.article_id ?? trusted.catalog_id) ? ["trusted"] : []),
          ],
          advice: nexusAdvice(item, market),
        }));

        let buyerProfile: any = null;
        if (persistIntent) {
          const nexusUser = await getOrCreateNexusUser(sb, ownerId, authUser.email?.split("@")[0] ?? "Utilisateur WAOUH");
          const { data: existingProfile, error: profileLookupError } = await sb.from("waouh_buyer_profiles")
            .select("*").eq("user_id", nexusUser.id).eq("query_text", queryText).eq("is_active", true)
            .order("created_at", { ascending: false }).limit(1).maybeSingle();
          if (profileLookupError) throw new ApiError(500, "nexus_buyer_profile_lookup_failed", profileLookupError.message);
          buyerProfile = existingProfile;
          if (!buyerProfile) {
            buyerProfile = await queryOne<any>(
              sb.from("waouh_buyer_profiles").insert({
                user_id: nexusUser.id,
                query_text: queryText,
                keywords: nexusTokens(queryText),
                price_min: budgetMin,
                price_max: budgetMax,
                is_active: true,
                origin: "chat",
                source_channel: "waouh_app",
                ai_intent: { ...intent, query: queryText, city: requestedCity, budget_min: budgetMin, budget_max: budgetMax, source: "nexus" },
                ai_priority_score: 90,
              }).select("*").single(),
              "nexus_buyer_profile_create_failed",
            );
          }

          const matchRows = selected.filter((item) => item.article_id).map((item) => ({
            buyer_profile_id: buyerProfile.id,
            article_id: item.article_id,
            buyer_auth_id: ownerId,
            seller_auth_id: item.seller_auth_id,
            relevance_score: item.scores.relevance_score,
            price_score: item.scores.price_score,
            trust_score: item.scores.trust_score,
            location_score: item.scores.location_score,
            freshness_score: item.scores.freshness_score,
            availability_score: item.scores.availability_score,
            total_score: item.scores.total_score,
            reasons: item.scores.reasons,
            source: "nexus.search",
            last_evaluated_at: new Date().toISOString(),
          }));
          if (matchRows.length) {
            const { error: matchError } = await sb.from("waouh_nexus_matches")
              .upsert(matchRows, { onConflict: "buyer_profile_id,article_id" });
            if (matchError) throw new ApiError(500, "nexus_match_persist_failed", matchError.message);
          }
        }

        if (market.sample_count > 0) {
          await sb.from("waouh_market_snapshots").insert({
            owner_id: ownerId,
            query: queryText,
            canonical_key: nexusTokens(queryText).sort().join("-").slice(0, 240) || null,
            city: requestedCity,
            currency: "XOF",
            min_amount: market.min,
            median_amount: market.median,
            max_amount: market.max,
            average_amount: market.average,
            sample_count: market.sample_count,
            source_mix: selected.reduce((acc: Record<string, number>, item: any) => {
              const key = String(item.source ?? "unknown");
              acc[key] = (acc[key] ?? 0) + 1;
              return acc;
            }, {}),
          });
        }
        await audit(sb, ownerId, "nexus.search", "buyer_profile", buyerProfile?.id ?? null, {
          query: queryText,
          results: selected.length,
          market_sample_count: market.sample_count,
        });
        return jsonResponse({ ok: true, data: {
          query: queryText,
          intent,
          market,
          results: selected,
          buyer_profile: buyerProfile ? { id: buyerProfile.id, query_text: buyerProfile.query_text } : null,
          explanation: selected.length
            ? "WAOUH a classé les offres par pertinence, prix, confiance, ville, fraîcheur et disponibilité."
            : "Aucune offre suffisamment proche pour l’instant. Activez une veille pour laisser WAOUH continuer.",
        } });
      }

      case "nexus.seller_opportunities": {
        const requestedArticleId = payload.article_id ? uuid(payload.article_id, "article_id") : null;
        if (requestedArticleId) await ownedArticle(sb, ownerId, requestedArticleId);
        const usersResult = await sb.from("waouh_users").select("id").eq("auth_user_id", ownerId);
        if (usersResult.error) throw new ApiError(500, "nexus_seller_identity_failed", usersResult.error.message);
        const sellerIds = (usersResult.data ?? []).map((row: any) => row.id);
        if (!sellerIds.length) return jsonResponse({ ok: true, data: { articles: [], total_matches: 0 } });
        let articleQuery = sb.from("waouh_articles")
          .select("id,title,description,category,brand,model,condition,price,currency,photos,city,status,origin,source_channel,created_at,updated_at")
          .in("seller_id", sellerIds).eq("status", "active").order("updated_at", { ascending: false }).limit(50);
        if (requestedArticleId) articleQuery = articleQuery.eq("id", requestedArticleId);
        const [articlesResult, buyersResult] = await Promise.all([
          articleQuery,
          sb.from("waouh_buyer_profiles")
            .select("id,user_id,query_text,category,keywords,price_min,price_max,is_active,origin,source_channel,created_at,user:waouh_users!user_id(id,auth_user_id,display_name,city,reputation,is_verified)")
            .eq("is_active", true).order("created_at", { ascending: false }).limit(1000),
        ]);
        if (articlesResult.error) throw new ApiError(500, "nexus_seller_articles_failed", articlesResult.error.message);
        if (buyersResult.error) throw new ApiError(500, "nexus_buyer_pool_failed", buyersResult.error.message);
        let totalMatches = 0;
        const groups: any[] = [];
        const matchRows: any[] = [];
        for (const articleRow of articlesResult.data ?? []) {
          const article = articleRow as ArticleLike;
          const opportunities = (buyersResult.data ?? []).map((buyerRow: any) => {
            const user = Array.isArray(buyerRow.user) ? buyerRow.user[0] : buyerRow.user;
            const buyer: BuyerLike = { ...buyerRow, user };
            const scores = rankBuyer({ article, buyer });
            return {
              buyer_profile_id: buyerRow.id,
              query: buyerRow.query_text,
              category: buyerRow.category,
              budget_max: buyerRow.price_max == null ? null : Number(buyerRow.price_max),
              source: buyerRow.source_channel ?? buyerRow.origin ?? "waouh",
              buyer: user ? { display_name: user.display_name, verified: user.is_verified === true } : null,
              buyer_auth_id: user?.auth_user_id ?? null,
              scores,
            };
          }).filter((item: any) => item.scores.total_score >= 45)
            .sort((a: any, b: any) => b.scores.total_score - a.scores.total_score)
            .slice(0, 8);
          totalMatches += opportunities.length;
          for (const item of opportunities) {
            matchRows.push({
              buyer_profile_id: item.buyer_profile_id,
              article_id: articleRow.id,
              buyer_auth_id: item.buyer_auth_id,
              seller_auth_id: ownerId,
              relevance_score: item.scores.relevance_score,
              price_score: item.scores.price_score,
              trust_score: 50,
              location_score: item.scores.location_score,
              freshness_score: item.scores.freshness_score,
              availability_score: item.scores.availability_score,
              total_score: item.scores.total_score,
              reasons: item.scores.reasons,
              source: "nexus.seller_opportunities",
              last_evaluated_at: new Date().toISOString(),
            });
          }
          groups.push({
            article: {
              id: articleRow.id,
              title: articleRow.title,
              price: articleRow.price == null ? null : Number(articleRow.price),
              currency: articleRow.currency ?? "XOF",
              city: articleRow.city,
              photos: articleRow.photos ?? [],
            },
            matched_count: opportunities.length,
            opportunities,
          });
        }
        if (matchRows.length) {
          const { error: persistError } = await sb.from("waouh_nexus_matches")
            .upsert(matchRows, { onConflict: "buyer_profile_id,article_id" });
          if (persistError) throw new ApiError(500, "nexus_seller_match_persist_failed", persistError.message);
        }
        await audit(sb, ownerId, "nexus.seller_opportunities", "seller", null, { articles: groups.length, matches: totalMatches });
        return jsonResponse({ ok: true, data: { articles: groups, total_matches: totalMatches } });
      }

      case "nexus.notify_buyers": {
        const articleId = uuid(payload.article_id, "article_id");
        await ownedArticle(sb, ownerId, articleId);
        const response = await fetch(`${supabaseUrl}/functions/v1/waouh-notify-buyers`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ article_id: articleId }),
        });
        const raw = await response.text();
        let result: any = {};
        try { result = raw ? JSON.parse(raw) : {}; } catch { result = { raw: raw.slice(0, 300) }; }
        if (!response.ok) throw new ApiError(502, "nexus_notify_buyers_failed", String(result?.error ?? response.status));
        await audit(sb, ownerId, "nexus.buyers_notified", "article", articleId, {
          notified: Number(result?.notified ?? 0),
          consent_scope: "active_buyer_profiles",
        });
        return jsonResponse({ ok: true, data: {
          article_id: articleId,
          notified: Number(result?.notified ?? 0),
          note: "Seuls les profils acheteurs actifs et compatibles sont ciblés.",
        } });
      }

      case "media.create": {
        const bucket = asString(payload.storage_bucket, "storage_bucket", 2, 100);
        const path = asString(payload.storage_path, "storage_path", 3, 1_024);
        if (!(path.startsWith(`${ownerId}/`) || path.startsWith(`waouh/${ownerId}/`))) throw new ApiError(403, "invalid_storage_path_owner");
        const articleId = payload.article_id ? uuid(payload.article_id, "article_id") : null;
        const businessId = payload.business_id ? uuid(payload.business_id, "business_id") : null;
        const missionId = payload.mission_id ? uuid(payload.mission_id, "mission_id") : null;
        if (articleId) await ownedArticle(sb, ownerId, articleId);
        if (businessId) await ownedBusiness(sb, ownerId, businessId);
        if (missionId) await ownedMission(sb, ownerId, missionId);
        const sizeBytes = integer(payload.size_bytes, "size_bytes", 0, 0, 20 * 1024 * 1024);
        const media = await queryOne<any>(
          sb.from("waouh_media_assets").insert({
            owner_id: ownerId,
            mission_id: missionId,
            article_id: articleId,
            business_id: businessId,
            storage_bucket: bucket,
            storage_path: path,
            media_type: pickEnum(payload.media_type, "media_type", ["image", "video", "audio", "document"] as const),
            mime_type: asString(payload.mime_type, "mime_type", 3, 120),
            size_bytes: sizeBytes,
            sha256: optionalString(payload.sha256, "sha256", 128),
            alt_text: optionalString(payload.alt_text, "alt_text", 500),
            visibility: pickEnum(payload.visibility, "visibility", ["private", "catalog"] as const, "private"),
            metadata: jsonObject(payload.metadata, "metadata"),
          }).select("*").single(),
          "media_create_failed",
        );
        await audit(sb, ownerId, "media.registered", "media", media.id, { media_type: media.media_type }, missionId);
        return jsonResponse({ ok: true, data: { media } }, 201);
      }

      case "media.list": {
        const limit = integer(payload.limit, "limit", 50, 1, 100);
        let query = sb.from("waouh_media_assets").select("*").eq("owner_id", ownerId)
          .neq("status", "deleted").order("created_at", { ascending: false }).limit(limit);
        if (payload.article_id) query = query.eq("article_id", uuid(payload.article_id, "article_id"));
        if (payload.business_id) query = query.eq("business_id", uuid(payload.business_id, "business_id"));
        if (payload.mission_id) query = query.eq("mission_id", uuid(payload.mission_id, "mission_id"));
        const before = cursor(payload.cursor);
        if (before) query = query.lt("created_at", before);
        const { data, error } = await query;
        if (error) throw new ApiError(500, "media_list_failed", error.message);
        const media = data ?? [];
        return jsonResponse({ ok: true, data: { media, items: media, next_cursor: listMeta(media, limit) } });
      }

      case "domain.list": {
        const { data, error } = await sb.from("waouh_domain_policies")
          .select("domain,access_mode,agent_identity_required,allowed_actions,rate_limit_per_minute,last_reviewed_at")
          .eq("active", true).order("domain");
        if (error) throw new ApiError(500, "domain_policy_list_failed", error.message);
        const domains = data ?? [];
        return jsonResponse({ ok: true, data: { domains, items: domains, default_policy: "deny" } });
      }

      default:
        throw new ApiError(404, "unknown_action");
    }
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status >= 500) console.error(`[waouh-agentic-core] ${error.code}`, error.message);
      return errorResponse(error.status, error.code, error.status >= 500 ? error.code : error.message);
    }
    console.error("[waouh-agentic-core] unexpected error", error);
    return errorResponse(500, "internal_error");
  }
});