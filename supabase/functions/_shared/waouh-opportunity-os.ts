export type ReadinessLevel = "R0" | "R1" | "R2" | "R3" | "R4" | "R5";
export type NextBestAction =
  | "ENRICH"
  | "CONTACT_NOW"
  | "REQUEST_APPROVAL"
  | "OPEN_DEAL_ROOM"
  | "WAIT_REPLY"
  | "FOLLOW_UP"
  | "NEGOTIATE"
  | "EXECUTE"
  | "COMPLETE"
  | "DROP_LOW_QUALITY";

export type ChannelCandidate = {
  channel: string;
  verified?: boolean;
  reachable?: boolean | null;
  public_business?: boolean;
  consent_state?: string | null;
  last4?: string | null;
  last_success_at?: string | null;
  last_failure_at?: string | null;
  reply_count?: number;
  failure_count?: number;
};

export type ContactPackInput = {
  fabricId: string;
  sourceKey?: string | null;
  contactability?: string | null;
  trustScore?: number | null;
  observedAt?: string | null;
  entityResolved?: boolean;
  internalArticle?: boolean;
  threadId?: string | null;
  journeyStage?: string | null;
  replyReceived?: boolean;
  channels?: ChannelCandidate[];
};

const contactabilityScore = (level: string) =>
  ({ C0: 10, C1: 48, C2: 65, C3: 82, C4: 94, C5: 100 } as Record<string, number>)[level] ?? 10;

const channelBase = (channel: string) => {
  switch (channel) {
    case "waouh": return 100;
    case "whatsapp": return 96;
    case "rcs": return 92;
    case "sms":
    case "sms_rcs": return 86;
    case "phone": return 82;
    case "email": return 72;
    case "website": return 54;
    case "facebook":
    case "instagram":
    case "telegram": return 45;
    default: return 30;
  }
};

export function scoreChannel(candidate: ChannelCandidate) {
  let score = channelBase(String(candidate.channel || "").toLowerCase());
  if (candidate.verified) score += 8;
  if (candidate.reachable === true) score += 12;
  if (candidate.reachable === false) score -= 35;
  if (candidate.public_business) score += 5;
  const consent = String(candidate.consent_state || "");
  if (consent === "opt_in") score += 12;
  else if (["partner_contract", "initiated", "public_business"].includes(consent)) score += 5;
  score += Math.min(10, Number(candidate.reply_count || 0) * 2);
  score -= Math.min(20, Number(candidate.failure_count || 0) * 4);
  if (candidate.last_success_at) score += 4;
  if (candidate.last_failure_at && !candidate.last_success_at) score -= 5;
  return Math.max(0, Math.min(100, score));
}

export function rankChannels(channels: ChannelCandidate[]) {
  const canonicalPriority: Record<string, number> = {
    waouh: 6,
    whatsapp: 5,
    rcs: 4.8,
    sms: 4.4,
    sms_rcs: 4.4,
    phone: 4,
    email: 3,
    website: 2,
    facebook: 1,
    instagram: 1,
    telegram: 1,
  };
  return [...channels]
    .map((row) => ({ ...row, score: scoreChannel(row) }))
    .sort((a, b) => {
      const scoreDelta = b.score - a.score;
      if (scoreDelta !== 0) return scoreDelta;
      return (canonicalPriority[String(b.channel).toLowerCase()] ?? 0) -
        (canonicalPriority[String(a.channel).toLowerCase()] ?? 0);
    });
}

export function readinessLevel(input: {
  entityResolved?: boolean;
  channels?: ChannelCandidate[];
  verifiedChannel?: boolean;
  actionableChannel?: boolean;
  replyReceived?: boolean;
}) : ReadinessLevel {
  if (input.replyReceived) return "R5";
  if (input.actionableChannel) return "R4";
  if ((input.channels ?? []).length > 0) return "R3";
  if (input.entityResolved) return "R2";
  if (input.entityResolved === false) return "R1";
  return "R0";
}

export function readinessScore(level: ReadinessLevel) {
  return ({ R0: 5, R1: 22, R2: 40, R3: 62, R4: 86, R5: 100 } as Record<ReadinessLevel, number>)[level];
}

export function computeActionability(input: {
  contactability?: string | null;
  readiness: ReadinessLevel;
  bestChannelScore?: number | null;
  trustScore?: number | null;
  observedAt?: string | null;
}) {
  const c = contactabilityScore(String(input.contactability || "C0").toUpperCase());
  const r = readinessScore(input.readiness);
  const ch = Math.max(0, Math.min(100, Number(input.bestChannelScore ?? 0)));
  const trust = Math.max(0, Math.min(100, Number(input.trustScore ?? 50)));
  const observed = input.observedAt ? Date.parse(input.observedAt) : NaN;
  const ageDays = Number.isFinite(observed) ? Math.max(0, (Date.now() - observed) / 86_400_000) : 30;
  const freshness = Math.max(20, 100 - Math.min(ageDays, 80));
  return Math.round((c * 0.30 + r * 0.30 + ch * 0.22 + trust * 0.12 + freshness * 0.06) * 10) / 10;
}

export function deriveNextBestAction(input: {
  stage?: string | null;
  contactability?: string | null;
  readiness: ReadinessLevel;
  actionability: number;
  internalArticle?: boolean;
  threadId?: string | null;
}): NextBestAction {
  const stage = String(input.stage || "");
  const level = String(input.contactability || "C0").toUpperCase();
  if (stage === "completed") return "COMPLETE";
  if (stage === "executing" || stage === "agreed") return "EXECUTE";
  if (stage === "negotiating" || level === "C5") return "NEGOTIATE";
  if (stage === "waiting_reply" || stage === "contacting") return "WAIT_REPLY";
  if (input.internalArticle && !input.threadId) return "OPEN_DEAL_ROOM";
  if (input.readiness === "R4" && input.actionability >= 60) {
    return level === "C3" ? "REQUEST_APPROVAL" : "CONTACT_NOW";
  }
  if (["C1", "C2", "C3"].includes(level) && input.readiness === "R3") return "ENRICH";
  if (input.actionability < 25) return "DROP_LOW_QUALITY";
  return "ENRICH";
}

export function buildContactPack(input: ContactPackInput) {
  const ranked = rankChannels(input.channels ?? []);
  const level = String(input.contactability || "C0").toUpperCase();
  const internal = input.internalArticle === true;
  const hasActionableChannel =
    internal ||
    ranked.some((row) => row.reachable !== false && (
      row.channel === "waouh" ||
      row.channel === "whatsapp" ||
      row.channel === "rcs" ||
      row.channel === "sms" ||
      row.channel === "sms_rcs" ||
      row.channel === "phone" ||
      row.channel === "email"
    ));
  const verified = ranked.some((row) => row.verified || row.reachable === true);
  const readiness = readinessLevel({
    entityResolved: input.entityResolved,
    channels: ranked,
    verifiedChannel: verified,
    actionableChannel: hasActionableChannel && level !== "C0",
    replyReceived: input.replyReceived || level === "C5",
  });
  const actionability = computeActionability({
    contactability: level,
    readiness,
    bestChannelScore: ranked[0]?.score ?? 0,
    trustScore: input.trustScore,
    observedAt: input.observedAt,
  });
  const nextBestAction = deriveNextBestAction({
    stage: input.journeyStage,
    contactability: level,
    readiness,
    actionability,
    internalArticle: internal,
    threadId: input.threadId,
  });
  return {
    fabric_id: input.fabricId,
    source_key: input.sourceKey ?? null,
    contactability_level: level,
    readiness_level: readiness,
    readiness_score: readinessScore(readiness),
    actionability_score: actionability,
    next_best_action: nextBestAction,
    best_channel: internal ? "waouh" : (ranked[0]?.channel ?? null),
    available_channels: ranked.map((row) => ({
      channel: row.channel,
      score: row.score,
      verified: row.verified === true,
      reachable: row.reachable ?? null,
      public_business: row.public_business === true,
      consent_state: row.consent_state ?? null,
      last4: row.last4 ?? null,
    })),
    masked_contacts: ranked
      .filter((row) => row.last4)
      .map((row) => ({ channel: row.channel, last4: row.last4 })),
    verified_channel: verified,
  };
}

export function mandateAllowsContact(
  mandate: Record<string, unknown>,
  pack: ReturnType<typeof buildContactPack>,
) {
  const autonomy = String(mandate.autonomy_mode ?? "assisted");
  if (autonomy === "assisted") return { allowed: false, reason: "assisted_requires_user_action" };
  if (Number(pack.actionability_score || 0) < Number(mandate.min_actionability_score ?? 65)) {
    return { allowed: false, reason: "actionability_below_threshold" };
  }
  if (!["CONTACT_NOW", "OPEN_DEAL_ROOM"].includes(String(pack.next_best_action))) {
    return { allowed: false, reason: "next_action_not_contact" };
  }
  if (pack.best_channel === "waouh" && mandate.allow_waouh !== false) return { allowed: true, reason: "waouh_allowed" };
  if (pack.best_channel === "whatsapp" && mandate.allow_whatsapp !== false) return { allowed: true, reason: "whatsapp_allowed" };
  if (["sms","rcs","sms_rcs"].includes(String(pack.best_channel)) && mandate.allow_sms_rcs === true) {
    return { allowed: true, reason: "native_messaging_allowed" };
  }
  if (pack.best_channel === "email" && mandate.allow_email === true) return { allowed: true, reason: "email_allowed" };
  return { allowed: false, reason: "channel_not_allowed" };
}


export function remainingContactCapacity(maxContacts: unknown, contactedCount: unknown) {
  const max = Math.max(1, Math.min(20, Number(maxContacts ?? 3) || 3));
  const used = Math.max(0, Number(contactedCount ?? 0) || 0);
  return Math.max(0, max - used);
}

export function boundedFollowUpDecision(input: {
  autonomyMode?: unknown;
  stage?: unknown;
  lastActivityAt?: unknown;
  maxFollowups?: unknown;
  followupsSent?: unknown;
  nowMs?: number;
}) {
  const autonomy = String(input.autonomyMode ?? "assisted");
  const stage = String(input.stage ?? "");
  const maxFollowups = Math.max(0, Math.min(5, Number(input.maxFollowups ?? 0) || 0));
  const sent = Math.max(0, Number(input.followupsSent ?? 0) || 0);
  const now = Number(input.nowMs ?? Date.now());
  const last = typeof input.lastActivityAt === "string" ? Date.parse(input.lastActivityAt) : NaN;
  if (autonomy === "assisted") return { due: false, reason: "assisted" as const, next_index: sent + 1 };
  if (stage !== "waiting_reply") return { due: false, reason: "not_waiting_reply" as const, next_index: sent + 1 };
  if (sent >= maxFollowups) return { due: false, reason: "followup_limit_reached" as const, next_index: sent + 1 };
  if (!Number.isFinite(last) || now - last < 24 * 3600_000) {
    return { due: false, reason: "too_early" as const, next_index: sent + 1 };
  }
  return { due: true, reason: "due" as const, next_index: sent + 1 };
}


export type ChatMandateDirective = {
  autonomyMode: "assisted" | "semi_autonomous" | "autonomous";
  maxContacts: number;
  maxFollowups: number;
  durationHours: number;
};

export function parseChatMandateDirective(
  text: unknown,
  intent: unknown,
): ChatMandateDirective | null {
  const raw = String(text ?? "").trim();
  const normalized = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const normalizedIntent = String(intent ?? "").toUpperCase();
  if (!["BUY", "SELL"].includes(normalizedIntent)) return null;

  // Explicit delegation only. A plain "je cherche" / "je vends" never opts in.
  const contactDirective =
    /\b(contacte|contacter|contactez|contactes|ecris|ecrire|envoyer?\s+(?:un\s+)?message|approche|joins?|joindre)\b/i.test(normalized) &&
    /\b(bot|avatar|tu|vous|pour\s+moi|vendeur|vendeurs|acheteur|acheteurs|contact|contacts)\b/i.test(normalized);
  const explicitDelegation =
    contactDirective ||
    /\b(confie|delegue|laisse)\b.*\b(bot|avatar)\b/i.test(normalized);
  if (!explicitDelegation) return null;

  const assisted =
    /\b(valide\s+chaque|je\s+valide|demande[- ]?moi|avant\s+d[' ]?envoyer|avant\s+de\s+contacter)\b/i.test(normalized);
  const autonomous =
    /\b(autonome|automatiquement|sans\s+me\s+demander|sans\s+validation|tout\s+seul)\b/i.test(normalized);
  const autonomyMode = assisted
    ? "assisted"
    : autonomous
      ? "autonomous"
      : "semi_autonomous";

  const capMatch =
    normalized.match(/(?:jusqu[' ]?a|max(?:imum)?|au\s+plus|limite(?:\s+a)?)\s*[:=]?\s*(\d{1,2})\s*(?:vendeurs?|acheteurs?|contacts?|personnes?)?\b/i) ||
    normalized.match(/\b(?:contacte|contacter|contactez|contactes)\s+(\d{1,2})\b/i);
  const requestedContacts = capMatch ? Number(capMatch[1]) : 3;
  const maxContacts = Math.max(1, Math.min(20, Number.isFinite(requestedContacts) ? requestedContacts : 3));

  const followupMatch = normalized.match(/\brelanc(?:e|er|es)?\s*(\d{1,2})?\s*(?:fois)?\b/i);
  const requestedFollowups = followupMatch
    ? Number(followupMatch[1] || (autonomyMode === "autonomous" ? 2 : 1))
    : (autonomyMode === "autonomous" ? 2 : 1);
  const maxFollowups = autonomyMode === "assisted"
    ? 0
    : Math.max(0, Math.min(5, Number.isFinite(requestedFollowups) ? requestedFollowups : 1));

  let durationHours = 24;
  const hours = normalized.match(/\b(?:pendant|durant|sur)\s+(\d{1,3})\s*h(?:eures?)?\b/i);
  const days = normalized.match(/\b(?:pendant|durant|sur)\s+(\d{1,2})\s*jours?\b/i);
  if (hours) durationHours = Number(hours[1]);
  else if (days) durationHours = Number(days[1]) * 24;
  durationHours = Math.max(1, Math.min(720, durationHours));

  return { autonomyMode, maxContacts, maxFollowups, durationHours };
}


export const OPPORTUNITY_OS_SERVICE_OWNER_ACTIONS = Object.freeze([
  "nexus.global_discovery",
  "nexus.mandate.create",
] as const);

export function serviceMayActForOwner(action: unknown) {
  return (OPPORTUNITY_OS_SERVICE_OWNER_ACTIONS as readonly string[]).includes(String(action ?? ""));
}
