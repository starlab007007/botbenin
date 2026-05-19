// WAOUH — Module unique de composition (source de vérité)
// Centralise les textes (carte paiement, instructions) et sets d'actions
// pour éviter la duplication et les fragments legacy.

export const fmtFCFA = (n: number | null | undefined) => {
  if (n == null) return "prix à discuter";
  return new Intl.NumberFormat("fr-FR").format(Math.round(Number(n))) + " FCFA";
};

/**
 * Carte de paiement WAOUH — version propre (sans phrase legacy
 * "Appuyez sur Payer ou envoyez payer 0165653468" ni liste 1/2/3).
 * Utilisée pour notifier l'autre partie qu'un paiement est lié à une négo.
 */
export function paymentCard(amount: number, txId?: string | null): string {
  return (
    `\n\n💳 *Carte de paiement WAOUH*` +
    `\n• *Montant* : ${fmtFCFA(amount)}` +
    `\n• *Sécurité* : escrow WAOUH (fonds bloqués)` +
    `\n• *Statut* : en attente` +
    `\n• *Référence* : ${txId ? String(txId).slice(0, 8).toUpperCase() : "créée"}`
  );
}

/**
 * Instructions paiement (étape PAY) — sans phrase legacy.
 * Les boutons interactifs WAHA gèrent les actions Payer/MTN/Moov.
 */
export function paymentInstructions(amount: number, txId?: string | null): string {
  return (
    `💳 *Paiement prêt*` +
    paymentCard(amount, txId) +
    `\n\nvalidez la notification reçue sur votre téléphone`
  );
}

/** Actions vendeur après publication d'annonce. */
export function sellerArticleActions(articleId: string) {
  return [
    { id: `seller_boost:${articleId}`, label: "🚀 Booster" },
    { id: `seller_edit:${articleId}`, label: "✏️ Modifier" },
    { id: `seller_pause:${articleId}`, label: "⏸️ Pause" },
  ];
}

/** Actions vendeur quand un acheteur s'intéresse (négo ouverte). */
export function sellerNegotiationActions(negId: string) {
  return [
    { id: `accept:${negId || ""}`, label: "✅ Accepter" },
    { id: `counter:${negId || ""}`, label: "💬 Contre-offre" },
    { id: `refuse:${negId || ""}`, label: "❌ Refuser" },
  ];
}

/** Actions acheteur pour choisir parmi N résultats (max 3 boutons WAHA). */
export function buyerInterestActions(count: number) {
  return Array.from({ length: Math.min(count, 3) }, (_, i) => ({
    id: `intéressé ${i + 1}`,
    label: `✅ Choisir n°${i + 1}`,
  }));
}

/**
 * Actions paiement — Payer (url) + MTN + Moov.
 * Si `payUrl` absent, bouton Payer rejoue le mot-clé.
 */
export function paymentActions(txId: string | null, payUrl?: string | null) {
  const arr: Array<{ id: string; label: string; url?: string }> = [];
  if (payUrl) arr.push({ id: "pay_open", label: "💳 Payer maintenant", url: payUrl });
  else arr.push({ id: `pay:${txId || ""}`, label: "💳 Payer maintenant" });
  arr.push({ id: "mtn", label: "MTN" });
  arr.push({ id: "moov", label: "Moov" });
  return arr;
}

/** Marketing-cleanup: retire les phrases legacy de tout texte sortant. */
export function stripLegacyPaymentText(text: string): string {
  if (!text) return text;
  return text
    .replace(/\n*👉\s*Appuyez sur \*?Payer\*?[^]*?(?:payer\s*0?165653468|payer\s*\d{8,})\*?/gi, "")
    .replace(/\n*1\.\s*Payer\s*→[^\n]*\n?2\.\s*MTN[^\n]*\n?3\.\s*Moov[^\n]*/gi, "")
    .replace(/\n*1\.\s*Payer[^\n]*\n?2\.\s*Négocier[^\n]*/gi, "")
    .replace(/\n*_Répondez avec le numéro[^\n]*\n?(?:\d+\.[^\n]*\n?)+/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Build contact + geoloc block to send between buyer/seller after payment. */
export function contactExchangeText(
  role: "buyer_to_seller" | "seller_to_buyer",
  other: { display_name?: string | null; phone_number?: string | null; city?: string | null; lat?: number | null; lng?: number | null }
): string {
  const who = role === "buyer_to_seller" ? "vendeur" : "acheteur";
  const name = other.display_name || `Contact ${who}`;
  const phone = other.phone_number ? `\n📞 *WhatsApp* : ${other.phone_number}` : "";
  const city = other.city ? `\n📍 *Ville* : ${other.city}` : "";
  const maps = (other.lat != null && other.lng != null)
    ? `\n🗺️ *Localisation* : https://maps.google.com/?q=${other.lat},${other.lng}`
    : "";
  return (
    `📬 *Coordonnées du ${who}*\n━━━━━━━━━━━━━━━\n` +
    `👤 ${name}` +
    phone +
    city +
    maps +
    `\n━━━━━━━━━━━━━━━\n✅ Vous pouvez désormais convenir de la livraison.`
  );
}
