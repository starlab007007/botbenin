// WAOUH — Voie de contact d'un vendeur externe (politique C0–C5, sans impasse).
//
// Avant : un niveau qui ne permettait pas l'envoi finissait sur un refus sec (`contact_not_permitted`, `contact_not_found`)
// APRÈS le tap de l'acheteur. Désormais chaque niveau débouche sur une voie d'action :
//   - le consentement du tiers n'est JAMAIS contourné (C0 : aucun canal ; C1 : contact public professionnel, tap de l'acheteur ;
//     C2 : message médié, validé par l'annonceur ; C3–C5 : contact vérifié / établi / interne) ;
//   - quand l'envoi n'est pas possible MAINTENANT, l'avatar garde l'offre « en veille », recontrôle la joignabilité et prévient
//     l'acheteur dès qu'une voie s'ouvre.
// L'entrée en Deal Room (côté acheteur) ne dépend d'aucun niveau.

export type ContactMode = "send_on_tap" | "approval_relay" | "watch";
export type WatchReason = "channel_unknown" | "no_reachable_contact" | "sign_in_required" | null;

export interface ContactPath {
  level: "C0" | "C1" | "C2" | "C3" | "C4" | "C5";
  mode: ContactMode;
  canSendNow: boolean;
  watchReason: WatchReason;
  /** Libellé court pour l'acheteur (jamais « contacter »). */
  label: string;
  /** Délai de réponse attendu, en heures (null si non pertinent). */
  etaHours: number | null;
}

const LEVELS = ["C0", "C1", "C2", "C3", "C4", "C5"] as const;
export const normalizeLevel = (level: unknown): ContactPath["level"] => {
  const v = String(level ?? "C0").toUpperCase();
  return (LEVELS as readonly string[]).includes(v) ? v as ContactPath["level"] : "C0";
};

export function resolveContactPath(input: {
  level: unknown;
  /** Un contact utilisable existe-t-il (public pour C1) ? null = inconnu (traité comme non joignable). */
  reachable: boolean | null;
  /** L'acheteur a un jeton (la politique s'applique à son compte, pas à un invité). */
  signedIn: boolean;
  /** C2 : un annonceur WAOUH peut valider le relais. */
  relayAvailable?: boolean;
}): ContactPath {
  const level = normalizeLevel(input.level);
  const watch = (watchReason: WatchReason, label: string): ContactPath =>
    ({ level, mode: "watch", canSendNow: false, watchReason, label, etaHours: null });

  if (!input.signedIn) return watch("sign_in_required", "Connectez-vous pour envoyer");
  switch (level) {
    case "C0":
      return watch("channel_unknown", "Avatar cherche un contact");
    case "C1":
      return input.reachable === true
        ? { level, mode: "send_on_tap", canSendNow: true, watchReason: null, label: "Contact public vérifié", etaHours: 24 }
        : watch("no_reachable_contact", "Avatar cherche un contact");
    case "C2":
      return input.relayAvailable === true || input.reachable === true
        ? { level, mode: "approval_relay", canSendNow: true, watchReason: null, label: "Relais validé par l'annonceur", etaHours: 24 }
        : watch("no_reachable_contact", "Avatar cherche un contact");
    case "C3":
      return input.reachable === true
        ? { level, mode: "send_on_tap", canSendNow: true, watchReason: null, label: "Contact vérifié", etaHours: 12 }
        : watch("no_reachable_contact", "Avatar cherche un contact");
    case "C4":
      return input.reachable === true
        ? { level, mode: "send_on_tap", canSendNow: true, watchReason: null, label: "Contact établi", etaHours: 6 }
        : watch("no_reachable_contact", "Avatar cherche un contact");
    default: // C5 : négociation dans WAOUH, aucun canal externe
      return { level, mode: "send_on_tap", canSendNow: true, watchReason: null, label: "Prêt à négocier", etaHours: 1 };
  }
}
