/** Display confirmed deal facts; a pending transaction alone is not an agreement. */
export function transactionPresentation(deal: { status: string; payment_status?: string | null; delivered_at?: string | null } | null, transactionStatus?: string, role: "buyer" | "seller" = "buyer") {
  const status = deal?.status || transactionStatus || "unknown";
  const cancelled = ["cancelled", "failed", "refunded"].includes(status);
  const paid = deal?.payment_status === "paid";
  const delivered = !!deal?.delivered_at || status === "delivered" || status === "completed";
  const completed = !cancelled && (status === "completed" || (paid && delivered));
  const paymentReady = !!deal?.delivered_at && !cancelled && !completed && status === "delivered" && !paid;
  const labels: Record<string, string> = {
    awaiting_confirmation: "Confirmations attendues", pending_assignment: "Préparation confirmée", assigned: "Livreur affecté",
    picked_up: "Livraison en cours", delivered: "Remise confirmée", completed: "Terminée", cancelled: "Annulée",
    failed: "Action à reprendre", refunded: "Remboursement enregistré",
  };
  return {
    status, cancelled, paid, delivered, completed, paymentReady,
    label: status === "delivered" && !deal?.delivered_at ? "Remise à vérifier" : labels[status] || "État à vérifier",
    next: cancelled ? "Consulter le résultat dans la discussion." : completed ? "Consulter le reçu et évaluer la transaction." :
      !deal ? "Ouvrir la discussion pour vérifier l’accord et les étapes restantes." :
      status === "delivered" && !deal?.delivered_at ? "Vérifier la confirmation de remise dans la discussion." :
      paymentReady ? role === "seller" ? "Attendre la confirmation du paiement par l’acheteur." : "Confirmer le paiement réellement effectué après la remise." :
      paid ? "Vérifier la remise et la conclusion de la transaction." :
      status === "picked_up" || status === "assigned" ? "Suivre la livraison et vérifier la remise avant le paiement." :
      "Confirmer la disponibilité, le mode de paiement et les modalités de réalisation dans la discussion.",
  };
}
