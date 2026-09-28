// WAOUH — Texte libre strict dans le parcours commerce (v3).
//
// Pipeline : 1) règles déterministes, 2) références au contexte (« le 2 »,
// « le premier », « celui à 2 500 »), 3) modèle contraint à un JSON fermé
// (optionnel, injecté par l'appelant). Seuils : ≥ 0,85 exécuté, 0,6 à 0,85
// confirmation, < 0,6 « je n'ai pas compris » + actions attendues.
// Règle d'or : une action d'argent issue du modèle n'est JAMAIS exécutée sans
// un tap de confirmation.

import { extractOfferAmount, parseNegotiationIntent, sanitizeAiIntent } from "./waouh-negotiation-intent.ts";
import type { JourneyStepKey } from "./waouh-message-catalog.ts";

export type FreeTextAction =
  | "open_deal"
  | "ask"
  | "offer"
  | "accept"
  | "reject"
  | "seller_confirm"
  | "pay_mode"
  | "confirm_payment"
  | "cancel"
  | "counter_prompt"
  | "none";

export const MONEY_ACTIONS: ReadonlySet<FreeTextAction> = new Set([
  "offer", "accept", "seller_confirm", "pay_mode", "confirm_payment", "cancel",
]);

export const EXECUTE_THRESHOLD = 0.85;
export const CONFIRM_THRESHOLD = 0.6;

export interface FreeTextContext {
  stage: JourneyStepKey;
  role: "buyer" | "seller";
  lastResults?: Array<{ index: number; articleId: string; price?: number | null }>;
  currentOffer?: number | null;
}

export interface FreeTextResult {
  action: FreeTextAction;
  confidence: number;
  source: "rule" | "context" | "model" | "none";
  amount?: number;
  method?: "cash" | "mobile_money";
  articleId?: string;
  question?: string;
  needsConfirm: boolean;
  execute: boolean;
}

function finalize(r: Omit<FreeTextResult, "needsConfirm" | "execute">): FreeTextResult {
  if (r.action === "none" || r.confidence < CONFIRM_THRESHOLD) {
    return { ...r, action: r.action === "none" ? "none" : r.action, needsConfirm: false, execute: false };
  }
  const money = MONEY_ACTIONS.has(r.action);
  const fromModel = r.source === "model";
  const execute = r.confidence >= EXECUTE_THRESHOLD && !(money && fromModel);
  return { ...r, needsConfirm: !execute, execute };
}

const ORDINALS: Record<string, number> = {
  premier: 1, première: 1, "1er": 1, "1re": 1, deuxième: 2, second: 2, seconde: 2, "2e": 2,
  troisième: 3, "3e": 3, quatrième: 4, "4e": 4, cinquième: 5, "5e": 5,
};

export function resolveResultReference(
  text: string,
  results: FreeTextContext["lastResults"] = [],
): { articleId: string; index: number } | null {
  if (!results?.length) return null;
  const t = text.toLowerCase().normalize("NFC").trim();
  const num = t.match(/^(?:le|la|l['’]|n[°o]\s*|#|num[ée]ro\s*)?\s*(\d{1,2})\s*$/)
    ?? t.match(/\b(?:le|la|n[°o]|num[ée]ro)\s*(\d{1,2})\b/);
  let index: number | null = num ? Number(num[1]) : null;
  if (index == null) {
    for (const [word, value] of Object.entries(ORDINALS)) {
      if (new RegExp(`(?:^|\\s)(?:le|la)?\\s*${word}(?:\\s|$)`).test(t)) { index = value; break; }
    }
  }
  if (index != null) {
    const hit = results.find((r) => r.index === index);
    return hit ? { articleId: hit.articleId, index: hit.index } : null;
  }
  const priced = t.match(/(?:celui|celle|l['’]article)\s+(?:à|a|de)\s+([\d\s.,  ]{3,})/);
  if (priced) {
    const amount = extractOfferAmount(priced[1].trim());
    const hits = results.filter((r) => amount != null && Number(r.price) === amount);
    if (hits.length === 1) return { articleId: hits[0].articleId, index: hits[0].index };
  }
  return null;
}

const CASH_RE = /\b(?:cash|esp[èe]ces?|liquide)\b/i;
const MOMO_RE = /\b(?:mobile\s*money|momo|mtn|moov|flooz)\b/i;
const PAID_RE = /(?:^|\s)(?:j['’]?ai\s+(?:bien\s+)?pay[ée]|paiement\s+(?:fait|effectu[ée])|c['’]?est\s+pay[ée])(?![\p{L}\p{N}])/iu;
const AVAILABLE_RE = /\b(?:(?:il|elle)\s+est\s+)?(?:toujours\s+|encore\s+)?disponible\b|\bje\s+confirme\b/i;
const CANCEL_RE = /\b(?:annule[rz]?|je\s+(?:n['’]en\s+)?veux\s+plus|laisse[rz]?\s+tomber)\b/i;
const QUESTION_RE = /\?\s*$|^(?:est[-\s]ce|combien|quel(?:le)?s?|o[uù]|quand|comment|pourquoi|y\s+a[-\s]t[-\s]il|il\s+y\s+a)\b/i;
const WANT_RE = /^(?:je\s+(?:le|la)\s+veux|je\s+prends|je\s+suis\s+int[ée]ress[ée])/i;

export function classifyDeterministic(text: string, ctx: FreeTextContext): FreeTextResult | null {
  const raw = String(text || "").trim();
  if (!raw) return finalize({ action: "none", confidence: 0, source: "none" });

  if (ctx.stage === "interest") {
    const ref = resolveResultReference(raw, ctx.lastResults);
    if (ref) return finalize({ action: "open_deal", confidence: 0.9, source: "context", articleId: ref.articleId });
  }

  if (QUESTION_RE.test(raw) && !extractOfferAmount(raw)) {
    return finalize({ action: "ask", confidence: 0.9, source: "rule", question: raw });
  }

  if (ctx.stage === "interest" && WANT_RE.test(raw)) {
    return finalize({ action: "open_deal", confidence: 0.9, source: "rule" });
  }

  if (ctx.stage === "interest" || ctx.stage === "negotiation") {
    const intent = parseNegotiationIntent(raw);
    if (intent?.kind === "price") return finalize({ action: "offer", confidence: 0.95, source: "rule", amount: intent.price });
    if (ctx.stage === "negotiation") {
      if (intent?.kind === "yes") return finalize({ action: "accept", confidence: 0.9, source: "rule" });
      if (intent?.kind === "no") return finalize({ action: "reject", confidence: 0.9, source: "rule" });
      if (intent?.kind === "counter_prompt") return finalize({ action: "counter_prompt", confidence: 0.9, source: "rule" });
    }
  }

  if (ctx.stage === "agreement") {
    if (ctx.role === "buyer") {
      if (MOMO_RE.test(raw)) return finalize({ action: "pay_mode", method: "mobile_money", confidence: 0.9, source: "rule" });
      if (CASH_RE.test(raw)) return finalize({ action: "pay_mode", method: "cash", confidence: 0.9, source: "rule" });
    } else if (AVAILABLE_RE.test(raw)) {
      return finalize({ action: "seller_confirm", confidence: 0.9, source: "rule" });
    }
  }

  if (ctx.stage === "delivery" && ctx.role === "buyer" && PAID_RE.test(raw)) {
    return { action: "confirm_payment", confidence: 0.8, source: "rule", needsConfirm: true, execute: false,
      method: MOMO_RE.test(raw) ? "mobile_money" : "cash" };
  }

  if (CANCEL_RE.test(raw) && ["agreement", "preparation"].includes(ctx.stage)) {
    return { action: "cancel", confidence: 0.8, source: "rule", needsConfirm: true, execute: false };
  }
  return null;
}

export function sanitizeModelOutput(value: unknown, ctx: FreeTextContext): FreeTextResult {
  const v = (value && typeof value === "object") ? value as Record<string, unknown> : {};
  const action = String(v.action || "none") as FreeTextAction;
  const allowed: FreeTextAction[] = ["open_deal", "ask", "offer", "accept", "reject", "seller_confirm", "pay_mode", "confirm_payment", "cancel", "counter_prompt", "none"];
  if (!allowed.includes(action)) return finalize({ action: "none", confidence: 0, source: "model" });
  const confidence = Math.max(0, Math.min(1, Number(v.confidence) || 0));
  const out: Omit<FreeTextResult, "needsConfirm" | "execute"> = { action, confidence, source: "model" };
  if (action === "offer") {
    const price = sanitizeAiIntent({ kind: "price", price: v.amount });
    if (price.kind !== "price") return finalize({ action: "none", confidence: 0, source: "model" });
    out.amount = price.price;
  }
  if (action === "pay_mode" || action === "confirm_payment") {
    const method = v.method === "cash" || v.method === "mobile_money" ? v.method : null;
    if (!method) return finalize({ action: "none", confidence: 0, source: "model" });
    out.method = method;
  }
  if (action === "ask") out.question = typeof v.question === "string" ? v.question.slice(0, 500) : undefined;
  const byStage: Record<JourneyStepKey, FreeTextAction[]> = {
    interest: ["open_deal", "ask", "offer"],
    negotiation: ["ask", "offer", "accept", "reject", "counter_prompt"],
    agreement: ["ask", "seller_confirm", "pay_mode", "cancel"],
    preparation: ["ask", "cancel"],
    courier: ["ask"],
    delivery: ["ask", "confirm_payment"],
    payment: ["ask"],
  };
  if (action !== "none" && !byStage[ctx.stage].includes(action)) {
    return finalize({ action: "none", confidence: 0, source: "model" });
  }
  return finalize(out);
}

export const MODEL_SYSTEM_PROMPT =
  "Tu classes UNE réponse d'un utilisateur dans un parcours d'achat. Réponds UNIQUEMENT en JSON " +
  '{"action":"open_deal|ask|offer|accept|reject|seller_confirm|pay_mode|confirm_payment|cancel|counter_prompt|none",' +
  '"amount":number?,"method":"cash|mobile_money"?,"question":string?,"confidence":0..1}. ' +
  "N'invente jamais de montant absent du texte. En cas de doute : none.";

export async function classifyFreeText(
  text: string,
  ctx: FreeTextContext,
  model?: (system: string, user: string) => Promise<unknown>,
): Promise<FreeTextResult> {
  const deterministic = classifyDeterministic(text, ctx);
  if (deterministic) return deterministic;
  if (!model) return finalize({ action: "none", confidence: 0, source: "none" });
  try {
    const raw = await model(MODEL_SYSTEM_PROMPT, `Étape: ${ctx.stage}. Rôle: ${ctx.role}. Message: ${String(text).slice(0, 500)}`);
    return sanitizeModelOutput(raw, ctx);
  } catch {
    return finalize({ action: "none", confidence: 0, source: "none" });
  }
}
