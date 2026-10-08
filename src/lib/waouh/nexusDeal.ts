// WAOUH — Résultats Nexus externes → Deal Room (Web).
//
// Une carte Nexus sans article (`fabric_id = external:<uuid>`) ouvre directement la fenêtre de
// négociation : le serveur (waouh-commerce-action, drapeau nexus_direct_deal) matérialise l'article,
// ouvre la Deal Room de l'acheteur sans aucun message au tiers, puis l'acheteur envoie son offre
// d'un tap (« Envoyer mon offre », politique de contact C0–C5 appliquée côté serveur).
import { sendCommerceAction, type CommerceActionResponse } from "./commerceAction";

export const EXTERNAL_FABRIC_RE = /^external:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** La carte peut-elle entrer directement en Deal Room ? (offre externe, pas une demande d'achat). */
export function isDirectDealCandidate(fabricId: string | null | undefined, opts: { buyerRequest?: boolean } = {}): boolean {
  return !opts.buyerRequest && EXTERNAL_FABRIC_RE.test(String(fabricId || "").trim());
}

export type ExternalDealOutcome =
  | { status: "opened"; response: CommerceActionResponse }
  | { status: "refused"; response: CommerceActionResponse }
  | { status: "fallback" };

/** Ouvre (ou reprend) la Deal Room d'un résultat externe. `fallback` = drapeau coupé ou parcours v3 indisponible. */
export async function openExternalDeal(
  fabricId: string,
  amount: number | null,
  sessionId: string | null,
): Promise<ExternalDealOutcome> {
  let response: CommerceActionResponse | null;
  try {
    response = await sendCommerceAction(
      { action: "open_deal", fabric_id: fabricId, amount: amount && amount > 0 ? Math.round(amount) : null, source: "nexus_card" },
      sessionId,
    );
  } catch {
    // Annonce disparue (409) ou erreur technique : le serveur explique, on ne bascule pas sur la fiche de contact.
    return { status: "refused", response: technicalFailure() };
  }
  if (!response || response.code === "nexus_direct_deal_disabled") return { status: "fallback" };
  return response.ok && response.article_id ? { status: "opened", response } : { status: "refused", response };
}

function technicalFailure(): CommerceActionResponse {
  return {
    ok: false, thread_id: null, negotiation_id: null, deal_id: null, article_id: null,
    stage: "interest", role: "buyer", turn: "buyer", actions: [],
    reply: { title: "Action impossible", detail: "Rien n'a été envoyé. Réessayez.", text: "*Action impossible*\nRien n'a été envoyé. Réessayez.", key: "technical_error" },
  };
}

/** Détail de l'évènement `waouh:open-match-chat` pour la fenêtre de négociation de l'article matérialisé. */
export function openMatchDetail(response: CommerceActionResponse, card: { title: string; price: number | null; city: string | null; photo: string | null }) {
  return {
    article_id: response.article_id,
    thread_id: response.thread_id,
    negotiation_id: response.negotiation_id,
    deal_id: response.deal_id,
    counterpart_user_id: null,
    seller_user_id: null,
    kind: "buyer" as const,
    title: card.title || "Annonce",
    price: card.price,
    city: card.city,
    photo: card.photo,
    source: "nexus_direct_deal",
  };
}
