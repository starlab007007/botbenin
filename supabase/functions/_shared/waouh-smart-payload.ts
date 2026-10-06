// WAOUH — contrat Smart Event universel.
// Module pur : aucun accès DB. Il enrichit messages, notifications et outbound
// sans casser les champs historiques consommés par Web/Flutter/WhatsApp.

export type WaouhSmartDomain =
  | "chat"
  | "commerce"
  | "missions"
  | "ai"
  | "whatsapp"
  | "diffusion"
  | "partner"
  | "stock"
  | "profile"
  | "notifications";

export type WaouhSmartPriority = "low" | "normal" | "high" | "urgent";
export type WaouhSmartActionKind =
  | "navigate"
  | "reply"
  | "commerce"
  | "approve"
  | "contact"
  | "retry"
  | "dismiss";

export interface WaouhSmartAction {
  id: string;
  label: string;
  kind: WaouhSmartActionKind;
  route?: string;
  payload?: Record<string, unknown>;
  priority: number;
  requires_auth: boolean;
  requires_confirmation: boolean;
}

export interface WaouhSmartInput {
  intent?: string | null;
  domain?: WaouhSmartDomain | null;
  title?: string | null;
  detail?: string | null;
  text?: string | null;
  stage?: string | null;
  threadId?: string | null;
  correlationId?: string | null;
  articleId?: string | null;
  negotiationId?: string | null;
  dealId?: string | null;
  transactionId?: string | null;
  missionId?: string | null;
  partnerId?: string | null;
  stockItemId?: string | null;
  recipientRole?: string | null;
  actions?: unknown;
  payload?: Record<string, unknown> | null;
}

const compact = (value: unknown, max = 180) =>
  String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

const ACTION_MAX = 5;

export function smartDomainForIntent(raw: unknown): WaouhSmartDomain {
  const intent = compact(raw, 120).toLowerCase().replace(/[-\s]+/g, "_");
  if (/stock|inventory|reorder|rupture|low_stock/.test(intent)) return "stock";
  if (/partner|payout|business|catalog/.test(intent)) return "partner";
  if (/diffusion|campaign|broadcast|audience/.test(intent)) return "diffusion";
  if (/whatsapp|waha|wa_/.test(intent)) return "whatsapp";
  if (/mission|watch|approval|avatar|agent|briefing|nudge/.test(intent)) return "missions";
  if (/\bia\b|\bai\b|bot/.test(intent)) return "ai";
  if (/profile|identity|account/.test(intent)) return "profile";
  if (/notif/.test(intent)) return "notifications";
  if (/deal|negoti|offer|buyer|seller|interest|payment|deliver|courier|article|sale/.test(intent)) {
    return "commerce";
  }
  return "chat";
}

export function smartRouteFor(domain: WaouhSmartDomain): string {
  switch (domain) {
    case "commerce":
    case "chat":
      return "/app/chat/waouh";
    case "missions":
      return "/app/missions";
    case "ai":
      return "/app/ia";
    case "whatsapp":
      return "/app/whatsapp";
    case "diffusion":
      return "/app/diffusion";
    case "partner":
      return "/app/partner";
    case "stock":
      return "/app/stock";
    case "profile":
      return "/app/profile";
    case "notifications":
      return "/app/notifications";
  }
}

function actionKind(id: string): WaouhSmartActionKind {
  const value = id.toLowerCase();
  if (/accept|accepter|reject|refuser|offer|offre|pay|paiement|confirm|annuler|cancel|je-veux|open_deal|transmit/.test(value)) {
    return "commerce";
  }
  if (/approve|valider/.test(value)) return "approve";
  if (/contact|whatsapp|call|appel/.test(value)) return "contact";
  if (/retry|reessayer|réessayer/.test(value)) return "retry";
  if (/reply|repondre|répondre|question/.test(value)) return "reply";
  if (/dismiss|fermer|ignorer/.test(value)) return "dismiss";
  return "navigate";
}

function needsConfirmation(id: string): boolean {
  return /accept|accepter|pay|payer|paiement|confirm_payment|annuler|cancel|refuser|reject/.test(id.toLowerCase());
}

function cleanActions(raw: unknown, route: string): WaouhSmartAction[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: WaouhSmartAction[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const id = compact(row.id ?? row.action ?? row.key, 120);
    const label = compact(row.label ?? row.title ?? row.text, 60);
    if (!id || !label || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      label,
      kind: actionKind(id),
      route: compact(row.route ?? row.url, 240) || route,
      payload: row.payload && typeof row.payload === "object"
        ? row.payload as Record<string, unknown>
        : { action_id: id },
      priority: out.length + 1,
      requires_auth: row.requires_auth !== false,
      requires_confirmation: row.requires_confirmation === true || needsConfirmation(id),
    });
    if (out.length >= ACTION_MAX) break;
  }
  return out;
}

function openLabel(domain: WaouhSmartDomain): string {
  switch (domain) {
    case "commerce": return "Ouvrir la discussion";
    case "missions": return "Voir la mission";
    case "ai": return "Ouvrir mon IA";
    case "whatsapp": return "Ouvrir WhatsApp";
    case "diffusion": return "Voir la diffusion";
    case "partner": return "Voir l'espace partenaire";
    case "stock": return "Voir le stock";
    case "profile": return "Voir mon profil";
    case "notifications": return "Voir les notifications";
    default: return "Ouvrir";
  }
}

function priorityFor(intentRaw: unknown): WaouhSmartPriority {
  const intent = compact(intentRaw, 120).toLowerCase();
  if (/payment_request|confirm_payment|security|blocked|failed|urgent/.test(intent)) return "urgent";
  if (/new_buyer|offer_received|approval|low_stock|out_of_stock|deal_created|deal_accepted|delivery/.test(intent)) return "high";
  if (/ack|completed|paid|closed|dismiss/.test(intent)) return "low";
  return "normal";
}

export function buildWaouhSmartEnvelope(input: WaouhSmartInput) {
  const intent = compact(input.intent, 120) || "message";
  const domain = input.domain ?? smartDomainForIntent(intent);
  const route = smartRouteFor(domain);
  const rawActions =
    input.actions ??
    input.payload?.actions ??
    input.payload?.smart_actions ??
    null;
  const actions = cleanActions(rawActions, route);
  if (!actions.length) {
    actions.push({
      id: "open_context",
      label: openLabel(domain),
      kind: "navigate",
      route,
      priority: 1,
      requires_auth: !["chat"].includes(domain),
      requires_confirmation: false,
      payload: { route },
    });
  }

  const correlationId = compact(
    input.correlationId ??
    input.payload?.correlation_id ??
    input.payload?.trace_id,
    160,
  ) || null;

  return {
    schema: "waouh.smart.v1",
    domain,
    intent,
    priority: priorityFor(intent),
    title: compact(input.title ?? input.payload?.title, 100) || null,
    detail: compact(input.detail ?? input.payload?.detail, 240) || null,
    text: compact(input.text, 500) || null,
    stage: compact(input.stage ?? input.payload?.stage ?? input.payload?.workflow_state, 80) || null,
    route,
    thread_id: input.threadId ?? input.payload?.thread_id ?? null,
    correlation_id: correlationId,
    entities: {
      article_id: input.articleId ?? input.payload?.article_id ?? null,
      negotiation_id: input.negotiationId ?? input.payload?.negotiation_id ?? null,
      deal_id: input.dealId ?? input.payload?.deal_id ?? null,
      transaction_id: input.transactionId ?? input.payload?.transaction_id ?? null,
      mission_id: input.missionId ?? input.payload?.mission_id ?? null,
      partner_id: input.partnerId ?? input.payload?.partner_id ?? null,
      stock_item_id: input.stockItemId ?? input.payload?.stock_item_id ?? null,
    },
    recipient_role: compact(input.recipientRole ?? input.payload?.recipient ?? input.payload?.role, 40) || null,
    actions,
    next_best_action: actions[0]?.id ?? null,
    prediction: {
      confidence: rawActions && Array.isArray(rawActions) && rawActions.length ? 0.96 : 0.72,
      reason: rawActions && Array.isArray(rawActions) && rawActions.length
        ? "server_action_priority"
        : "context_navigation",
      next_follow_up_at: input.payload?.next_follow_up_at ?? input.payload?.suggest && (input.payload?.suggest as any)?.next_follow_up_at ?? null,
      expires_at: input.payload?.expires_at ?? input.payload?.suggest && (input.payload?.suggest as any)?.expires_at ?? null,
    },
    display: {
      variant: domain === "commerce" ? "journey_card" : domain === "missions" ? "assistant_card" : "smart_card",
      compact: false,
    },
  };
}

export function enrichWaouhSmartPayload(
  payload: Record<string, unknown> | null | undefined,
  input: WaouhSmartInput = {},
): Record<string, unknown> {
  const base = { ...(payload || {}) };
  const smart = buildWaouhSmartEnvelope({ ...input, payload: base });
  return {
    ...base,
    correlation_id: base.correlation_id ?? smart.correlation_id,
    target_route: base.target_route ?? smart.route,
    next_best_action: base.next_best_action ?? smart.next_best_action,
    smart,
  };
}
