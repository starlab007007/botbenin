// Pure decisions shared by the scheduler and inbound channels.
export type ReplyDisposition = "positive" | "negative" | "stop" | "ambiguous";
export function classifyAvatarReply(value: unknown): ReplyDisposition {
  const text = String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  if (/\b(stop|desabonn|ne me contacte|ne m.ecrivez|retirez mon|supprimez mon)/.test(text)) return "stop";
  if (/\b(ne (?:suis|sommes) plus interesse(?:e?s)?|plus interesse(?:e?s)?|pas interesse(?:e?s)?)\b/.test(text)) return "negative";
  if (/\b(non|pas d.accord|pas interesse|ne suis pas interesse|indisponible|plus disponible|deja vendu|refuse|pas disponible)\b/.test(text)) return "negative";
  if (text.includes("?")) return "ambiguous";
  if (/\b(oui|d.accord|interesse|disponible|je confirme|accept|volontiers|ok)\b/.test(text)) return "positive";
  // A number, a question or a greeting alone never grants an agreement.
  return "ambiguous";
}

export function selectReplyJourney<T extends { payload?: Record<string, any>; status?: string }>(rows: T[], text: string): T | null {
  const token = text.match(/\bWA-([a-f0-9]{8})\b/i)?.[1]?.toLowerCase();
  const unique = new Map<string, T>();
  for (const row of rows) {
    if (row.status && !["sent", "delivered"].includes(row.status)) continue;
    const id = row.payload?.journey_id;
    if (typeof id === "string" && (!token || id.replace(/-/g, "").startsWith(token))) {
      if (!unique.has(id)) unique.set(id, row);
    }
  }
  return unique.size === 1 ? [...unique.values()][0] : null;
}

export const journeyReplyToken = (id: string) => `WA-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;

export function followupDelayHours(durationHours: number, maxFollowups: number) {
  return Math.max(1, Math.min(24, durationHours / (Math.max(0, maxFollowups) + 2)));
}

export function withinMandateBudget(mandate: any, signal: any) {
  const price = Number(signal.price_min ?? signal.price_max ?? 0);
  if (["buy", "ask"].includes(mandate.mode) && Number(mandate.budget_max) > 0 && price > Number(mandate.budget_max)) return false;
  // Unknown price requires a quote; it is never authority to accept one.
  return true;
}

export function planAvatarNegotiation(mandate: any, negotiation: any, rounds: number) {
  const role = mandate.mode === "sell" ? "seller" : "buyer";
  if (mandate.metadata?.agreement_reached_at) return { kind: "wait", reason: "mission_already_agreed" };
  if (mandate.status !== "active" || Date.parse(mandate.expires_at) <= Date.now()) return { kind: "wait", reason: "mandate_inactive" };
  if (!["proposed", "countered"].includes(negotiation.state) || negotiation.last_actor === role) return { kind: "wait", reason: "counterparty_turn" };
  const amount = Number(negotiation.last_offer_price);
  if (!(amount > 0)) return { kind: "approval", action: "negotiate_offer", reason: "quote_required", amount: null };
  const limit = role === "buyer" ? Number(mandate.budget_max) : Number(mandate.metadata?.price_floor);
  const within = limit > 0 && (role === "buyer" ? amount <= limit : amount >= limit);
  if (within) return { kind: "approval", action: "accept_offer", reason: "agreement_confirmation", amount };
  if (mandate.autonomy_mode !== "autonomous" || !(limit > 0) || rounds >= Number(mandate.metadata?.max_negotiation_rounds ?? 3)) {
    return { kind: "approval", action: "negotiate_offer", reason: "terms_require_owner", amount };
  }
  return { kind: "counter", amount: limit, reason: "within_explicit_limit" };
}
