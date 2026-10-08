import type { NexusOpportunityJourney } from "./nexus";
const steps = ["Recherche", "Vérification", "Contact", "Réponse", "Négociation", "Accord", "Exécution", "Conclusion"];
const stageLabels: Record<NexusOpportunityJourney["stage"], string> = { discovered: "Offre trouvée", enriching: "Vérification en cours", contact_ready: "Contact prêt", contacting: "Contact engagé", waiting_reply: "Réponse attendue", negotiating: "Négociation en cours", agreed: "Accord obtenu", executing: "Exécution en cours", completed: "Terminée", cancelled: "Annulée" };
const stages: Record<NexusOpportunityJourney["stage"], number> = {
  discovered: 0, enriching: 1, contact_ready: 2, contacting: 2, waiting_reply: 3,
  negotiating: 4, agreed: 5, executing: 6, completed: 7, cancelled: 0,
};

const actionLabels: Record<string, string> = {
  canonical_thread_opened: "Discussion ouverte", contact_prepared: "Contact préparé", owner_approval_requested: "Votre validation est attendue",
  counterparty_connected: "Contrepartie connectée", terms_required: "Conditions à préciser", article_selection_required: "Article à choisir",
  whatsapp_contact_queued: "Message mis en file d’envoi", agreement_reached: "Accord obtenu", seller_confirmed: "Disponibilité confirmée",
  preparation_ready_for_courier: "Préparation confirmée", courier_assigned: "Livreur affecté", courier_picked_up: "Colis pris en charge",
  delivery_completed: "Livraison effectuée", payment_completed: "Paiement confirmé", deal_cancelled: "Transaction annulée",
  mission_agreed_elsewhere: "Une autre offre a été retenue", deal_room_retry: "Ouverture de la discussion à reprendre",
};
export function journeyHistory(journey: NexusOpportunityJourney) {
  return (journey.timeline || []).map((event, index) => {
    const action = typeof event.action === "string" ? event.action : "";
    const stage = typeof event.stage === "string" ? event.stage : "";
    const label = typeof event.message === "string" && event.message.trim() ? event.message :
      actionLabels[action] || stageLabels[stage as NexusOpportunityJourney["stage"]] || "Mise à jour du suivi";
    const date = typeof event.at === "string" ? new Date(event.at) : null;
    return { id: index, label, at: date && Number.isFinite(date.getTime()) ? date.toLocaleString("fr-FR", { timeZone: "Africa/Lagos", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : null };
  }).reverse();
}
function nextJourneyInstruction(journey: NexusOpportunityJourney, fallback: string) {
  const next = journey.next_action?.trim();
  const instructions: Record<string, string> = {
    NEGOTIATE: "Examiner la proposition et répondre dans cette discussion.",
    EXECUTE: journey.last_action === "delivery_completed" ? journey.mode === "sell" ? "Attendre la confirmation du paiement par l’acheteur." : "Confirmer le paiement réellement effectué après la remise." :
      journey.last_action === "courier_assigned" || journey.last_action === "courier_picked_up" ? "Suivre la livraison, puis vérifier la remise." : "Confirmer les modalités de préparation et de réalisation.",
    REQUEST_APPROVAL: "Vérifier et valider l’action proposée dans Missions.",
    CONTACT_NOW: "Vérifier le message et confirmer sa transmission.",
    OPEN_DEAL_ROOM: "Continuer dans la discussion de cette offre.",
    WAIT_REPLY: "Attendre la réponse ; les relances restent dans les limites autorisées.",
    ENRICH: "Vérifier les informations et le canal de contact.",
    COMPLETE: "Consulter le résultat et l’historique.", DROP_LOW_QUALITY: "Examiner le blocage ou choisir une autre offre.",
  };
  return next ? instructions[next] || (/^[A-Z][A-Z0-9_]+$/.test(next) ? fallback : next) : fallback;
}
export function journeyPresentation(journey: NexusOpportunityJourney) {
  const index = stages[journey.stage] ?? 0;
  const cancelled = journey.stage === "cancelled";
  const completed = journey.stage === "completed";
  const waiting = journey.stage === "waiting_reply" || journey.stage === "contacting";
  const blocked = ["article_selection_required", "terms_required", "deal_room_retry", "person_contact_cooldown", "owner_approval_requested"].includes(journey.last_action || "");
  const user = journey.last_action === "owner_approval_requested" ? "Vérifier et valider l’action proposée dans Missions." : journey.last_action === "article_selection_required" ? "Choisir l’article à proposer." :
    journey.last_action === "terms_required" ? "Préciser le prix, la quantité et les conditions." :
    journey.last_action === "deal_room_retry" ? "Reprendre l’ouverture de la discussion." :
    completed ? "Consulter le résultat et l’historique." : cancelled ? "Créer une nouvelle recherche si nécessaire." :
    journey.stage === "agreed" ? "Vérifier les modalités de réalisation et les confirmations restantes." :
    journey.stage === "negotiating" ? "Valider le prix et les conditions avant tout engagement." :
    journey.stage === "executing" ? "Confirmer la réception ou la réalisation." : waiting ? "Vous serez informé dès qu’une réponse arrive." :
    "Choisir une offre et confirmer la prise de contact.";
  return {
    steps: steps.map((label, i) => ({ label, state: cancelled ? "pending" : i < index && !completed ? "past" : i === index ? "current" : "pending" })),
    status: cancelled ? "Annulée" : completed ? "Terminée" : blocked ? "Action requise" : journey.last_action === "whatsapp_contact_queued" ? "Envoi en cours" : stageLabels[journey.stage] || "En cours",
    assistant: "Compare les offres et explique les prix, les sources et les conditions.",
    avatar: completed || cancelled ? "Le suivi de cette démarche est terminé." : waiting ? "Suit le contact et les relances autorisées ; aucun accord n’est encore acquis." :
      journey.stage === "negotiating" ? "Accompagne la négociation dans la même discussion." :
      journey.stage === "executing" ? "Suit les étapes de réalisation jusqu’à leur confirmation." : "Vérifie les informations et prépare la prochaine action autorisée.",
    user,
    next: completed || cancelled ? "Aucune action automatique restante." : journey.last_action === "whatsapp_contact_queued" ? "Vérifier l’acheminement du message, puis suivre la réponse." : nextJourneyInstruction(journey, user),
  };
}

export function journeyChatDetail(journey: NexusOpportunityJourney) {
  const threadId = journey.thread_id?.trim();
  if (!threadId) return null;
  return {
    article_id: journey.article_id || null,
    thread_id: threadId,
    negotiation_id: journey.negotiation_id || null,
    deal_id: journey.deal_id || null,
    kind: journey.mode === "sell" ? "seller" : "buyer",
    title: journey.subject || "Démarche WAOUH",
    source: "avatar_opportunity",
  };
}
