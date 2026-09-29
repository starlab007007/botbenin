// WAOUH — Client du parcours unifié v3 (Web).
//
// - Boutons serveur → requête du contrat d'action v3 (waouh-commerce-action).
// - Repli automatique sur l'ancien chemin (waouh-channel-in-secure) tant que
//   l'interrupteur commerce_action_v3 est coupé : aucune régression possible.
// - Étapes du parcours et prix suggéré, identiques au serveur
//   (supabase/functions/_shared/waouh-message-catalog.ts et waouh-predictive.ts).
import { supabase } from "@/integrations/supabase/client";

export type CommerceActionName =
  | "open_deal"
  | "ask"
  | "offer"
  | "accept"
  | "reject"
  | "seller_confirm"
  | "pay_mode"
  | "confirm_payment"
  | "cancel"
  | "text"
  | "transmit_offer"
  | "watch_offer";

export interface CommerceActionBody {
  action: CommerceActionName;
  idem: string;
  article_id?: string | null;
  /** Résultat Nexus (`external:<uuid>`) : le serveur le matérialise en article puis ouvre la Deal Room. */
  fabric_id?: string | null;
  thread_id?: string | null;
  negotiation_id?: string | null;
  deal_id?: string | null;
  amount?: number | null;
  method?: "cash" | "mobile_money" | null;
  text?: string | null;
  confirmed?: boolean;
  source?: string;
  session_id?: string | null;
  /** transmit_offer : relance d'une offre déjà transmise (une par 24 h). */
  follow_up?: boolean;
}

export interface CommerceActionResponse {
  ok: boolean;
  schema?: string;
  thread_id: string | null;
  negotiation_id: string | null;
  deal_id: string | null;
  article_id: string | null;
  stage: JourneyStepKey;
  role: "buyer" | "seller";
  turn: "buyer" | "seller" | "courier" | "none";
  reply: { title: string; detail: string; text: string; key: string };
  actions: Array<{ id: string; label: string }>;
  pending?: Partial<CommerceActionBody> | null;
  suggest?: {
    price: number | null;
    best_action: string | null;
    response_minutes: number | null;
    next_follow_up_at: string | null;
    expires_at: string | null;
    payment_method: string | null;
  };
  replayed?: boolean;
  /** Avatar (offres vers vendeurs externes) : points d'avancement, voie de contact, synthèse. */
  avatar?: {
    progress: Array<{ key: string; label: string; state: "done" | "current" | "todo" }>;
    line: string;
    contact: { level: string; mode: "send_on_tap" | "approval_relay" | "watch"; label: string; eta_hours: number | null } | null;
    synthesis: Record<string, unknown> | null;
  } | null;
  /** Codes d'échec métier : `nexus_direct_deal_disabled` → garder la fiche de contact. */
  code?: string;
  fallback?: string;
}

export const JOURNEY_STEPS = [
  { key: "interest", label: "Intérêt" },
  { key: "negotiation", label: "Négociation" },
  { key: "agreement", label: "Accord" },
  { key: "preparation", label: "Préparation" },
  { key: "courier", label: "Livreur" },
  { key: "delivery", label: "Livraison" },
  { key: "payment", label: "Paiement" },
] as const;

export type JourneyStepKey = (typeof JOURNEY_STEPS)[number]["key"];

const STEP_KEYS = new Set<string>(JOURNEY_STEPS.map((s) => s.key));

/** Étape à partir d'un état stocké (négociation, deal) ou d'une étape déjà calculée. */
export function stageFromWorkflow(value: string | null | undefined): JourneyStepKey | null {
  const v = String(value || "").trim().toLowerCase().replace(/-/g, "_");
  if (!v) return null;
  if (STEP_KEYS.has(v)) return v as JourneyStepKey;
  if (v === "completed" || v === "deal_completed" || v === "paid") return "payment";
  if (v === "delivered") return "delivery";
  if (v === "assigned" || v === "picked_up") return "courier";
  if (v === "pending_assignment") return "preparation";
  if (v === "accepted" || v === "awaiting_confirmation" || v === "deal_created" || v === "deal_accepted") return "agreement";
  if (v === "proposed" || v === "countered" || v === "negotiating" || v === "awaiting_counterparty") return "negotiation";
  if (v === "interest_recorded") return "interest";
  return null;
}

/** Dernière étape connue d'un fil (messages du plus récent au plus ancien). */
export function latestStage(messages: Array<{ meta?: Record<string, unknown> | null }>): JourneyStepKey | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const meta = (messages[i]?.meta || {}) as Record<string, unknown>;
    const stage = stageFromWorkflow(meta.stage as string) ?? stageFromWorkflow(meta.workflow_state as string);
    if (stage) return stage;
  }
  return null;
}

/** Prix suggéré (règle du serveur, sans les bornes marché) : milieu des offres, arrondi à 25 FCFA. */
export function suggestCounterPrice(input: {
  currentOffer?: number | null;
  ownLastOffer?: number | null;
  listPrice?: number | null;
}): number | null {
  const positive = (n: number | null | undefined) => (n != null && Number.isFinite(Number(n)) && Number(n) > 0 ? Number(n) : null);
  const current = positive(input.currentOffer) ?? positive(input.listPrice);
  const own = positive(input.ownLastOffer);
  const raw = current && own ? (current + own) / 2 : current ? current * 0.9 : null;
  if (raw == null) return null;
  const rounded = Math.round(raw / 25) * 25;
  return rounded > 0 ? rounded : null;
}

export function formatFcfa(n: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(Math.round(n))} FCFA`;
}

/** Bouton serveur (« accepter:<uuid> », « je-veux:<uuid> »…) → requête v3. */
export function commerceRequestFromButton(
  actionId: string,
  scope: { thread_id?: string | null; negotiation_id?: string | null; deal_id?: string | null; article_id?: string | null } = {},
): Omit<CommerceActionBody, "idem"> | null {
  const match = String(actionId || "").trim().match(/^([a-z_-]+):([0-9a-f-]{36})$/i);
  if (!match) return null;
  const [, rawKind, target] = match;
  const kind = rawKind.toLowerCase();
  switch (kind) {
    case "accepter":
    case "accept":
      return { action: "accept", negotiation_id: target, thread_id: scope.thread_id ?? null };
    case "refuser":
    case "reject":
      return { action: "reject", negotiation_id: target, thread_id: scope.thread_id ?? null };
    case "je-veux":
    case "open_deal":
      return { action: "open_deal", article_id: target };
    case "confirmer-disponibilite":
      return { action: "seller_confirm", deal_id: target };
    case "payer-mobile":
      return { action: "pay_mode", deal_id: target, method: "mobile_money" };
    case "paiement-livraison":
      return { action: "pay_mode", deal_id: target, method: "cash" };
    case "confirmer-paiement-cash":
      return { action: "confirm_payment", deal_id: target, method: "cash" };
    case "confirmer-paiement-mobile":
      return { action: "confirm_payment", deal_id: target, method: "mobile_money" };
    case "annuler":
      return { action: "cancel", deal_id: target };
    case "envoyer-offre":
    case "transmit_offer":
      return { action: "transmit_offer", negotiation_id: target, thread_id: scope.thread_id ?? null };
    case "relancer":
      return { action: "transmit_offer", negotiation_id: target, thread_id: scope.thread_id ?? null, follow_up: true };
    case "veille":
    case "watch_offer":
      return { action: "watch_offer", negotiation_id: target, thread_id: scope.thread_id ?? null };
    default:
      return null; // contre-offre, question, prix : saisie dans le composeur
  }
}

let disabledUntil = 0;

export function newIdem(): string {
  return `web-${crypto.randomUUID()}`;
}

/**
 * Envoie une action v3. `null` = interrupteur coupé ou indisponible : l'appelant
 * utilise son ancien chemin (et n'insiste pas pendant une minute).
 */
export async function sendCommerceAction(
  body: Omit<CommerceActionBody, "idem"> & { idem?: string },
  sessionId: string | null,
): Promise<CommerceActionResponse | null> {
  if (Date.now() < disabledUntil) return null;
  const payload: CommerceActionBody = { ...body, idem: body.idem ?? newIdem(), session_id: sessionId, source: body.source ?? "web" };
  const { data, error } = await supabase.functions.invoke("waouh-commerce-action", {
    headers: sessionId ? { "x-waouh-session": sessionId } : {},
    body: payload,
  });
  if (error) {
    const status = (error as { context?: { status?: number } })?.context?.status;
    if (status === 503 || status === 404) {
      disabledUntil = Date.now() + 60_000;
      return null;
    }
    throw error;
  }
  const response = data as CommerceActionResponse & { code?: string };
  if (response?.code === "commerce_action_disabled") {
    disabledUntil = Date.now() + 60_000;
    return null;
  }
  return response;
}

/** Tests uniquement. */
export function __resetCommerceActionCache() {
  disabledUntil = 0;
}
