import { invokeWaouhAgentic } from "./agenticClient";
import type { AgenticAction } from "./agenticContracts";
export type ExchangeTerms = {
  amount: number;
  quantity: number;
  currency: string;
  delivery: string;
  payment: string;
};
export type ExchangeAgreement = {
  id: string;
  terms: ExchangeTerms;
  proposed_by: string;
  owner_accepted_at?: string;
  counterparty_accepted_at?: string;
  shipped_at?: string;
  received_at?: string;
  payment_reported_at?: string;
  payment_received_at?: string;
};
export type ExchangeSnapshot = {
  journey: {
    id: string;
    subject: string;
    mode: string;
    stage: string;
    next_action?: string;
  };
  messages: {
    id: string;
    role: string;
    text: string;
    channel: string;
    status: string;
    created_at: string;
    operation: string;
    terms?: ExchangeTerms;
  }[];
  agreement: ExchangeAgreement | null;
  routes: {
    channel: string;
    label: string;
    available: boolean;
    reason?: string;
  }[];
};
export type ExchangeAccess = { journey_id: string } | { token: string };
export function exchangeCall<T>(
  access: ExchangeAccess,
  operation: string,
  payload: Record<string, unknown> = {},
) {
  const prefix = "token" in access ? "nexus.guest" : "nexus.external";
  return invokeWaouhAgentic<T>(`${prefix}.${operation}` as AgenticAction, {
    ...payload,
    ...access,
  });
}
export function exchangeDeliveryLabel(status: string) {
  return (
    (
      {
        simulation: "Simulation · aucun envoi réel",
        pending: "En attente d’envoi",
        queued: "En attente d’envoi",
        processing: "Envoi en cours",
        retry: "Nouvelle tentative prévue",
        sending: "Envoi en cours",
        sent: "Envoyé",
        accepted: "Accepté par le fournisseur",
        delivered: "Livré",
        read: "Lu",
        received: "Réponse reçue",
        recorded: "Publié dans la discussion invitée",
        failed: "Échec de l’envoi",
        cancelled: "Envoi arrêté",
      } as Record<string, string>
    )[status] || "Confirmation en attente"
  );
}
export function exchangeNextStep(snapshot: ExchangeSnapshot) {
  if (snapshot.journey.stage === "cancelled")
    return "Échange arrêté. Aucun nouveau message ne sera envoyé.";
  if (snapshot.journey.stage === "completed")
    return "Réception et paiement reçu confirmés par les participants.";
  const a = snapshot.agreement;
  if (!a) return "Échanger sur la disponibilité, puis proposer des conditions.";
  if (!a.owner_accepted_at || !a.counterparty_accepted_at)
    return "L’autre partie doit confirmer cette version des conditions.";
  if (!a.received_at)
    return "Préparer la livraison, puis faire confirmer la réception par l’acheteur.";
  if (!a.payment_reported_at)
    return "L’acheteur doit déclarer le paiement effectivement réalisé.";
  if (!a.payment_received_at)
    return "Le vendeur doit confirmer qu’il a reçu le paiement.";
  return "Réception et paiement reçu confirmés.";
}
