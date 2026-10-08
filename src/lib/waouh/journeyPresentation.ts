import type { NexusOpportunityJourney } from "./nexus";
const steps = ["Recherche", "Vérification", "Contact", "Réponse", "Négociation", "Accord", "Exécution", "Conclusion"];
const stageLabels: Record<NexusOpportunityJourney["stage"], string> = { discovered: "Offre trouvée", enriching: "Vérification en cours", contact_ready: "Contact prêt", contacting: "Contact engagé", waiting_reply: "Réponse attendue", negotiating: "Négociation en cours", agreed: "Accord obtenu", executing: "Exécution en cours", completed: "Terminée", cancelled: "Annulée" };
const stages: Record<NexusOpportunityJourney["stage"], number> = {
  discovered: 0, enriching: 1, contact_ready: 2, contacting: 2, waiting_reply: 3,
  negotiating: 4, agreed: 5, executing: 6, completed: 7, cancelled: 0,
};
export function journeyPresentation(journey: NexusOpportunityJourney) {
  const index = stages[journey.stage] ?? 0;
  const cancelled = journey.stage === "cancelled";
  const completed = journey.stage === "completed";
  const waiting = journey.stage === "waiting_reply" || journey.stage === "contacting";
  const blocked = ["article_selection_required", "terms_required", "deal_room_retry", "person_contact_cooldown"].includes(journey.last_action || "");
  const user = journey.last_action === "article_selection_required" ? "Choisir l’article à proposer." :
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
    next: completed || cancelled ? "Aucune action automatique restante." : journey.last_action === "whatsapp_contact_queued" ? "Vérifier l’acheminement du message, puis suivre la réponse." : journey.next_action || user,
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
