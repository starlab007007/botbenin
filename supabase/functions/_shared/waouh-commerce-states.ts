// WAOUH — Machine à états déclarée du parcours commerce.
//
// Intérêt → Négociation → Accord → Préparation → Livreur → Livraison → Paiement
//
// Les règles de transition étaient écrites en `if` dans chaque edge function.
// Elles sont déclarées ici une fois, utilisées par waouh-deal-ops, et
// testées (waouh-commerce-states-test.ts). Les valeurs reprennent exactement
// celles utilisées en base au 27/09/2026 (aucun nouvel état).

export type NegotiationState = "proposed" | "countered" | "accepted" | "closed";

export type DealStatus =
  | "awaiting_confirmation"   // accord conclu : dispo vendeur + choix paiement acheteur
  | "pending_assignment"      // prêt : en attente d'un livreur
  | "assigned"                // livreur assigné
  | "picked_up"               // colis récupéré
  | "delivered"               // livré, paiement à confirmer
  | "completed"               // payé, vente terminée
  | "cancelled";

/** Étapes lisibles du parcours, pour l'interface et les rapports. */
export const COMMERCE_JOURNEY: ReadonlyArray<{ step: string; label: string; states: string[] }> = [
  { step: "interest", label: "Intérêt", states: ["interest_recorded"] },
  { step: "negotiation", label: "Négociation", states: ["proposed", "countered"] },
  { step: "agreement", label: "Accord", states: ["accepted", "awaiting_confirmation"] },
  { step: "preparation", label: "Préparation", states: ["pending_assignment"] },
  { step: "courier", label: "Livreur", states: ["assigned", "picked_up"] },
  { step: "delivery", label: "Livraison", states: ["delivered"] },
  { step: "payment", label: "Paiement", states: ["completed"] },
];

export const OPEN_NEGOTIATION_STATES: ReadonlyArray<NegotiationState> = ["proposed", "countered"];
export const TERMINAL_DEAL_STATUSES: ReadonlyArray<DealStatus> = ["completed", "cancelled"];

/** Statuts qu'un opérateur/livreur peut poser via action "status" de waouh-deal-ops. */
export const OPERATOR_DEAL_STATUSES: ReadonlyArray<DealStatus> = ["picked_up", "delivered", "cancelled"];

export type TransitionCheck =
  | { ok: true }
  | { ok: false; httpStatus: 409; body: Record<string, unknown> };

/**
 * Transitions opérateur (reprend à l'identique les réponses historiques de
 * handleStatus, pour ne changer aucun contrat d'API).
 */
export function checkOperatorDealTransition(currentStatus: string | null | undefined, target: string): TransitionCheck {
  const current = String(currentStatus || "");
  if (target === "picked_up" && current !== "assigned") {
    return { ok: false, httpStatus: 409, body: { error: "invalid_deal_transition", expected: "assigned", current_status: currentStatus } };
  }
  if (target === "delivered" && current !== "picked_up") {
    return { ok: false, httpStatus: 409, body: { error: "invalid_deal_transition", expected: "picked_up", current_status: currentStatus } };
  }
  if (target === "cancelled" && (current === "delivered" || current === "completed")) {
    return { ok: false, httpStatus: 409, body: { error: "delivered_deal_requires_dispute", current_status: currentStatus } };
  }
  return { ok: true };
}

export function journeyStepFor(state: string | null | undefined): string | null {
  const value = String(state || "");
  for (const step of COMMERCE_JOURNEY) {
    if (step.states.includes(value)) return step.step;
  }
  return null;
}


/** Paiement transactionnel autorisé uniquement après remise/livraison. */
export function paymentAllowedAfterDelivery(status: string | null | undefined): boolean {
  return ["delivered", "completed"].includes(String(status || ""));
}
