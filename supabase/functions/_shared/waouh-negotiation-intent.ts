// WAOUH — Compréhension des réponses de négociation (pure, testable).
//
// Remplace le parseur interne de waouh-negotiation-router, qui avait trois
// défauts mesurés dans l'audit du 27/09/2026 :
//   1. l'identifiant d'un bouton ("contre-proposition:<uuid>") passait dans
//      les expressions de prix, qui extrayaient des chiffres DE L'UUID
//      (ex. "…a123…" → offre de 123 FCFA envoyée à l'autre partie) ;
//   2. "ok pour 7500" était lu comme une ACCEPTATION du prix précédent ;
//   3. le test aiIntent.test.ts testait une copie divergente du parseur,
//      pas le code réellement exécuté.
// Ce module est importé à la fois par le routeur et par les tests.

import { normalizeActionLabel, parseActionPayload } from "./waouh-commands.ts";

export type NegotiationIntent =
  | { kind: "yes" }
  | { kind: "no" }
  | { kind: "price"; price: number; affirmative?: boolean }
  | { kind: "counter_prompt" }
  | { kind: "other" };

export const MIN_OFFER_FCFA = 1;
export const MAX_OFFER_FCFA = 100_000_000;

// Groupe de milliers : espace normale, insécable, fine insécable, point, virgule.
const AMOUNT = String.raw`(\d{1,3}(?:[\s  .,]\d{3})+|\d{1,9})`;
const CURRENCY_RE = new RegExp(String.raw`(?:^|[^\p{L}\p{N}])${AMOUNT}\s*(?:f\s?cfa|fcfa|cfa|xof|f)(?![\p{L}\p{N}])`, "iu");
// Le mot-clé doit être séparé du montant par un espace ou « : » / « = » :
// sinon "-a345-" (morceau d'identifiant) serait lu « à 345 ».
const KEYWORD_RE = new RegExp(
  String.raw`(?:^|[^\p{L}\p{N}])(?:je\s+propose|propose[rz]?|proposition|offre|contre[-\s]?(?:offre|proposition)|prix|pour|à|a)(?:\s*[:=]\s*|\s+)(?:de\s+)?${AMOUNT}(?![\p{L}\p{N}])`,
  "iu",
);
const BARE_RE = new RegExp(String.raw`^${AMOUNT}$`, "u");

const NO_RE = /^(?:non|no|nope|je\s+refuse|refuse[rz]?|refusé|pas\s+d['’]?accord|annule[rz]?)(?![\p{L}\p{N}])/iu;
const YES_RE = /^(?:oui|ok|okay|d['’]?accord|j['’]?accepte|accepte[rz]?|accepté|yes|deal|ça\s+marche|ca\s+marche|marché\s+conclu|je\s+prends)(?![\p{L}\p{N}])/iu;
const COUNTER_WORDS_RE = /^(?:je\s+propose|contre[-\s]?propos\w*|contre[-\s]?offre|faire\s+une\s+contre[-\s]?offre|proposer\s+un\s+(?:autre\s+)?prix)(?![\p{L}\p{N}])/iu;

function toAmount(raw: string | undefined): number | null {
  if (!raw) return null;
  const value = parseInt(raw.replace(/\D/g, ""), 10);
  if (!Number.isFinite(value) || value < MIN_OFFER_FCFA || value > MAX_OFFER_FCFA) return null;
  return value;
}

/** Montant exprimé dans une phrase (jamais extrait d'un identifiant). */
export function extractOfferAmount(text: string): number | null {
  const t = String(text || "").trim();
  if (!t) return null;
  const bare = t.match(BARE_RE);
  if (bare) return toAmount(bare[1]);
  const currency = t.match(CURRENCY_RE);
  if (currency) return toAmount(currency[1]);
  const keyword = t.match(KEYWORD_RE);
  if (keyword) return toAmount(keyword[1]);
  return null;
}

/**
 * Lecture déterministe. Retourne null quand seule l'IA peut trancher.
 * `buttonPayload` (identifiant du bouton touché) est prioritaire sur le texte.
 */
export function parseNegotiationIntent(
  text: string | null | undefined,
  buttonPayload?: string | null,
): NegotiationIntent | null {
  const command = parseActionPayload(buttonPayload) ?? parseActionPayload(text);
  if (command) {
    if (command.kind === "accept") return { kind: "yes" };
    if (command.kind === "reject") return { kind: "no" };
    if (command.kind === "counter") return { kind: "counter_prompt" };
  }

  const raw = String(text || "").trim();
  if (!raw) return { kind: "other" };
  // Libellés de boutons reçus sans identifiant ("💬 Contre-proposer", …).
  const t = normalizeActionLabel(raw);

  if (NO_RE.test(t)) return { kind: "no" };

  const amount = extractOfferAmount(t);
  if (YES_RE.test(t)) {
    return amount ? { kind: "price", price: amount, affirmative: true } : { kind: "yes" };
  }
  if (amount) return { kind: "price", price: amount };
  if (COUNTER_WORDS_RE.test(t)) return { kind: "counter_prompt" };
  return null;
}

/** Valide la sortie de l'IA : jamais de prix hors bornes, jamais de forme inconnue. */
export function sanitizeAiIntent(value: unknown): NegotiationIntent {
  const v = (value && typeof value === "object") ? value as Record<string, unknown> : {};
  const kind = String(v.kind || "").toLowerCase();
  if (kind === "yes") return { kind: "yes" };
  if (kind === "no") return { kind: "no" };
  if (kind === "price") {
    const price = Number(v.price);
    if (Number.isFinite(price) && price >= MIN_OFFER_FCFA && price <= MAX_OFFER_FCFA) {
      return { kind: "price", price: Math.round(price) };
    }
  }
  return { kind: "other" };
}

/**
 * Règle métier : on n'accepte pas sa propre offre. `lastActor` est le rôle
 * qui a fait la dernière proposition (waouh_negotiations.last_actor).
 * Historique sans last_actor : accepté (pas d'information pour refuser).
 */
export function canAcceptOffer(
  lastActor: string | null | undefined,
  actorRole: "buyer" | "seller",
): boolean {
  const last = String(lastActor || "").toLowerCase();
  if (last !== "buyer" && last !== "seller") return true;
  return last !== actorRole;
}
