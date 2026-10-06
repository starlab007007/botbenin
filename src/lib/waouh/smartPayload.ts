export type WaouhSmartActionKind =
  | "navigate"
  | "reply"
  | "commerce"
  | "approve"
  | "contact"
  | "retry"
  | "dismiss";

export type WaouhSmartAction = {
  id: string;
  label: string;
  kind: WaouhSmartActionKind;
  route?: string | null;
  payload?: Record<string, unknown>;
  priority?: number;
  requires_auth?: boolean;
  requires_confirmation?: boolean;
};

export type WaouhSmartEnvelope = {
  schema: "waouh.smart.v1" | string;
  domain: string;
  intent: string;
  priority: "low" | "normal" | "high" | "urgent" | string;
  title?: string | null;
  detail?: string | null;
  text?: string | null;
  stage?: string | null;
  route?: string | null;
  thread_id?: string | null;
  correlation_id?: string | null;
  entities?: Record<string, unknown>;
  recipient_role?: string | null;
  actions: WaouhSmartAction[];
  next_best_action?: string | null;
  prediction?: {
    confidence?: number | null;
    reason?: string | null;
    next_follow_up_at?: string | null;
    expires_at?: string | null;
  } | null;
  display?: {
    variant?: string | null;
    compact?: boolean;
  } | null;
};

const record = (value: unknown): Record<string, any> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, any>
    : {};

const text = (value: unknown): string =>
  typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();

export function safeWaouhRoute(value: unknown): string | null {
  const route = text(value);
  if (!route.startsWith("/app/") || route.startsWith("//") || route.includes("\\")) return null;
  return route;
}

function normalizeAction(value: unknown, fallbackRoute: string | null): WaouhSmartAction | null {
  const row = record(value);
  const id = text(row.id ?? row.action ?? row.key);
  const label = text(row.label ?? row.title ?? row.text);
  if (!id || !label) return null;
  const rawKind = text(row.kind).toLowerCase();
  const kind: WaouhSmartActionKind =
    ["navigate", "reply", "commerce", "approve", "contact", "retry", "dismiss"].includes(rawKind)
      ? rawKind as WaouhSmartActionKind
      : "navigate";
  return {
    id,
    label,
    kind,
    route: safeWaouhRoute(row.route ?? row.url) ?? fallbackRoute,
    payload: record(row.payload),
    priority: Number.isFinite(Number(row.priority)) ? Number(row.priority) : 99,
    requires_auth: row.requires_auth !== false,
    requires_confirmation: row.requires_confirmation === true,
  };
}

function legacyFallback(payload: Record<string, any>): WaouhSmartEnvelope | null {
  const route = safeWaouhRoute(payload.target_route ?? payload.route ?? payload.action_url);
  const actions = Array.isArray(payload.actions)
    ? payload.actions
        .map((item: unknown) => normalizeAction(item, route))
        .filter(Boolean) as WaouhSmartAction[]
    : [];
  if (!route && actions.length === 0 && !payload.next_best_action) return null;
  return {
    schema: "waouh.smart.v1",
    domain: text(payload.domain) || "chat",
    intent: text(payload.intent ?? payload.notification_type ?? payload.event_type) || "message",
    priority: text(payload.priority) || "normal",
    route,
    thread_id: text(payload.thread_id) || null,
    correlation_id: text(payload.correlation_id ?? payload.trace_id) || null,
    actions,
    next_best_action: text(payload.next_best_action) || actions[0]?.id || null,
  };
}

export function readWaouhSmartEnvelope(value: unknown): WaouhSmartEnvelope | null {
  const payload = record(value);
  const raw = record(payload.smart);
  if (text(raw.schema) !== "waouh.smart.v1") return legacyFallback(payload);

  const route = safeWaouhRoute(raw.route ?? payload.target_route);
  const actions = (Array.isArray(raw.actions) ? raw.actions : payload.actions)
    ?.map((item: unknown) => normalizeAction(item, route))
    .filter(Boolean)
    .sort((a: WaouhSmartAction, b: WaouhSmartAction) => (a.priority ?? 99) - (b.priority ?? 99))
    .slice(0, 5) ?? [];

  return {
    schema: text(raw.schema) || "waouh.smart.v1",
    domain: text(raw.domain) || "chat",
    intent: text(raw.intent) || "message",
    priority: text(raw.priority) || "normal",
    title: text(raw.title) || null,
    detail: text(raw.detail) || null,
    text: text(raw.text) || null,
    stage: text(raw.stage) || null,
    route,
    thread_id: text(raw.thread_id ?? payload.thread_id) || null,
    correlation_id: text(raw.correlation_id ?? payload.correlation_id ?? payload.trace_id) || null,
    entities: record(raw.entities),
    recipient_role: text(raw.recipient_role) || null,
    actions,
    next_best_action: text(raw.next_best_action ?? payload.next_best_action) || actions[0]?.id || null,
    prediction: record(raw.prediction),
    display: record(raw.display),
  };
}

export function primaryWaouhSmartAction(value: unknown): WaouhSmartAction | null {
  const smart = readWaouhSmartEnvelope(value);
  if (!smart) return null;
  const preferred = text(smart.next_best_action);
  return smart.actions.find((action) => action.id === preferred) ?? smart.actions[0] ?? null;
}

export function waouhSmartActions(value: unknown, max = 3): WaouhSmartAction[] {
  return readWaouhSmartEnvelope(value)?.actions.slice(0, Math.max(0, max)) ?? [];
}

export function waouhSmartRoute(value: unknown): string | null {
  const smart = readWaouhSmartEnvelope(value);
  return primaryWaouhSmartAction(value)?.route ?? smart?.route ?? null;
}

export function waouhSmartDisplayText(value: unknown, fallback: string) {
  const smart = readWaouhSmartEnvelope(value);
  return {
    title: smart?.title || null,
    detail: smart?.detail || smart?.text || fallback,
    priority: smart?.priority || "normal",
    domain: smart?.domain || "chat",
  };
}
