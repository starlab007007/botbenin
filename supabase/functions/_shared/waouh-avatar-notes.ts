// WAOUH — Notes d'avancement, synthèse et suivi de l'avatar pour une offre vers un vendeur externe.
// Pur et testé : aucun accès réseau. L'avatar note, résume et relance, mais n'envoie JAMAIS rien sans un tap de l'acheteur.

import type { ContactPath } from "./waouh-contact-path.ts";

export type StepState = "done" | "current" | "todo";
export interface ProgressStep { key: "verified" | "room" | "offer" | "sent" | "follow" | "reply"; label: string; state: StepState }

export interface ProgressInput {
  hasOffer: boolean;
  transmitted: boolean;
  watching: boolean;
  replied: boolean;
}

/** Points d'avancement de l'avatar (6 étapes). L'étape « courante » est la prochaine action attendue. */
export function progressFor(input: ProgressInput): ProgressStep[] {
  const done = { verified: true, room: true, offer: input.hasOffer, sent: input.transmitted, follow: input.transmitted, reply: input.replied };
  const labels: Record<ProgressStep["key"], string> = {
    verified: "Annonce vérifiée",
    room: "Deal Room ouverte",
    offer: "Offre préparée",
    sent: input.watching && !input.transmitted ? "En veille · contact recherché" : "Offre transmise",
    follow: "Suivi actif",
    reply: "Réponse du vendeur",
  };
  const order: ProgressStep["key"][] = ["verified", "room", "offer", "sent", "follow", "reply"];
  let currentSet = false;
  return order.map((key) => {
    if (done[key]) return { key, label: labels[key], state: "done" as const };
    if (!currentSet) { currentSet = true; return { key, label: labels[key], state: "current" as const }; }
    return { key, label: labels[key], state: "todo" as const };
  });
}

/** « Étape 3/6 · Offre préparée » : ligne courte pour le corps du message. */
export function progressLine(steps: ProgressStep[]): string {
  const doneCount = steps.filter((s) => s.state === "done").length;
  const current = steps.find((s) => s.state === "current") ?? steps[steps.length - 1];
  return `Étape ${Math.min(steps.length, doneCount + (current.state === "current" ? 1 : 0))}/${steps.length} · ${current.label}`;
}

export interface OfferSynthesis {
  offer: number | null;
  listPrice: number | null;
  /** Écart en % par rapport au prix affiché (négatif = sous le prix), null si inconnu. */
  gapPct: number | null;
  stance: "close" | "fair" | "ambitious" | "unknown";
  /** Prix conseillé si l'offre est très ambitieuse (arrondi à 25 FCFA), sinon null. */
  suggested: number | null;
  level: ContactPath["level"];
  etaHours: number | null;
  nextFollowUpAt: string | null;
}

const round25 = (n: number) => Math.round(n / 25) * 25;

/** Synthèse des points notés, calculée à l'envoi de l'offre. */
export function synthesizeOffer(input: {
  offer: number | null;
  listPrice: number | null;
  path: Pick<ContactPath, "level" | "etaHours">;
  now: Date;
}): OfferSynthesis {
  const { offer, listPrice } = input;
  const gapPct = offer && listPrice && listPrice > 0 ? Math.round(((offer - listPrice) / listPrice) * 100) : null;
  const stance: OfferSynthesis["stance"] = gapPct == null ? "unknown" : gapPct >= -5 ? "close" : gapPct >= -25 ? "fair" : "ambitious";
  return {
    offer, listPrice, gapPct, stance,
    suggested: stance === "ambitious" && listPrice ? round25(listPrice * 0.85) : null,
    level: input.path.level,
    etaHours: input.path.etaHours,
    nextFollowUpAt: new Date(input.now.getTime() + FOLLOW_UP_FIRST_H * 3600_000).toISOString(),
  };
}

export const FOLLOW_UP_FIRST_H = 24;
export const FOLLOW_UP_SECOND_H = 72;
export const EXPIRE_AFTER_H = 7 * 24;
export const NUDGE_MIN_GAP_H = 24;
export const WATCH_EXPIRE_H = 14 * 24;

export type FollowUpAction = "wait" | "nudge" | "expire" | "none";

/**
 * Suivi d'une offre transmise. Un rappel (nudge) est une NOTE proposant « Relancer » à l'acheteur :
 * la relance elle-même ne part que sur son tap. Sans réponse : rappels à 24 h et 72 h, clôture proposée à 7 jours.
 */
export function followUpDecision(input: {
  transmittedAt: Date;
  now: Date;
  nudgesNoted: number;
  replied: boolean;
  expiredNoted?: boolean;
}): { action: FollowUpAction; dueAt: string | null; nudgeNo: number } {
  if (input.replied) return { action: "none", dueAt: null, nudgeNo: input.nudgesNoted };
  const hours = (input.now.getTime() - input.transmittedAt.getTime()) / 3600_000;
  if (hours >= EXPIRE_AFTER_H && !input.expiredNoted) return { action: "expire", dueAt: null, nudgeNo: input.nudgesNoted };
  const thresholds = [FOLLOW_UP_FIRST_H, FOLLOW_UP_SECOND_H];
  const next = thresholds[input.nudgesNoted];
  if (next == null) {
    return { action: "wait", dueAt: input.expiredNoted ? null : new Date(input.transmittedAt.getTime() + EXPIRE_AFTER_H * 3600_000).toISOString(), nudgeNo: input.nudgesNoted };
  }
  const dueAt = new Date(input.transmittedAt.getTime() + next * 3600_000).toISOString();
  return hours >= next
    ? { action: "nudge", dueAt, nudgeNo: input.nudgesNoted + 1 }
    : { action: "wait", dueAt, nudgeNo: input.nudgesNoted };
}

/** Relance manuelle autorisée ? (au moins 24 h depuis la dernière transmission ou relance). */
export function nudgeAllowed(input: { lastSentAt: Date; now: Date }): boolean {
  return (input.now.getTime() - input.lastSentAt.getTime()) / 3600_000 >= NUDGE_MIN_GAP_H;
}

/** Veille : recontrôle de joignabilité. Notifie une seule fois quand une voie s'ouvre ; clôt la veille après 14 jours. */
export function watchDecision(input: {
  watchingSince: Date;
  now: Date;
  canSendNow: boolean;
  reachableNoted: boolean;
}): { action: "notify_reachable" | "wait" | "expire" } {
  if (input.canSendNow && !input.reachableNoted) return { action: "notify_reachable" };
  const hours = (input.now.getTime() - input.watchingSince.getTime()) / 3600_000;
  return hours >= WATCH_EXPIRE_H ? { action: "expire" } : { action: "wait" };
}

/** Message d'accroche d'une relance : rappel courtois, jamais de coordonnées. */
export function externalFollowUpMessage(title: string | null | undefined, amount: number | null | undefined): string {
  const name = String(title || "votre annonce").replace(/[*_~`]/g, "").trim().slice(0, 80);
  const price = amount && amount > 0 ? ` (${Math.round(amount).toLocaleString("fr-FR")} FCFA)` : "";
  return `Bonjour, je reviens vers vous au sujet de « ${name} »${price}. Est-ce toujours disponible ? Nous pouvons poursuivre dans WAOUH.`.slice(0, 1000);
}

// ---------------------------------------------------------------------------
// Chronologie de l'avatar reconstruite depuis les messages du fil (source de vérité : le fil lui-même).
// ---------------------------------------------------------------------------
export const AVATAR_INTENTS = {
  sent: "commerce_external_offer_sent",
  nudgeSent: "commerce_external_nudge_sent",
  watching: "commerce_avatar_watching",
  nudgeDue: "commerce_avatar_nudge_due",
  reachable: "commerce_avatar_reachable",
  expired: "commerce_avatar_expired",
} as const;
export const AVATAR_INTENT_LIST = Object.values(AVATAR_INTENTS);

export interface AvatarEvent { at: string; intent: string }

export interface ExternalTimeline {
  transmittedAt: Date | null;
  /** Dernier envoi au tiers (transmission ou relance). */
  lastSentAt: Date | null;
  nudgesSent: number;
  nudgesNoted: number;
  watchingSince: Date | null;
  reachableNoted: boolean;
  expiredNoted: boolean;
}

export function externalTimeline(events: AvatarEvent[]): ExternalTimeline {
  const sorted = [...events].filter((e) => Number.isFinite(Date.parse(e.at))).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const t: ExternalTimeline = { transmittedAt: null, lastSentAt: null, nudgesSent: 0, nudgesNoted: 0, watchingSince: null, reachableNoted: false, expiredNoted: false };
  for (const e of sorted) {
    const at = new Date(e.at);
    switch (e.intent) {
      case AVATAR_INTENTS.sent: t.transmittedAt ??= at; t.lastSentAt = at; break;
      case AVATAR_INTENTS.nudgeSent: t.nudgesSent += 1; t.lastSentAt = at; break;
      case AVATAR_INTENTS.watching: t.watchingSince ??= at; t.reachableNoted = false; break;
      case AVATAR_INTENTS.nudgeDue: t.nudgesNoted += 1; break;
      case AVATAR_INTENTS.reachable: t.reachableNoted = true; break;
      case AVATAR_INTENTS.expired: t.expiredNoted = true; break;
    }
  }
  return t;
}
