/** Stratégie Bot par parcours + mandat prérempli. Décrit ce que Bot fait, jamais comment. */
export type BotTrack = "buy" | "sell" | "find" | "service" | "job" | "opportunity";

export type BotStrategy = { track: BotTrack; title: string; actions: string[]; userKeeps: string; limitLabel: string | null };

const STRATEGIES: Record<BotTrack, Omit<BotStrategy, "track">> = {
  buy: { title: "Acheter au meilleur prix", actions: ["Contacte le vendeur", "Négocie sous votre plafond", "Passe à l’offre suivante sans réponse"], userKeeps: "Vous validez l’accord et le paiement.", limitLabel: "Prix maximum" },
  sell: { title: "Vendre au bon prix", actions: ["Présente votre annonce", "Répond aux contre-offres", "Refuse sous votre prix plancher"], userKeeps: "Vous validez la vente.", limitLabel: "Prix minimum" },
  find: { title: "Trouver ce qu’il vous faut", actions: ["Élargit la recherche aux villes voisines", "Garde les offres les plus pertinentes", "Vous prévient dès qu’une offre arrive"], userKeeps: "Vous choisissez l’offre.", limitLabel: "Budget maximum" },
  service: { title: "Obtenir le bon service", actions: ["Demande un devis détaillé", "Compare sur la même base", "Négocie sous votre budget"], userKeeps: "Vous validez le prestataire.", limitLabel: "Budget maximum" },
  job: { title: "Réserver une prestation", actions: ["Vérifie la disponibilité et la zone", "Propose des créneaux", "Négocie le tarif"], userKeeps: "Vous confirmez le rendez-vous.", limitLabel: "Tarif maximum" },
  opportunity: { title: "Saisir l’opportunité", actions: ["Vérifie l’éligibilité et la date limite", "Prépare le dossier", "Vous rappelle avant l’échéance"], userKeeps: "Vous déposez le dossier.", limitLabel: null },
};

export function botTrack(mode: "buy" | "sell" | "ask", kind?: string | null): BotTrack {
  if (mode === "sell" || kind === "sale") return "sell";
  if (kind === "service") return "service";
  if (kind === "project") return "job";
  if (kind === "opportunity") return "opportunity";
  return mode === "ask" ? "find" : "buy";
}

export function botStrategy(track: BotTrack): BotStrategy { return { track, ...STRATEGIES[track] }; }

export type MandateDraft = { track: BotTrack; limit: number | null; durationHours: number; maxFollowups: number };

/** Mandat prérempli : plafond = budget saisi, sinon prix affiché (ou médiane marché si plus basse) ;
 *  plancher vente = prix de l’annonce (c’est le minimum que Bot défend) ; 2 relances ; 24 h (72 h pour opportunités/services). */
export function suggestMandate(input: { track: BotTrack; price?: number | null; marketMedian?: number | null; budgetMax?: number | null }): MandateDraft {
  const { track } = input;
  const price = input.price && input.price > 0 ? input.price : null;
  const median = input.marketMedian && input.marketMedian > 0 ? input.marketMedian : null;
  let limit: number | null = null;
  if (track === "sell") limit = price;
  else if (track !== "opportunity") limit = input.budgetMax && input.budgetMax > 0 ? input.budgetMax : price && median ? Math.min(price, median) : price ?? median;
  const durationHours = track === "opportunity" || track === "service" ? 72 : 24;
  return { track, limit: limit == null ? null : Math.round(limit), durationHours, maxFollowups: 2 };
}

const fmt = (n: number) => `${new Intl.NumberFormat("fr-FR").format(n).replace(/\u202f|\u00a0/g, " ")} FCFA`;

export function mandateSummary(d: MandateDraft): string {
  const s = STRATEGIES[d.track];
  const limit = d.limit && s.limitLabel ? (d.track === "sell" ? `, jamais sous ${fmt(d.limit)}` : `, jamais au-dessus de ${fmt(d.limit)}`) : "";
  return `Bot agit pendant ${d.durationHours} h${limit}, avec ${d.maxFollowups} relances au maximum. ${s.userKeeps}`;
}

/** Ligne Bot : dernière action + prochaine étape, en mots simples. */
export function botLine(room: { control_mode?: string | null; agreement?: { status?: string } | null; events?: Array<{ event_type?: string; created_at?: string }> | null; initial_sent?: boolean; next_run_at?: string | null; mandate?: { cascade_step?: number } | null } | null) {
  if (!room) return null;
  const status = room.agreement?.status ?? "";
  const events = (room.events ?? []).filter((e) => e.event_type);
  const last = [...events].reverse().find((e) => LAST[e.event_type as string]);
  const next = status === "accepted" || status === "completed" ? "Finaliser ensemble"
    : status === "proposed" ? "Accord à valider par vous"
    : room.control_mode === "paused" ? "Reprendre Bot ou continuer vous-même"
    : room.control_mode !== "bot" ? "Vous menez l’échange"
    : !events.some((e) => e.event_type === "bot_step" || e.event_type === "guest_contacted") ? "Premier message au vendeur"
    : "Attendre la réponse, relancer si besoin, sinon offre suivante";
  return { last: last ? LAST[last.event_type as string] : "Mission confiée", lastAt: last?.created_at ?? null, next, nextAt: room.control_mode === "bot" ? room.next_run_at ?? null : null };
}

const LAST: Record<string, string> = {
  delegate: "Mission confiée à Bot", bot_step: "Bot a écrit au vendeur", guest_contacted: "Vendeur contacté",
  propose: "Proposition envoyée", accept: "Conditions acceptées", takeover: "Vous avez repris la main",
  pause: "Bot en pause", resume_bot: "Bot a repris", retry_required: "Nouvelle tentative prévue", complete: "Échange clôturé",
};
