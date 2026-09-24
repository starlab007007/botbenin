export const WAOUH_MESSAGE_SCHEMA = "waouh.message.v1" as const;
export const WAOUH_PRODUCT_SCHEMA = "waouh.product.v1" as const;
export const WAOUH_OFFER_SCHEMA = "waouh.offer.v1" as const;

export type WaouhProductV1 = {
  schema: typeof WAOUH_PRODUCT_SCHEMA;
  product_id: string;
  title: string;
  description?: string;
  price_amount?: number | null;
  price_min_amount?: number | null;
  price_max_amount?: number | null;
  currency: "XOF" | string;
  photos: string[];
  city?: string | null;
  condition?: string | null;
  source?: string | null;
  seller_id?: string | null;
  available?: boolean | null;
};

export type AgentMissionStatus =
  | "draft"
  | "planning"
  | "searching"
  | "comparing"
  | "watching"
  | "active"
  | "paused"
  | "completed"
  | "cancelled"
  | "failed";

export type AgentStep = {
  id?: string;
  label: string;
  status?: "pending" | "running" | "completed" | "failed" | "skipped";
};

export type AgentMission = {
  id: string;
  title: string;
  summary?: string;
  status: AgentMissionStatus;
  progress?: number;
  budget_max_amount?: number | null;
  currency?: "XOF" | string;
  city?: string | null;
  steps?: AgentStep[];
  created_at?: string;
  updated_at?: string;
};

export type PriceWatch = {
  id: string;
  title: string;
  query?: string;
  target_amount?: number | null;
  current_amount?: number | null;
  currency?: "XOF" | string;
  city?: string | null;
  status: "active" | "paused" | "triggered" | "expired" | "cancelled";
  last_checked_at?: string | null;
  created_at?: string;
};

export type NonFinancialApproval = {
  id: string;
  title: string;
  description?: string;
  action_type: string;
  status: "pending" | "approved" | "rejected" | "expired" | "cancelled";
  expires_at?: string | null;
  risk_level?: "low" | "medium" | "high";
  is_financial?: false;
};

export type SellerPolicy = {
  id?: string;
  mode?: "manual" | "assisted" | "automatic";
  enabled?: boolean;
  min_price_amount?: number | null;
  max_discount_percent?: number | null;
  auto_negotiate?: boolean;
  allow_counteroffers?: boolean;
  auto_expire_minutes?: number | null;
  response_delay_minutes?: number | null;
  delivery_zones?: string[];
  return_policy?: string | null;
  currency?: "XOF" | string;
};

export type SignedOffer = {
  schema?: typeof WAOUH_OFFER_SCHEMA;
  id: string;
  offer_id?: string;
  title?: string;
  intent_id?: string;
  merchant_id?: string;
  variant_id?: string;
  quantity?: number;
  unit_price_amount: number;
  delivery_fee_amount?: number;
  currency?: "XOF" | string;
  status?: "draft" | "proposed" | "sent" | "accepted" | "rejected" | "countered" | "expired" | "withdrawn";
  expires_at?: string | null;
  terms_hash?: string;
  signature?: string;
};

export type AgentActivity = {
  id: string;
  event_type: string;
  title: string;
  description?: string;
  status?: "info" | "success" | "warning" | "error";
  created_at: string;
};

export type ProductCarouselBlock = {
  type: "product_carousel";
  offers?: unknown[];
  items?: unknown[];
};
export type MissionBlock = { type: "mission" | "mission_status"; mission: AgentMission };
export type WatchBlock = { type: "watch" | "watch_status"; watch: PriceWatch };
export type ApprovalBlock = { type: "approval"; approval: NonFinancialApproval };
export type ActivityBlock = { type: "activity"; entries: AgentActivity[] };
export type SellerPolicyBlock = { type: "seller_policy"; policy: SellerPolicy };
export type SellerOfferBlock = { type: "seller_offer"; offer: SignedOffer };

export type WaouhMessageBlock =
  | ProductCarouselBlock
  | MissionBlock
  | WatchBlock
  | ApprovalBlock
  | ActivityBlock
  | SellerPolicyBlock
  | SellerOfferBlock;

export type WaouhMessageV1 = {
  schema: typeof WAOUH_MESSAGE_SCHEMA;
  message_id?: string;
  correlation_id?: string;
  text?: string;
  blocks: WaouhMessageBlock[];
};

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (...values: unknown[]) =>
  values.find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim() ?? "";
const finite = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(String(value).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
};
const boundedProgress = (value: unknown) => {
  const parsed = finite(value);
  if (parsed === null) return undefined;
  return Math.min(100, Math.max(0, parsed));
};

const safeMediaUrl = (value: unknown): string => {
  const item = record(value);
  const url = typeof value === "string" ? value.trim() : text(item.url, item.src, item.public_url);
  return /^(https?:\/\/|\/(?!\/))/i.test(url) ? url : "";
};

/** Canonical product boundary used by chat, history and product carousels. */
export function normalizeWaouhProductV1(value: unknown): WaouhProductV1 | null {
  const row = record(value);
  const suppliedSchema = text(row.schema);
  if (suppliedSchema && suppliedSchema !== WAOUH_PRODUCT_SCHEMA) return null;
  const productId = text(row.product_id, row.id, row.article_id);
  const title = text(row.title, row.name, row.nom);
  if (!productId || !title) return null;
  const rawPhotos = row.photos ?? row.images ?? row.media ?? row.image_url ?? row.photo;
  const photos = (Array.isArray(rawPhotos) ? rawPhotos : [rawPhotos]).map(safeMediaUrl).filter(Boolean);
  return {
    schema: WAOUH_PRODUCT_SCHEMA,
    product_id: productId,
    title,
    description: text(row.description) || undefined,
    price_amount: finite(row.price_amount ?? row.price ?? row.prix),
    price_min_amount: finite(row.price_min_amount ?? row.price_min ?? row.prix_min),
    price_max_amount: finite(row.price_max_amount ?? row.price_max ?? row.prix_max),
    currency: text(row.currency) || "XOF",
    photos: [...new Set(photos)],
    city: text(row.city, row.ville) || null,
    condition: text(row.condition, row.etat) || null,
    source: text(row.source) || null,
    seller_id: text(row.seller_id, row.seller_user_id) || null,
    available: typeof row.available === "boolean" ? row.available : null,
  };
}

const normalizeMission = (value: unknown): AgentMission | null => {
  const row = record(value);
  const id = text(row.id, row.mission_id);
  const title = text(row.title, row.goal, row.query, row.summary);
  if (!id || !title) return null;
  const rawSteps = Array.isArray(row.steps) ? row.steps : [];
  const status = text(row.status) || "draft";
  return {
    ...row,
    id,
    title,
    status: status as AgentMissionStatus,
    progress: boundedProgress(row.progress ?? row.progress_percent),
    budget_max_amount: finite(row.budget_max_amount ?? row.max_budget),
    currency: text(row.currency) || "XOF",
    steps: rawSteps.flatMap((step) => {
      const item = record(step);
      const label = text(item.label, item.title, item.name);
      return label ? [{ ...item, id: text(item.id) || undefined, label } as AgentStep] : [];
    }),
  } as AgentMission;
};

const normalizeWatch = (value: unknown): PriceWatch | null => {
  const row = record(value);
  const id = text(row.id, row.watch_id);
  const title = text(row.title, row.query, row.product_name);
  if (!id || !title) return null;
  return {
    ...row,
    id,
    title,
    status: (text(row.status) || "active") as PriceWatch["status"],
    target_amount: finite(row.target_amount ?? row.target_price),
    current_amount: finite(row.current_amount ?? row.current_price ?? row.last_observed_amount),
    currency: text(row.currency) || "XOF",
  } as PriceWatch;
};

const normalizeApproval = (value: unknown): NonFinancialApproval | null => {
  const row = record(value);
  if (row.is_financial === true || text(row.category, row.action_type).toLowerCase().includes("payment")) return null;
  const id = text(row.id, row.approval_id);
  const title = text(row.title, row.action_summary, row.action_label, row.action_type);
  if (!id || !title) return null;
  return {
    ...row,
    id,
    title,
    description: text(row.description, row.action_summary) || undefined,
    action_type: text(row.action_type) || "agent_action",
    status: (text(row.status) || "pending") as NonFinancialApproval["status"],
    is_financial: false,
  } as NonFinancialApproval;
};

const normalizeOffer = (value: unknown): SignedOffer | null => {
  const row = record(value);
  const id = text(row.id, row.offer_id);
  const amount = finite(row.unit_price_amount ?? row.amount ?? row.unit_price ?? row.price);
  if (!id || amount === null) return null;
  return {
    ...row,
    schema: WAOUH_OFFER_SCHEMA,
    id,
    unit_price_amount: amount,
    delivery_fee_amount: finite(row.delivery_fee_amount ?? row.delivery_fee) ?? 0,
    currency: text(row.currency) || "XOF",
  } as SignedOffer;
};

/**
 * Runtime boundary for LLM/worker payloads. Unknown blocks are ignored and
 * financial approvals are deliberately excluded from this non-payment UI.
 */
export function normalizeAgenticBlocks(value: unknown): WaouhMessageBlock[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate): WaouhMessageBlock[] => {
    const block = record(candidate);
    const type = text(block.type);
    if (type === "product_carousel") {
      const offers = Array.isArray(block.offers) ? block.offers : [];
      const items = Array.isArray(block.items) ? block.items : [];
      return offers.length || items.length ? [{ type, offers, items }] : [];
    }
    if (type === "mission" || type === "mission_status") {
      const mission = normalizeMission(block.mission ?? block.data);
      return mission ? [{ type, mission }] : [];
    }
    if (type === "watch" || type === "watch_status") {
      const watch = normalizeWatch(block.watch ?? block.data);
      return watch ? [{ type, watch }] : [];
    }
    if (type === "approval") {
      const approval = normalizeApproval(block.approval ?? block.data);
      return approval ? [{ type, approval }] : [];
    }
    if (type === "seller_offer") {
      const offer = normalizeOffer(block.offer ?? block.data);
      return offer ? [{ type, offer }] : [];
    }
    if (type === "seller_policy") {
      const policy = record(block.policy ?? block.data) as SellerPolicy;
      return Object.keys(policy).length ? [{ type, policy }] : [];
    }
    if (type === "activity") {
      const rows = Array.isArray(block.entries) ? block.entries : [];
      const entries = rows.flatMap((entry) => {
        const row = record(entry);
        const id = text(row.id, row.event_id);
        const title = text(row.title, row.event_type);
        if (!id || !title) return [];
        return [{ ...row, id, title, event_type: text(row.event_type) || "agent_event", created_at: text(row.created_at) || new Date(0).toISOString() } as AgentActivity];
      });
      return entries.length ? [{ type, entries }] : [];
    }
    return [];
  });
}

export type AgenticAction =
  | "mission.create" | "mission.list" | "mission.get" | "mission.pause" | "mission.resume" | "mission.cancel" | "mission.run"
  | "watch.create" | "watch.list" | "watch.update" | "watch.delete" | "watch.observe" | "watch.events" | "watch.event.read"
  | "activity.list" | "approval.request" | "approval.list" | "approval.decide"
  | "seller_policy.get" | "seller_policy.upsert"
  | "offer.create" | "offer.list" | "offer.respond"
  | "nexus.summary" | "nexus.search" | "nexus.seller_opportunities" | "nexus.notify_buyers"
  | "nexus.preferences.get" | "nexus.preferences.upsert"
  | "nexus.identify_visual" | "nexus.barcode_lookup" | "nexus.market_history" | "nexus.sources" | "nexus.scout.submit" | "nexus.autopilot.create"
  | "nexus.signal.ingest" | "nexus.google_places.search" | "nexus.global_discovery" | "nexus.contact.prepare" | "nexus.contact.send"
  | "media.create" | "media.list" | "domain.list";

export type AgenticEnvelope<T> =
  | { ok: true; data: T; correlation_id?: string }
  | { ok: false; error: { code?: string; message: string }; correlation_id?: string };

export function approvalDecisionPayload(approvalId: string, decision: "approved" | "rejected") {
  return { approval_id: approvalId, decision } as const;
}

export function unwrapAgenticEnvelope<T>(value: unknown): T {
  const envelope = record(value);
  if (envelope.ok !== true) {
    const error = record(envelope.error);
    throw new Error(text(error.message, envelope.message) || "Le service agentique WAOUH est indisponible.");
  }
  return envelope.data as T;
}

export function listFromAgenticData<T>(value: unknown, ...keys: string[]): T[] {
  if (Array.isArray(value)) return value as T[];
  const row = record(value);
  for (const key of ["items", ...keys]) {
    if (Array.isArray(row[key])) return row[key] as T[];
  }
  return [];
}