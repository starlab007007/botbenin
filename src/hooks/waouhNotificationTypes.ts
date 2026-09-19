/**
 * Types et helpers purs des notifications WAOUH.
 *
 * Séparés de `useWaouhMatchNotifications` pour que le module du hook n'exporte
 * QUE le hook : un module qui mélange hooks et fonctions utilitaires casse la
 * frontière React Fast Refresh et provoque l'erreur
 * "Should have a queue. This is likely a bug in React." (écran blanc).
 */

export type WaouhNotification = {
  id: string;
  title: string;
  body: string;
  template: string;
  created_at: string;
  read: boolean;
  image_url?: string | null;
  message_id?: string | null;
  transaction_id?: string | null;
  article_id?: string | null;
  payload?: any;
};

export const MATCH_TEMPLATES = new Set([
  "match",
  "match_buyer",
  "match_seller",
  "new_buyer",
  "radar_match",
]);

/**
 * Templates that represent the user's OWN action (acks/echos), not an
 * inbound event from someone else. The bell only shows incoming/received
 * notifications, so these are filtered out.
 */
export const SELF_TEMPLATES = new Set([
  "sale_published",
  "buyer_interest_ack",
  "negotiation_ack",
  "payment_ack",
]);

export function isSelfNotif(template: string): boolean {
  if (SELF_TEMPLATES.has(template)) return true;
  return /_ack$/.test(template);
}

export function getMatchKind(template: string): "buyer" | "seller" | null {
  if (template === "match_seller" || template === "new_buyer") return "seller";
  if (template === "match" || template === "match_buyer" || template === "radar_match") return "buyer";
  return null;
}

export function getMatchBadgeLabel(template: string): string | null {
  switch (template) {
    case "radar_match":
      return "Radar IA";
    case "match":
    case "match_buyer":
      return "Annonce trouvée";
    case "new_buyer":
    case "match_seller":
      return "Nouvel acheteur";
    case "deal_created":
    case "deal_seller":
    case "deal_buyer":
    case "deal_ops":
    case "deal_assigned":
    case "deal_eta_updated":
    case "deal_picked_up":
    case "deal_delivered":
    case "deal_payment_request":
    case "deal_paid":
    case "deal_cancelled":
      return "Livraison";
    default:
      return null;
  }
}
