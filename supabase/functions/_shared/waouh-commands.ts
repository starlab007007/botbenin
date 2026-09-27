// WAOUH — Registre unique des commandes de Deal Room (boutons WhatsApp / Web).
//
// Avant : les identifiants de boutons étaient générés dans 4 fichiers
// (negotiation-router, deal-ops, buyer-interest, outbound-dispatch) et
// reconnus par une liste d'alias recopiée dans waouh-channel-in. Une dérive
// d'un côté cassait silencieusement la reconnaissance de l'autre.
// Maintenant : générateurs + reconnaissance au même endroit, testés ensemble
// (waouh-commands-test.ts).
//
// Format d'un identifiant de bouton : "<commande>:<uuid>" — uuid = négociation
// pour accepter / refuser / contre-proposer, deal pour les étapes suivantes.

export type WaouhAction = { id: string; label: string; url?: string; phone?: string };

export type WaouhCommandKind =
  | "accept"
  | "reject"
  | "counter"
  | "seller_confirm"
  | "payment_preference_mobile"
  | "payment_preference_cash"
  | "confirm_payment_cash"
  | "confirm_payment_mobile"
  | "cancel";

export interface ParsedWaouhCommand {
  kind: WaouhCommandKind;
  targetId: string;
  scope: "negotiation" | "deal";
  raw: string;
}

// Alias historiques acceptés (FR = identifiants émis aujourd'hui, EN = anciens
// contrats). Toute nouvelle forme doit être ajoutée ICI et nulle part ailleurs.
const COMMAND_ALIASES: Record<string, WaouhCommandKind> = {
  "accepter": "accept",
  "accept": "accept",
  "accept_offer": "accept",
  "refuser": "reject",
  "reject": "reject",
  "reject_offer": "reject",
  "contre-proposition": "counter",
  "counter": "counter",
  "counter_offer": "counter",
  "confirmer-disponibilite": "seller_confirm",
  "seller_confirm": "seller_confirm",
  "seller_confirm_available": "seller_confirm",
  "payer-mobile": "payment_preference_mobile",
  "payment_mobile": "payment_preference_mobile",
  "payment_preference_mobile": "payment_preference_mobile",
  "paiement-livraison": "payment_preference_cash",
  "payment_delivery": "payment_preference_cash",
  "payment_preference_cod": "payment_preference_cash",
  "confirmer-paiement-cash": "confirm_payment_cash",
  "confirm_payment_cash": "confirm_payment_cash",
  "confirmer-paiement-mobile": "confirm_payment_mobile",
  "confirm_payment_mobile": "confirm_payment_mobile",
  "annuler": "cancel",
  "cancel": "cancel",
  "cancel_deal": "cancel",
};

const NEGOTIATION_KINDS = new Set<WaouhCommandKind>(["accept", "reject", "counter"]);

export function commandKindFromAlias(alias: string | null | undefined): WaouhCommandKind | null {
  const key = String(alias || "").trim().toLowerCase();
  return COMMAND_ALIASES[key] ?? null;
}

/** "accepter:<uuid>" → { kind: "accept", targetId, scope: "negotiation" } */
export function parseActionPayload(payload: string | null | undefined): ParsedWaouhCommand | null {
  const raw = String(payload || "").trim();
  const match = raw.match(/^([a-z_-]+):([0-9a-f][0-9a-f-]{7,})$/i);
  if (!match) return null;
  const kind = commandKindFromAlias(match[1]);
  if (!kind) return null;
  return {
    kind,
    targetId: match[2].toLowerCase(),
    scope: NEGOTIATION_KINDS.has(kind) ? "negotiation" : "deal",
    raw,
  };
}

// ---------------------------------------------------------------------------
// Générateurs (libellés identiques à ceux en production au 27/09/2026).
// ---------------------------------------------------------------------------
export const negotiationActions = (negotiationId: string): WaouhAction[] => [
  { id: `accepter:${negotiationId}`, label: "✅ Accepter" },
  { id: `contre-proposition:${negotiationId}`, label: "💬 Contre-proposer" },
  { id: `refuser:${negotiationId}`, label: "❌ Refuser" },
];

/** Décision du vendeur sur une offre acheteur (libellés de waouh-buyer-interest). */
export const sellerOfferDecisionActions = (negotiationId: string): WaouhAction[] => [
  { id: `accepter:${negotiationId}`, label: "✅ Accepter le prix" },
  { id: `contre-proposition:${negotiationId}`, label: "💬 Faire une contre-offre" },
  { id: `refuser:${negotiationId}`, label: "❌ Refuser" },
];

export const buyerPaymentActions = (dealId: string): WaouhAction[] => [
  { id: `payer-mobile:${dealId}`, label: "📱 Mobile Money à la livraison" },
  { id: `paiement-livraison:${dealId}`, label: "💵 Cash à la livraison" },
  { id: `annuler:${dealId}`, label: "❌ Annuler" },
];

export const sellerAvailabilityActions = (dealId: string): WaouhAction[] => [
  { id: `confirmer-disponibilite:${dealId}`, label: "✅ Article disponible" },
  { id: `annuler:${dealId}`, label: "❌ Indisponible" },
];

// ---------------------------------------------------------------------------
// WhatsApp : retrouver l'identifiant du bouton touché.
// Selon le moteur WAHA, une réponse à un bouton arrive avec l'identifiant
// (selectedButtonId, …) et/ou seulement le libellé dans `body`. Le texte
// extrait aujourd'hui privilégie `body` : l'identifiant était donc perdu, et
// "💬 Contre-proposer" partait vers le moteur général (intention erronée).
// ---------------------------------------------------------------------------
export function buttonIdFromWahaPayload(payload: any): string | null {
  const candidates = [
    payload?.selectedButtonId,
    payload?._data?.selectedButtonId,
    payload?.button?.id,
    payload?.buttonReply?.id,
    payload?.interactive?.button_reply?.id,
    payload?.listResponse?.singleSelectReply?.selectedRowId,
    payload?._data?.listResponse?.singleSelectReply?.selectedRowId,
    payload?.selectedRowId,
  ];
  for (const candidate of candidates) {
    const value = String(candidate || "").trim();
    if (value && parseActionPayload(value)) return value;
  }
  return null;
}

/** Normalise un libellé de bouton : sans emoji/ponctuation de tête, minuscules. */
export function normalizeActionLabel(text: string | null | undefined): string {
  return String(text || "")
    .normalize("NFC")
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Libellés connus (générateurs ci-dessus + libellés courts de waouh-outbound-dispatch). */
export const KNOWN_ACTION_LABELS: ReadonlySet<string> = new Set(
  [
    ...negotiationActions("x"),
    ...sellerOfferDecisionActions("x"),
    ...buyerPaymentActions("x"),
    ...sellerAvailabilityActions("x"),
    { id: "x", label: "📱 Mobile Money" },
    { id: "x", label: "💵 Cash livraison" },
    { id: "x", label: "✅ Confirmer Mobile Money" },
    { id: "x", label: "✅ Confirmer paiement" },
  ].map((action) => normalizeActionLabel(action.label)),
);

export function looksLikeActionLabel(text: string | null | undefined): boolean {
  return KNOWN_ACTION_LABELS.has(normalizeActionLabel(text));
}

/**
 * Retrouve l'identifiant d'un bouton à partir de son seul libellé, en le
 * cherchant dans les dernières actions proposées à cet utilisateur.
 */
export function findActionIdByLabel(
  recentActionSets: Array<Array<{ id?: string; label?: string }> | null | undefined>,
  text: string,
): string | null {
  const wanted = normalizeActionLabel(text);
  if (!wanted) return null;
  for (const actions of recentActionSets) {
    for (const action of actions || []) {
      if (normalizeActionLabel(action?.label) === wanted && parseActionPayload(action?.id)) {
        return String(action!.id);
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Commandes post-accord (déplacé depuis waouh-channel-in pour être testé).
// Mêmes alias qu'avant. Quand le bouton porte son propre deal, c'est lui qui
// fait foi (avant : meta.deal_id, éventuellement périmé, primait sur
// l'identifiant du bouton réellement touché).
// ---------------------------------------------------------------------------
export type DealCommand = {
  action: "seller_confirm" | "payment_preference" | "cancel" | "payment";
  dealId: string;
  method?: "cash" | "mobile_money";
};

export function parseDealCommand(text: string, meta: Record<string, any>): DealCommand | null {
  const buttonPayload = String(meta?.button_payload || "").trim();
  const commerceAction = String(meta?.commerce_action || meta?.action || "").trim().toLowerCase();
  const parsed = parseActionPayload(buttonPayload || String(text || "").trim());
  const kind = parsed?.kind ?? commandKindFromAlias(commerceAction);
  if (!kind) return null;
  const dealId = String(
    (parsed?.scope === "deal" ? parsed.targetId : "") || meta?.deal_id || "",
  ).trim();
  if (!dealId) return null;
  switch (kind) {
    case "seller_confirm": return { action: "seller_confirm", dealId };
    case "payment_preference_mobile": return { action: "payment_preference", dealId, method: "mobile_money" };
    case "payment_preference_cash": return { action: "payment_preference", dealId, method: "cash" };
    case "confirm_payment_cash": return { action: "payment", dealId, method: "cash" };
    case "confirm_payment_mobile": return { action: "payment", dealId, method: "mobile_money" };
    case "cancel": return { action: "cancel", dealId };
    default: return null;
  }
}
