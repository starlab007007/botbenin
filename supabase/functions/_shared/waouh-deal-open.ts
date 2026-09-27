// deno-lint-ignore-file no-explicit-any -- client Supabase non typé, comme le reste des edge functions.
// WAOUH — Ouverture d'une discussion commerciale (Intérêt → Négociation).
//
// Avant : trois chemins d'entrée ouvraient (ou non) la négociation, chacun à
// sa manière — waouh-buyer-interest (bouton), waouh-webhook « intéressé N »
// (texte) et waouh-channel-in avec meta.article_id (qui ne créait RIEN et
// laissait le prix suivant tomber sur « Aucune négociation en cours »).
// Maintenant : une seule fonction, idempotente sur (article × acheteur), qui
// renvoie toujours thread_id + negotiation_id. waouh-buyer-interest l'appelle
// avec ses options historiques (comportement inchangé) ; waouh-channel-in et
// waouh-commerce-action l'appellent pour ouvrir la Deal Room en un aller-retour.

import { pushSyncedEvent } from "./waouh-sync.ts";
import { bindThreadState, resolveProductThread } from "./waouh-thread.ts";
import { negotiationActionsV3, sellerOfferDecisionActions, type WaouhAction } from "./waouh-commands.ts";
import { renderCatalog } from "./waouh-message-catalog.ts";

export interface OpenBuyerDealArgs {
  sb: any;
  articleId: string;
  buyerUserId: string;
  source: string;
  /** Offre initiale ; à défaut, le prix affiché de l'article. */
  offer?: number | null;
  supabaseUrl: string;
  serviceRole: string;
  /** Notification vendeur (dédupliquée par jour par waouh-notify-dispatch). */
  notifySeller?: "always" | "on_create" | "never";
  /** Bulle d'accusé côté acheteur (waouh-buyer-interest historique). */
  echoBuyer?: boolean;
  /** Refuser un article vendu / réservé au lieu d'ouvrir la discussion. */
  rejectUnavailable?: boolean;
  /** Textes du catalogue v3 (interrupteur chat_catalog_v3). */
  catalogV3?: boolean;
  correlationId?: string | null;
  /**
   * false : ouvre (ou retrouve) le fil sans créer d'offre — « Proposer un
   * prix » et « Poser une question » ne doivent pas envoyer le prix affiché
   * comme offre de l'acheteur. Une négociation déjà ouverte est reprise.
   */
  openNegotiation?: boolean;
}

export type OpenBuyerDealCode =
  | "article_not_found"
  | "self"
  | "article_unavailable"
  | "thread_failed"
  | "invalid_offer";

export interface OpenBuyerDealResult {
  ok: boolean;
  code?: OpenBuyerDealCode;
  threadId: string | null;
  negotiationId: string | null;
  /** true = négociation créée par cet appel ; false = reprise d'une existante. */
  created: boolean;
  duplicateInterest: boolean;
  offerPrice: number | null;
  negotiationState: string | null;
  lastActor: string | null;
  lastOfferPrice: number | null;
  sellerNotified: boolean;
  sellerUserId: string | null;
  article: Record<string, any> | null;
}

const ARTICLE_COLUMNS =
  "id,seller_id,title,description,category,condition,price,currency,photos,city,market_price_min,market_price_max,status";

const UNAVAILABLE_STATUSES = new Set(["sold", "reserved", "archived", "deleted"]);

function emptyResult(code: OpenBuyerDealCode, article: Record<string, any> | null = null): OpenBuyerDealResult {
  return {
    ok: false,
    code,
    threadId: null,
    negotiationId: null,
    created: false,
    duplicateInterest: false,
    offerPrice: null,
    negotiationState: null,
    lastActor: null,
    lastOfferPrice: null,
    sellerNotified: false,
    sellerUserId: article?.seller_id ?? null,
    article,
  };
}

/** Offre valide (> 0, finie) ou null. Pure — testée. */
export function normalizeOffer(raw: unknown): number | null | "invalid" {
  if (raw == null || raw === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return "invalid";
  return Math.round(value);
}

export function publicPhotos(article: Record<string, any> | null | undefined): string[] {
  return Array.isArray(article?.photos)
    ? article!.photos.filter((url: unknown) => typeof url === "string" && /^https?:\/\//i.test(url as string))
    : [];
}

export async function openBuyerDeal(args: OpenBuyerDealArgs): Promise<OpenBuyerDealResult> {
  const {
    sb,
    articleId,
    buyerUserId,
    source,
    supabaseUrl,
    serviceRole,
    notifySeller = "always",
    echoBuyer = false,
    rejectUnavailable = false,
    catalogV3 = false,
    correlationId = null,
    openNegotiation = true,
  } = args;

  const offerNorm = normalizeOffer(args.offer);
  if (offerNorm === "invalid") return emptyResult("invalid_offer");

  const { data: article } = await sb
    .from("waouh_articles")
    .select(ARTICLE_COLUMNS)
    .eq("id", articleId)
    .maybeSingle();
  if (!article) return emptyResult("article_not_found");

  if (article.seller_id && article.seller_id === buyerUserId) return emptyResult("self", article);
  if (rejectUnavailable && UNAVAILABLE_STATUSES.has(String(article.status || "").toLowerCase())) {
    return emptyResult("article_unavailable", article);
  }

  const initialOffer = offerNorm ?? (Number(article.price ?? 0) || null);

  const { data: buyerActor } = await sb.from("waouh_users")
    .select("id,auth_user_id,phone_number,web_session_id")
    .eq("id", buyerUserId)
    .single();

  let thread: any = null;
  try {
    thread = await resolveProductThread({
      sb,
      articleId,
      actorUser: buyerActor,
      role: "buyer",
      counterpartUserId: article.seller_id,
      buyerUserId,
      sellerUserId: article.seller_id,
      source,
    });
  } catch (error) {
    // Rôle incompatible = l'acteur est en réalité le vendeur (autre identité).
    const message = String((error as any)?.message || error);
    if (/incompatible/i.test(message)) return emptyResult("self", article);
    console.warn("[waouh-deal-open] thread", message);
  }
  if (!thread?.id) return emptyResult("thread_failed", article);
  const threadId: string = thread.id;

  // Intérêt (dédupliqué sur article × acheteur × thread).
  const { error: insErr } = await sb.from("waouh_interests").upsert({
    thread_id: threadId,
    article_id: articleId,
    buyer_user_id: buyerUserId,
    seller_user_id: article.seller_id ?? null,
    source,
    payload: { thread_id: threadId, source },
  }, { onConflict: "article_id,buyer_user_id,thread_id", ignoreDuplicates: true });
  const duplicateInterest = !!insErr &&
    ((insErr as any).code === "23505" || /duplicate/i.test((insErr as any).message || ""));
  if (insErr && !duplicateInterest) console.error("[waouh-deal-open] interest insert", insErr);

  // Négociation ouverte : reprise si elle existe, sinon création (dernier acteur
  // = acheteur : c'est au vendeur de répondre à l'offre initiale).
  let negotiationId: string | null = null;
  let created = false;
  let negotiationState: string | null = null;
  let lastActor: string | null = null;
  let lastOfferPrice: number | null = null;
  if (article.seller_id) {
    try {
      const { data: openNeg } = await sb
        .from("waouh_negotiations")
        .select("id, state, last_actor, last_offer_price")
        .eq("thread_id", threadId)
        .in("state", ["proposed", "countered"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (openNeg) {
        negotiationId = openNeg.id;
        negotiationState = openNeg.state ?? null;
        lastActor = openNeg.last_actor ?? null;
        lastOfferPrice = openNeg.last_offer_price == null ? null : Number(openNeg.last_offer_price);
      } else if (openNegotiation) {
        const { data: createdNeg, error: createdNegError } = await sb.from("waouh_negotiations").insert({
          thread_id: threadId,
          article_id: articleId,
          buyer_user_id: buyerUserId,
          seller_user_id: article.seller_id,
          state: "proposed",
          last_offer_price: initialOffer,
          last_actor: "buyer",
          meta: { opened_via: "buyer_interest", source, initial_offer_amount: initialOffer, correlation_id: correlationId },
        }).select("id").single();
        if (createdNegError) throw createdNegError;
        negotiationId = createdNeg?.id ?? null;
        created = !!negotiationId;
        negotiationState = "proposed";
        lastActor = "buyer";
        lastOfferPrice = initialOffer;
      }
    } catch (e) {
      console.warn("[waouh-deal-open] open negotiation failed", e);
    }
  }

  if (negotiationId || openNegotiation) {
    await bindThreadState(sb, threadId, { status: "negotiating", negotiation_id: negotiationId });
  }
  if (negotiationId && created) {
    try {
      await sb.rpc("waouh_record_commerce_event", {
        p_event_type: "buyer_interest_opened",
        p_entity_type: "negotiation",
        p_entity_id: negotiationId,
        p_thread_id: threadId,
        p_article_id: articleId,
        p_negotiation_id: negotiationId,
        p_actor_user_id: buyerUserId,
        p_actor_role: "buyer",
        p_previous_state: null,
        p_next_state: "proposed",
        p_payload: { source },
      });
    } catch (_) { /* registre best-effort */ }
  }

  const shownOffer = Number(lastOfferPrice ?? initialOffer ?? article.price ?? 0) || null;
  const title = article.title || "Annonce";
  // Textes historiques : montant demandé (comportement de waouh-buyer-interest).
  const legacyOffer = Number(initialOffer || article.price || 0);

  // Notification vendeur : boutons de décision pour le VENDEUR uniquement.
  let sellerNotified = false;
  const shouldNotify = (notifySeller === "always" && openNegotiation) || (notifySeller === "on_create" && created);
  if (shouldNotify && article.seller_id) {
    const decisionActions: WaouhAction[] = negotiationId
      ? (catalogV3
        ? negotiationActionsV3(negotiationId, { amount: shownOffer })
        : sellerOfferDecisionActions(negotiationId))
      : [];
    const extraText = catalogV3
      ? renderCatalog("new_buyer", { title, amount: shownOffer, price: Number(article.price || 0) || null }).text
      : `📩 Nouvel acheteur intéressé\n\n📦 ${title}\n💰 Offre proposée : ${legacyOffer.toLocaleString("fr-FR")} FCFA\n\nAcceptez le prix, faites une contre-offre ou refusez.`;
    try {
      await fetch(`${supabaseUrl}/functions/v1/waouh-notify-dispatch`, {
        method: "POST",
        headers: { Authorization: `Bearer ${serviceRole}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "new_buyer",
          article_id: articleId,
          thread_id: threadId,
          buyer_user_id: buyerUserId,
          seller_user_id: article.seller_id,
          counterpart_user_id: buyerUserId,
          recipient: "seller",
          negotiation_id: negotiationId,
          actions: decisionActions,
          extra_text: extraText,
        }),
      });
      sellerNotified = true;
    } catch (e) {
      console.warn("[waouh-deal-open] dispatch failed", e);
    }
  }

  // Écho acheteur (bulle + WhatsApp) — uniquement pour l'appel historique.
  if (echoBuyer && buyerActor) {
    try {
      const photos = publicPhotos(article);
      const actions: WaouhAction[] = [];
      const text = catalogV3
        ? renderCatalog("deal_opened", { title, amount: shownOffer }).text
        : `✅ Offre envoyée au vendeur\n\n📦 ${title}\n💰 ${legacyOffer.toLocaleString("fr-FR")} FCFA\n\nVotre Avatar suit la réponse et vous guidera jusqu’à l’accord.`;
      await pushSyncedEvent({
        sb,
        user: buyerActor,
        role: "buyer",
        articleId,
        negotiationId,
        threadId,
        buyerUserId,
        sellerUserId: article.seller_id,
        counterpartUserId: article.seller_id,
        text,
        intent: "buyer_interest",
        eventType: "buyer_interest",
        template: "buyer_interest_ack",
        dedupSuffix: "actor",
        attachments: photos.slice(0, 6).map((url: string, index: number) => ({
          url,
          type: "image/jpeg",
          caption: `${title} — photo ${index + 1}/${photos.length}`,
        })),
        imageUrl: photos[0] ?? null,
        payloadExtra: {
          source,
          workflow_state: "proposed",
          initial_offer_amount: catalogV3 ? shownOffer : initialOffer,
          negotiation_id: negotiationId,
          actions,
          products: [dealProductCard({ article, threadId, negotiationId, buyerUserId, role: "buyer", actions })],
        },
      });
    } catch (e) {
      console.warn("[waouh-deal-open] buyer echo failed", e);
    }
  }

  return {
    ok: true,
    threadId,
    negotiationId,
    created,
    duplicateInterest,
    offerPrice: shownOffer,
    negotiationState,
    lastActor,
    lastOfferPrice,
    sellerNotified,
    sellerUserId: article.seller_id ?? null,
    article,
  };
}

/** Fiche produit rattachée au thread (même forme que waouh-buyer-interest). */
export function dealProductCard(input: {
  article: Record<string, any>;
  threadId: string | null;
  negotiationId: string | null;
  buyerUserId: string | null;
  role: "buyer" | "seller";
  actions?: WaouhAction[];
  workflowState?: string;
  price?: number | null;
}) {
  const { article, threadId, negotiationId, buyerUserId, role, actions = [], workflowState = "negotiating" } = input;
  return {
    id: article.id,
    article_id: article.id,
    title: article.title || "Article WAOUH",
    description: article.description,
    category: article.category,
    condition: article.condition,
    price: Number(input.price ?? article.price ?? 0),
    currency: article.currency || "XOF",
    photos: publicPhotos(article),
    city: article.city,
    market_price_min: article.market_price_min,
    market_price_max: article.market_price_max,
    availability: article.status === "sold" ? "Vendu" : "Disponible",
    workflow_state: workflowState,
    role,
    thread_id: threadId,
    buyer_user_id: buyerUserId,
    seller_user_id: article.seller_id,
    negotiation_id: negotiationId,
    actions,
  };
}