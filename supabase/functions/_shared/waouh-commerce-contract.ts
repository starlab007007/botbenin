// WAOUH — Contrat d'action v3 (pur, testé).
//
// Requête unique pour toutes les surfaces (Web, Flutter, WhatsApp via
// waouh-channel-in) et réponse normalisée : étape, rôle, tour, message court,
// fiche, 1 à 3 boutons calculés par le serveur, suggestions prédictives.

import {
  articleEntryActionsV3,
  askQuestionAction,
  buyerPaymentActionsV3,
  cancelOrderAction,
  modifyOfferAction,
  negotiationActionsV3,
  paymentConfirmActionsV3,
  sellerAvailabilityActionsV3,
  followUpOfferAction,
  transmitOfferAction,
  watchOfferAction,
  withdrawOfferAction,
  type WaouhAction,
} from "./waouh-commands.ts";
import { clampActions, type JourneyStepKey, stageFor } from "./waouh-message-catalog.ts";

export const COMMERCE_ACTIONS = [
  "open_deal",
  "ask",
  "offer",
  "accept",
  "reject",
  "seller_confirm",
  "pay_mode",
  "courier_update",
  "confirm_payment",
  "cancel",
  "text",
  // Résultat Nexus externe : l'acheteur confirme l'envoi de son offre (politique de contact appliquée).
  "transmit_offer",
  // Avatar : garder l'offre en veille (sans envoi).
  "watch_offer",
] as const;
export type CommerceAction = typeof COMMERCE_ACTIONS[number];

export interface CommerceActionRequest {
  action: CommerceAction;
  idem: string;
  article_id?: string | null;
  /** Identité catalogue brute (waouh_unified_catalog.id), jamais un article. */
  catalog_id?: string | null;
  /** Identité source brute avant matérialisation en article. */
  source_id?: string | null;
  /** Identité Nexus (`external:<uuid>` | `article:<uuid>`) : le serveur la matérialise en article. */
  fabric_id?: string | null;
  thread_id?: string | null;
  negotiation_id?: string | null;
  deal_id?: string | null;
  amount?: number | null;
  method?: "cash" | "mobile_money" | null;
  text?: string | null;
  /** Confirmation explicite (tap) d'une action proposée depuis le texte libre. */
  confirmed?: boolean;
  source?: string | null;
  session_id?: string | null;
  /** transmit_offer : relance d'une offre déjà transmise (au plus une par 24 h). */
  follow_up?: boolean;
}

export type ValidationResult =
  | { ok: true; request: CommerceActionRequest }
  | { ok: false; error: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IDEM_RE = /^[A-Za-z0-9._:-]{8,120}$/;

const optUuid = (v: unknown): string | null | "invalid" => {
  if (v == null || v === "") return null;
  return typeof v === "string" && UUID_RE.test(v) ? v.toLowerCase() : "invalid";
};

const FABRIC_RE = /^(external|article):([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/** `external:<uuid>` | `article:<uuid>` normalisé, null si absent, "invalid" sinon (les demandes d'achat `buyer:` n'ouvrent pas de Deal Room acheteur). */
const optFabric = (v: unknown): string | null | "invalid" => {
  if (v == null || v === "") return null;
  const m = typeof v === "string" ? FABRIC_RE.exec(v.trim()) : null;
  return m ? `${m[1].toLowerCase()}:${m[2].toLowerCase()}` : "invalid";
};

/** Valide la requête (aucune donnée non attendue n'est conservée). */
export function validateActionRequest(body: unknown): ValidationResult {
  const b = (body && typeof body === "object") ? body as Record<string, unknown> : {};
  const action = String(b.action || "") as CommerceAction;
  if (!COMMERCE_ACTIONS.includes(action)) return { ok: false, error: "unknown_action" };
  const idem = String(b.idem || b.idempotency_key || "");
  if (!IDEM_RE.test(idem)) return { ok: false, error: "idem_required" };

  const ids: Record<string, string | null> = {};
  for (const key of ["article_id", "catalog_id", "source_id", "thread_id", "negotiation_id", "deal_id"]) {
    const v = optUuid(b[key]);
    if (v === "invalid") return { ok: false, error: `invalid_${key}` };
    ids[key] = v;
  }
  const fabric = optFabric(b.fabric_id);
  if (fabric === "invalid") return { ok: false, error: "invalid_fabric_id" };
  let amount: number | null = null;
  if (b.amount != null && b.amount !== "") {
    const n = Number(b.amount);
    if (!Number.isFinite(n) || n < 1 || n > 100_000_000) return { ok: false, error: "invalid_amount" };
    amount = Math.round(n);
  }
  const method = b.method === "cash" || b.method === "mobile_money" ? b.method : null;
  const text = typeof b.text === "string" ? b.text.trim().slice(0, 1000) : null;

  switch (action) {
    case "open_deal":
    case "ask":
      if (!ids.article_id && !ids.catalog_id && !ids.source_id && !ids.thread_id && !fabric) {
        return { ok: false, error: "article_id_required" };
      }
      if (action === "ask" && !text) return { ok: false, error: "text_required" };
      break;
    case "offer":
      if (!amount) return { ok: false, error: "amount_required" };
      if (!ids.negotiation_id && !ids.thread_id && !ids.article_id && !ids.catalog_id && !ids.source_id && !fabric) {
        return { ok: false, error: "context_required" };
      }
      break;
    case "transmit_offer":
    case "watch_offer":
      if (!ids.negotiation_id && !ids.thread_id) return { ok: false, error: "negotiation_id_required" };
      break;
    case "accept":
    case "reject":
      if (!ids.negotiation_id && !ids.thread_id) return { ok: false, error: "negotiation_id_required" };
      break;
    case "seller_confirm":
    case "cancel":
      if (!ids.deal_id) return { ok: false, error: "deal_id_required" };
      break;
    case "pay_mode":
    case "confirm_payment":
      if (!ids.deal_id) return { ok: false, error: "deal_id_required" };
      if (!method) return { ok: false, error: "method_required" };
      break;
    case "text":
      if (!text) return { ok: false, error: "text_required" };
      break;
    case "courier_update":
      break;
  }

  return {
    ok: true,
    request: {
      action,
      idem,
      article_id: ids.article_id,
      catalog_id: ids.catalog_id,
      source_id: ids.source_id,
      fabric_id: fabric,
      thread_id: ids.thread_id,
      negotiation_id: ids.negotiation_id,
      deal_id: ids.deal_id,
      amount,
      method,
      text,
      confirmed: b.confirmed === true,
      follow_up: b.follow_up === true,
      source: typeof b.source === "string" ? b.source.slice(0, 40) : null,
      session_id: typeof b.session_id === "string" ? b.session_id : (typeof b.sessionId === "string" ? b.sessionId : null),
    },
  };
}

export interface DealState {
  articleId: string | null;
  articlePrice: number | null;
  negotiationId: string | null;
  negotiationState: string | null;
  lastActor: string | null;
  lastOfferPrice: number | null;
  dealId: string | null;
  dealStatus: string | null;
  sellerConfirmed: boolean;
  paymentSelected: boolean;
  paymentMethod: "cash" | "mobile_money" | null;
  /** Article matérialisé depuis un résultat Nexus externe : le vendeur n'a pas de compte WAOUH. */
  externalSeller?: boolean;
  /** L'offre a déjà été transmise au tiers. */
  externalTransmitted?: boolean;
  /** Voie de contact résolue (politique C0–C5) : « watch » = pas d'envoi possible maintenant. */
  externalMode?: "send_on_tap" | "approval_relay" | "watch";
  /** L'avatar garde l'offre en veille. */
  externalWatching?: boolean;
  /** Une relance est due (l'avatar l'a notée ; envoi sur tap). */
  externalNudgeDue?: boolean;
}

export type Turn = "buyer" | "seller" | "courier" | "none";

/** À qui est-ce de jouer ? */
export function turnFor(state: DealState): Turn {
  const stage = stageFor({ negotiationState: state.negotiationState, dealStatus: state.dealStatus });
  switch (stage) {
    case "interest":
      return "buyer";
    case "negotiation": {
      const last = String(state.lastActor || "").toLowerCase();
      if (last === "buyer") return "seller";
      if (last === "seller") return "buyer";
      return "buyer"; // « system » : prix affiché, l'acheteur décide
    }
    case "agreement":
      if (!state.sellerConfirmed && !state.paymentSelected) return "none"; // les deux ont une action
      return state.sellerConfirmed ? "buyer" : "seller";
    case "preparation":
    case "courier":
      return "courier";
    case "delivery":
      return "buyer";
    default:
      return "none";
  }
}

/**
 * Boutons de la prochaine étape pour UN rôle (3 au plus, meilleure action en
 * premier). Aucun bouton quand ce n'est pas le tour de ce rôle.
 */
export function nextActions(
  state: DealState,
  role: "buyer" | "seller",
  opts: { acceptFirst?: boolean } = {},
): WaouhAction[] {
  const stage: JourneyStepKey = stageFor({ negotiationState: state.negotiationState, dealStatus: state.dealStatus });
  const turn = turnFor(state);
  switch (stage) {
    case "interest":
      return role === "buyer" && state.articleId ? clampActions(articleEntryActionsV3(state.articleId, state.articlePrice)) : [];
    case "negotiation":
      if (!state.negotiationId) return [];
      if (state.externalSeller) {
        // Aucun tour vendeur : l'acheteur envoie son offre au tiers quand il le décide, ou la modifie.
        if (role !== "buyer" || !state.articleId) return [];
        if (state.externalTransmitted) {
          return clampActions(state.externalNudgeDue
            ? [followUpOfferAction(state.negotiationId), modifyOfferAction(state.articleId)]
            : [modifyOfferAction(state.articleId)]);
        }
        // Jamais d'impasse : sans voie de contact, l'avatar garde l'offre en veille au lieu d'un bouton qui échouerait.
        return clampActions(state.externalMode === "watch"
          ? (state.externalWatching ? [modifyOfferAction(state.articleId)] : [watchOfferAction(state.negotiationId), modifyOfferAction(state.articleId)])
          : [transmitOfferAction(state.negotiationId), modifyOfferAction(state.articleId)]);
      }
      if (turn === role) {
        return clampActions(negotiationActionsV3(state.negotiationId, { amount: state.lastOfferPrice, acceptFirst: opts.acceptFirst }));
      }
      // En attente de l'autre partie : jamais de fenêtre froide.
      if (!state.articleId) return [];
      return clampActions(role === "buyer"
        ? [modifyOfferAction(state.articleId), askQuestionAction(state.articleId), ...(state.negotiationId ? [withdrawOfferAction(state.negotiationId)] : [])]
        : [askQuestionAction(state.articleId)]);
    case "agreement":
      if (!state.dealId) {
        // Accord tombé (commande annulée) : l'acheteur peut relancer tout de suite.
        return role === "buyer" && state.articleId
          ? clampActions(articleEntryActionsV3(state.articleId, state.articlePrice))
          : [];
      }
      if (role === "buyer" && !state.paymentSelected) return clampActions(buyerPaymentActionsV3(state.dealId));
      if (role === "seller" && !state.sellerConfirmed) return clampActions(sellerAvailabilityActionsV3(state.dealId));
      // Son action est faite : on attend l'autre, avec de quoi relancer ou annuler.
      return clampActions([
        ...(state.articleId ? [askQuestionAction(state.articleId)] : []),
        ...(role === "buyer" ? [cancelOrderAction(state.dealId)] : []),
      ]);
    case "preparation":
    case "courier":
      // Livreur en route : les deux parties peuvent encore échanger.
      return state.articleId ? clampActions([askQuestionAction(state.articleId)]) : [];
    case "delivery":
      if (role === "buyer" && state.dealId) return clampActions(paymentConfirmActionsV3(state.dealId, state.paymentMethod ?? "cash"));
      return state.articleId ? clampActions([askQuestionAction(state.articleId)]) : [];
    default:
      return [];
  }
}

/**
 * Les boutons sont calculés AVANT l'écriture de la réponse du tour : ils doivent déjà refléter l'action qui vient d'aboutir
 * (envoi, relance, mise en veille), sinon « Envoyer mon offre » réapparaîtrait juste après l'envoi.
 */
export function withExternalOutcome(state: DealState, key: string): DealState {
  if (!state.externalSeller) return state;
  if (key === "external_offer_sent") return { ...state, externalTransmitted: true, externalNudgeDue: false, externalWatching: false };
  if (key === "external_nudge_sent") return { ...state, externalNudgeDue: false };
  if (key === "avatar_watching") return { ...state, externalWatching: true, externalMode: "watch" };
  return state;
}

/** Libellé humain de l'action de l'utilisateur (bulle affichée dans le fil). */
export function actionEcho(req: CommerceActionRequest, fmt: (n: number) => string): string {
  switch (req.action) {
    case "open_deal": return req.amount ? `Je le veux à ${fmt(req.amount)}` : "Je le veux";
    case "offer": return `Je propose ${fmt(req.amount ?? 0)}`;
    case "accept": return "J'accepte l'offre";
    case "reject": return "Je refuse l'offre";
    case "seller_confirm": return "Article disponible";
    case "pay_mode": return req.method === "cash" ? "Paiement cash à la livraison" : "Paiement Mobile Money à la livraison";
    case "confirm_payment": return "Je confirme le paiement";
    case "cancel": return "J'annule";
    case "transmit_offer": return req.follow_up ? "Je relance le vendeur" : "J'envoie mon offre";
    case "watch_offer": return "Je garde l'offre en veille";
    case "ask":
    case "text": return String(req.text || "");
    default: return "";
  }
}
