/**
 * Vocabulaire « chaud » des cartes produit et des fenêtres de négociation.
 *
 * Règle : un bouton dit ce qui se passe ensuite (proposer, négocier, suivre), jamais
 * « contacter le propriétaire » : chaque carte mène directement à la fenêtre de
 * négociation. Miroir de `flutter_waouh_app/lib/live/live_hot_labels.dart` ; les deux
 * sont vérifiés par `docs/contracts/chat/hot-labels-fixtures.json`.
 */

/** Libellé du bouton principal d'une opportunité selon son niveau de contactabilité (C0–C5). */
export function contactabilityActionLabel(level?: string | null): string {
  switch (String(level ?? "").toUpperCase()) {
    case "C5":
      return "Négocier dans WAOUH";
    case "C4":
      return "Suivre la réponse";
    case "C3":
    case "C2":
      return "Proposer mon offre";
    case "C1":
      return "Bot contacte maintenant";
    default:
      return "Lancer la démarche";
  }
}

/** Bouton d'envoi du premier message d'une démarche. */
export const SEND_OFFER_LABEL = "Envoyer mon offre";

/** Bouton d'enrichissement lorsqu'aucun canal immédiatement exploitable n'est disponible. */
export function findChannelLabel(level?: string | null): string {
  return String(level ?? "").toUpperCase() === "C0" ? "Lancer la recherche du vendeur" : "Enrichir les autres canaux";
}

/** Message pré-rempli d'une démarche : l'intention et la question du prix, pas une simple prise de contact. */
export function interestMessage(title: string): string {
  return `Bonjour, je suis intéressé par « ${title} ». Est-il toujours disponible ? Quel est votre meilleur prix ?`;
}

/**
 * Prix suggéré pour une première offre : 10 % sous le prix affiché, arrondi (pas de 5 sous 500 FCFA, sinon 25).
 * Même calcul que la carte produit ; jamais < 1.
 */
export function smartOfferAmount(listPrice?: number | null): number | null {
  const list = Number(listPrice);
  if (!Number.isFinite(list) || list <= 0) return null;
  const step = list < 500 ? 5 : 25;
  return Math.max(1, Math.round((list * 0.9) / step) * step);
}

/** Libellés froids interdits (garde-fou de test) : ils ne mènent à aucune action. */
export const COLD_LABELS = [
  "Trouver un moyen de contacter",
  "Contacter avec WAOUH",
  "Voir contact",
  "Vérifier le contact",
  "Suivre le contact",
  "Transmettre via WAOUH",
  "contacter le vendeur",
] as const;
