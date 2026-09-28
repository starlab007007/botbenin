// WAOUH — Décision « ouverture directe de la Deal Room » (pure, testée).
//
// Capture 1 du 27/09/2026 : l'acheteur touche « Intéressé » puis envoie un
// prix ; le message porte l'article mais waouh-channel-in ne créait ni fil ni
// négociation, le prix partait vers le moteur général qui répondait
// « Aucune négociation en cours » pendant que le vendeur était notifié.
// Ce module décide, à partir du seul contexte du message, ce que le serveur
// doit faire. Les effets (base, WhatsApp) restent dans waouh-channel-in.

import type { WaouhCommandKind } from "./waouh-commands.ts";

export interface FastPathInput {
  enabled: boolean;
  articleId: string | null;
  actorIsSeller: boolean;
  metaRole: "buyer" | "seller" | null;
  articleButtonKind: WaouhCommandKind | null;
  interestSignal: boolean;
  askSignal: boolean;
  offerAmount: number | null;
  explicitOffer: boolean;
  shouldStayInCore: boolean;
  textIsLabel: boolean;
  text: string;
  openNegotiation: { id: string; lastActor: string | null; lastOfferPrice: number | null } | null;
}

export type FastPathDecision =
  | { kind: "none" }
  | { kind: "open"; offer: number | null }
  | { kind: "open_thread"; prompt: "offer" | "question" }
  | { kind: "relay_question"; question: string }
  | { kind: "resume" }
  | { kind: "awaiting"; amount: number };

const INTEREST_ACTIONS = new Set([
  "interest","interested","buyer_interest","open_deal","je_veux","product_interest",
]);

export function metaSignalsInterest(meta: Record<string, unknown> | null | undefined): boolean {
  const m = meta || {};
  for (const key of ["intent", "action", "commerce_action"]) {
    const value = String((m as Record<string, unknown>)[key] ?? "").trim().toLowerCase();
    if (value && INTEREST_ACTIONS.has(value)) return true;
  }
  return false;
}

export function metaSignalsAsk(meta: Record<string, unknown> | null | undefined): boolean {
  const value = String((meta || {} as Record<string, unknown>)["commerce_action"] ?? "").trim().toLowerCase();
  return value === "ask" || value === "question";
}

export function decideFastPath(input: FastPathInput): FastPathDecision {
  if (!input.enabled || !input.articleId) return { kind: "none" };
  if (input.actorIsSeller || input.metaRole === "seller") return { kind: "none" };
  const freeText = input.textIsLabel ? "" : String(input.text || "").trim();

  switch (input.articleButtonKind) {
    case "open_deal":
      return input.openNegotiation ? { kind: "resume" } : { kind: "open", offer: input.offerAmount };
    case "offer_prompt":
      return { kind: "open_thread", prompt: "offer" };
    case "ask":
      return freeText ? { kind: "relay_question", question: freeText } : { kind: "open_thread", prompt: "question" };
    default:
      break;
  }

  if (input.askSignal && freeText) return { kind: "relay_question", question: freeText };

  const neg = input.openNegotiation;
  if (neg) {
    if (
      input.offerAmount != null &&
      String(neg.lastActor || "").toLowerCase() === "buyer" &&
      neg.lastOfferPrice != null &&
      Number(neg.lastOfferPrice) === input.offerAmount
    ) {
      return { kind: "awaiting", amount: input.offerAmount };
    }
    if (input.offerAmount == null && input.interestSignal && !input.shouldStayInCore) return { kind: "resume" };
    return { kind: "none" };
  }

  if (input.offerAmount != null && (input.explicitOffer || input.interestSignal)) {
    return { kind: "open", offer: input.offerAmount };
  }
  if (input.interestSignal && !input.shouldStayInCore) return { kind: "open", offer: null };
  return { kind: "none" };
}

const EXPLICIT_OFFER_RE = /^(?:je\s+propose|propose[rz]?|mon\s+offre|offre|contre[-\s]?(?:offre|proposition)|ok\s+pour|d['’]?accord\s+pour)\b/i;
const CURRENCY_RE = /\d\s*(?:f\s?cfa|fcfa|cfa|xof)\b/i;
const BARE_AMOUNT_RE = /^\d[\d\s\u00a0\u202f.,]{2,}$/;

export function isExplicitOfferText(text: string | null | undefined): boolean {
  const t = String(text || "").trim();
  if (!t) return false;
  return EXPLICIT_OFFER_RE.test(t) || CURRENCY_RE.test(t) || BARE_AMOUNT_RE.test(t);
}
