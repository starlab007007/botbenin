// deno-lint-ignore-file no-explicit-any -- client Supabase non typé, comme le reste des edge functions.
// WAOUH — Point d'entrée unique des actions commerce (parcours v3, Lot 2).
//
// Une requête = une action (open_deal, ask, offer, accept, reject,
// seller_confirm, pay_mode, confirm_payment, cancel, text). Le serveur :
//   1. authentifie l'acteur (JWT ou session invitée signée) ;
//   2. rejoue la réponse si la clé `idem` a déjà été traitée ;
//   3. exécute via les moteurs existants (waouh-deal-open, routeur de
//      négociation, waouh-deal-ops) — aucune règle métier dupliquée ;
//   4. renvoie étape, rôle, tour, message court du catalogue, fiche,
//      1 à 3 boutons calculés et suggestions prédictives.
// Interrupteur : commerce_action_v3 (coupé => 503, le client garde l'ancien chemin).

import { createClient } from "npm:@supabase/supabase-js@2";
import { jsonResponse, requireAuthOrGuestSession, waouhCorsHeaders } from "../_shared/waouh-auth.ts";
import { commerceActionV3Enabled, chatWriterV2Enabled, recordChatMessage } from "../_shared/waouh-chat-writer.ts";
import { resolveSiblingUserIds } from "../_shared/waouh-identity.ts";
import { openBuyerDeal, publicPhotos } from "../_shared/waouh-deal-open.ts";
import { renderCatalog, type CatalogKey, fcfa, stageFor } from "../_shared/waouh-message-catalog.ts";
import {
  actionEcho,
  type CommerceActionRequest,
  type DealState,
  nextActions,
  turnFor,
  validateActionRequest,
} from "../_shared/waouh-commerce-contract.ts";
import { classifyFreeText } from "../_shared/waouh-free-text.ts";
import {
  acceptFirst,
  followUpPlan,
  medianResponseMinutes,
  preselectPayment,
  responseSamples,
  suggestPrice,
} from "../_shared/waouh-predictive.ts";
import { geminiJson } from "../_shared/gemini.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Role = "buyer" | "seller";

interface Ctx {
  sb: any;
  actorId: string;
  siblings: string[];
  req: CommerceActionRequest;
}

interface EngineOutcome {
  ok: boolean;
  key: CatalogKey;
  vars?: Record<string, unknown>;
  threadId?: string | null;
  negotiationId?: string | null;
  dealId?: string | null;
  articleId?: string | null;
  /** Le moteur a déjà écrit la réponse dans le fil (waouh-deal-ops). */
  engineWroteReply?: boolean;
  pending?: Partial<CommerceActionRequest> | null;
  engineIntent?: string | null;
  httpStatus?: number;
}

async function callInternal(fn: string, body: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok && data?.ok !== false && !data?.error, data: data ?? {} };
}

async function loadThread(sb: any, threadId: string | null | undefined) {
  if (!threadId) return null;
  const { data } = await sb.from("waouh_chat_threads")
    .select("id,article_id,buyer_user_id,seller_user_id,negotiation_id,deal_id,status")
    .eq("id", threadId).eq("thread_type", "product_meet").maybeSingle();
  return data ?? null;
}

async function resolveThreadId(ctx: Ctx): Promise<string | null> {
  const { sb, req } = ctx;
  if (req.thread_id) return req.thread_id;
  if (req.negotiation_id) {
    const { data } = await sb.from("waouh_negotiations").select("thread_id").eq("id", req.negotiation_id).maybeSingle();
    if (data?.thread_id) return data.thread_id;
  }
  if (req.deal_id) {
    const { data } = await sb.from("waouh_deals").select("thread_id").eq("id", req.deal_id).maybeSingle();
    if (data?.thread_id) return data.thread_id;
  }
  if (req.article_id) {
    const { data } = await sb.from("waouh_chat_threads")
      .select("id")
      .eq("thread_type", "product_meet")
      .eq("article_id", req.article_id)
      .or(`buyer_user_id.in.(${ctx.siblings.join(",")}),seller_user_id.in.(${ctx.siblings.join(",")})`)
      .not("status", "in", "(concluded,cancelled)")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.id) return data.id;
  }
  return null;
}

async function loadState(sb: any, thread: any): Promise<{ state: DealState; neg: any; deal: any; article: any }> {
  const [{ data: neg }, { data: deal }, { data: article }] = await Promise.all([
    sb.from("waouh_negotiations").select("*").eq("thread_id", thread.id)
      .order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    sb.from("waouh_deals").select("*").eq("thread_id", thread.id).neq("status", "cancelled")
      .order("created_at", { ascending: false }).limit(1).maybeSingle(),
    sb.from("waouh_articles")
      .select("id,seller_id,title,price,currency,photos,city,market_price_min,market_price_max,status")
      .eq("id", thread.article_id).maybeSingle(),
  ]);
  const state: DealState = {
    articleId: thread.article_id ?? null,
    articlePrice: article?.price != null ? Number(article.price) : null,
    negotiationId: neg && ["proposed", "countered", "accepted"].includes(neg.state) ? neg.id : null,
    negotiationState: neg?.state ?? null,
    lastActor: neg?.last_actor ?? null,
    lastOfferPrice: neg?.last_offer_price != null ? Number(neg.last_offer_price) : null,
    dealId: deal?.id ?? null,
    dealStatus: deal?.status ?? null,
    sellerConfirmed: !!deal?.seller_confirmed_at,
    paymentSelected: !!deal?.buyer_payment_selected_at,
    paymentMethod: deal?.payment_method === "mobile_money" ? "mobile_money" : deal?.payment_method === "cash" ? "cash" : null,
  };
  return { state, neg, deal, article };
}

function roleIn(thread: any, siblings: string[]): Role | null {
  const buyer = siblings.includes(thread?.buyer_user_id);
  const seller = siblings.includes(thread?.seller_user_id);
  if (buyer === seller) return null;
  return buyer ? "buyer" : "seller";
}

async function writeBubble(sb: any, input: {
  threadId: string; userId: string; direction: "in" | "out"; text: string; articleId: string | null;
  intent: string; actions?: unknown[]; extra?: Record<string, unknown>; channel: string;
}) {
  if (await chatWriterV2Enabled(sb)) {
    const w = await recordChatMessage({
      sb,
      threadId: input.threadId,
      senderUserId: input.direction === "in" ? input.userId : null,
      recipientUserId: input.direction === "out" ? input.userId : null,
      direction: input.direction,
      text: input.text,
      channel: input.channel,
      intent: input.intent,
      actions: (input.actions ?? []) as any,
      mirrorToOtherParty: false,
      payloadExtra: input.extra ?? {},
      enqueueWhatsapp: false,
    });
    if (w.ok) return;
  }
  await sb.from("waouh_messages").insert({
    thread_id: input.threadId,
    user_id: input.userId,
    channel: input.channel,
    direction: input.direction,
    text: input.text,
    article_id: input.articleId,
    meta: { intent: input.intent, thread_id: input.threadId, article_id: input.articleId, actions: input.actions ?? [], ...(input.extra ?? {}) },
  });
}

// ---------------------------------------------------------------------------
// Exécution d'une action via les moteurs existants.
// ---------------------------------------------------------------------------
async function execute(ctx: Ctx, thread: any, role: Role | null): Promise<EngineOutcome> {
  const { sb, req, actorId } = ctx;
  const actorOnThread = thread
    ? (role === "buyer" ? thread.buyer_user_id : role === "seller" ? thread.seller_user_id : actorId)
    : actorId;

  const router = async (payload: { text: string; button_payload?: string | null }, negotiationId: string, threadId: string) => {
    const r = await callInternal("waouh-negotiation-router", {
      text: payload.text,
      button_payload: payload.button_payload ?? null,
      user_id: actorOnThread,
      thread_id: threadId,
      negotiation_id: negotiationId,
    });
    return r;
  };

  const mapRouter = (r: { status: number; ok: boolean; data: any }, fallback: CatalogKey, vars: Record<string, unknown> = {}): EngineOutcome => {
    const intent = String(r.data?.intent || r.data?.code || r.data?.error || "");
    if (r.status === 503 || intent === "negotiation_paused") {
      return { ok: false, key: "negotiation_paused", vars: { reason: r.data?.message }, engineIntent: intent, httpStatus: 200 };
    }
    if (intent === "article_unavailable") return { ok: false, key: "article_reserved", engineIntent: intent };
    if (intent === "negotiation_awaiting_counterparty") return { ok: true, key: "awaiting_counterparty", vars, engineIntent: intent };
    if (intent === "no_open_negotiation") return { ok: false, key: "stale_button", engineIntent: intent };
    if (!r.ok && r.status >= 500) return { ok: false, key: "technical_error", engineIntent: intent };
    if (!r.ok) return { ok: false, key: "out_of_stage", vars: { reason: r.data?.reply }, engineIntent: intent };
    return {
      ok: true, key: fallback, vars, engineIntent: intent,
      threadId: r.data?.thread_id ?? null, negotiationId: r.data?.negotiation_id ?? null, dealId: r.data?.deal_id ?? null,
    };
  };

  switch (req.action) {
    case "open_deal":
    case "offer": {
      // Pas de négociation ouverte sur ce fil : l'offre ouvre la discussion.
      const openNegId: string | null = thread?.negotiation_id
        ? (await sb.from("waouh_negotiations").select("id,state").eq("id", thread.negotiation_id)
          .in("state", ["proposed", "countered"]).maybeSingle()).data?.id ?? null
        : null;
      if (openNegId && req.action === "offer" && thread) {
        return mapRouter(await router({ text: `je propose ${req.amount}` }, openNegId, thread.id), "offer_sent", { amount: req.amount, role });
      }
      const articleId = req.article_id ?? thread?.article_id;
      if (!articleId) return { ok: false, key: "no_open_deal" };
      if (role === "seller") return { ok: false, key: "out_of_stage", vars: { reason: "Le vendeur répond depuis l'offre reçue." } };
      const opened = await openBuyerDeal({
        sb, articleId, buyerUserId: thread?.buyer_user_id ?? actorId, source: req.source || "commerce_action",
        offer: req.amount, supabaseUrl: SUPABASE_URL, serviceRole: SERVICE_ROLE,
        notifySeller: "on_create", rejectUnavailable: true, catalogV3: true, correlationId: req.idem,
      });
      if (!opened.ok) {
        const key: CatalogKey = opened.code === "self" ? "self_article"
          : opened.code === "article_unavailable" ? "article_reserved"
          : opened.code === "invalid_offer" ? "out_of_stage"
          : "technical_error";
        return { ok: false, key, articleId };
      }
      if (!opened.created && req.amount && opened.negotiationId && opened.threadId &&
          Number(opened.lastOfferPrice) !== req.amount) {
        const routed = mapRouter(
          await router({ text: `je propose ${req.amount}` }, opened.negotiationId, opened.threadId),
          "offer_sent", { amount: req.amount, role: "buyer" },
        );
        return { ...routed, threadId: opened.threadId, negotiationId: opened.negotiationId, articleId };
      }
      const buyerWaits = String(opened.lastActor || "") === "buyer";
      return {
        ok: true,
        key: opened.created ? "deal_opened" : buyerWaits ? "awaiting_counterparty" : "deal_already_open",
        vars: { title: opened.article?.title, amount: opened.offerPrice, role: "buyer" },
        threadId: opened.threadId, negotiationId: opened.negotiationId, articleId,
      };
    }

    case "ask": {
      let threadId: string | null = thread?.id ?? null;
      let counterpart: string | null = thread ? (role === "seller" ? thread.buyer_user_id : thread.seller_user_id) : null;
      const articleId = req.article_id ?? thread?.article_id ?? null;
      if (!threadId && articleId) {
        const opened = await openBuyerDeal({
          sb, articleId, buyerUserId: actorId, source: "commerce_action_question",
          supabaseUrl: SUPABASE_URL, serviceRole: SERVICE_ROLE, notifySeller: "never",
          openNegotiation: false, catalogV3: true,
        });
        if (!opened.ok) return { ok: false, key: opened.code === "self" ? "self_article" : "technical_error", articleId };
        threadId = opened.threadId;
        counterpart = opened.sellerUserId;
      }
      if (!threadId || !counterpart) return { ok: false, key: "technical_error" };
      const received = renderCatalog("question_received", { question: req.text });
      const relayText = `*${received.title}*\n${String(req.text).slice(0, 500)}`;
      let relayed = false;
      if (await chatWriterV2Enabled(sb)) {
        const w = await recordChatMessage({
          sb, threadId, recipientUserId: counterpart, text: relayText, intent: "participant_question",
          payloadExtra: { question: req.text, from_user_id: actorOnThread }, enqueueWhatsapp: true,
        });
        relayed = w.ok;
      }
      if (!relayed) {
        await sb.from("waouh_messages").insert({
          thread_id: threadId, user_id: counterpart, channel: "system", direction: "out", text: relayText,
          article_id: articleId, meta: { intent: "participant_question", thread_id: threadId, article_id: articleId, counterpart_user_id: actorOnThread, actions: [] },
        });
      }
      return { ok: true, key: "question_sent", vars: { role: role ?? "buyer" }, threadId, articleId };
    }

    case "accept":
    case "reject": {
      if (!thread) return { ok: false, key: "no_open_deal" };
      const negId = req.negotiation_id ?? thread.negotiation_id;
      if (!negId) return { ok: false, key: "stale_button" };
      const payload = `${req.action === "accept" ? "accepter" : "refuser"}:${negId}`;
      return mapRouter(
        await router({ text: req.action === "accept" ? "OUI" : "NON", button_payload: payload }, negId, thread.id),
        req.action === "accept" ? "agreement" : "offer_refused_actor",
        { role },
      );
    }

    case "seller_confirm":
    case "pay_mode":
    case "confirm_payment":
    case "cancel": {
      const map = { seller_confirm: "seller_confirm", pay_mode: "payment_preference", confirm_payment: "payment", cancel: "cancel" } as const;
      const r = await callInternal("waouh-deal-ops", {
        action: map[req.action],
        deal_id: req.deal_id,
        method: req.method ?? undefined,
        actor_user_id: actorOnThread,
      });
      const intent = String(r.data?.error || r.data?.intent || "");
      if (r.status === 503) return { ok: false, key: "negotiation_paused", vars: { reason: r.data?.message }, engineIntent: intent };
      if (r.status === 403) return { ok: false, key: "out_of_stage", vars: { reason: "Cette action revient à l'autre partie." }, engineIntent: intent };
      if (r.status === 409) return { ok: false, key: "out_of_stage", engineIntent: intent };
      if (!r.ok) return { ok: false, key: "technical_error", engineIntent: intent };
      const key: CatalogKey = req.action === "seller_confirm" ? "seller_confirmed"
        : req.action === "pay_mode" ? "pay_mode_chosen"
        : req.action === "confirm_payment" ? "payment_confirmed"
        : "deal_cancelled";
      return { ok: true, key, vars: { method: req.method }, engineWroteReply: true, dealId: req.deal_id, threadId: r.data?.thread_id ?? thread?.id ?? null };
    }

    case "courier_update":
      return { ok: false, key: "out_of_stage", vars: { reason: "Réservé au livreur WAOUH." } };

    case "text":
    default:
      return { ok: false, key: "not_understood" };
  }
}

// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: waouhCorsHeaders });
  if (req.method !== "POST") return jsonResponse({ ok: false, code: "method_not_allowed" }, 405);

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
  let idemKey: string | null = null;
  try {
    if (!(await commerceActionV3Enabled(sb))) {
      // Le client garde son chemin historique (waouh-channel-in-secure).
      return jsonResponse({ ok: false, code: "commerce_action_disabled", fallback: "channel" }, 503);
    }
    const body = await req.json().catch(() => ({}));
    const validation = validateActionRequest(body);
    if (!validation.ok) return jsonResponse({ ok: false, code: validation.error }, 400);
    let request = validation.request;

    // Acteur : service role (relais interne) ou JWT / session invitée signée.
    const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
    let actorId: string | null = null;
    if (bearer && bearer === SERVICE_ROLE) {
      actorId = typeof body?.actor_user_id === "string" ? body.actor_user_id : null;
    } else {
      // Session invitée : l'identifiant du corps DOIT égaler l'en-tête signé.
      const auth = await requireAuthOrGuestSession(req, request.session_id);
      if (!auth.ok) return auth.response;
      if (auth.authUser?.id) {
        const { data } = await sb.from("waouh_users").select("id").eq("auth_user_id", auth.authUser.id).limit(1).maybeSingle();
        actorId = data?.id ?? null;
      }
      if (!actorId && auth.headerSessionId && auth.sessionValid) {
        const { data } = await sb.from("waouh_users").select("id").eq("web_session_id", auth.headerSessionId).limit(1).maybeSingle();
        actorId = data?.id ?? null;
      }
    }
    if (!actorId) return jsonResponse({ ok: false, code: "actor_not_linked" }, 403);

    // Idempotence : une clé = une exécution.
    idemKey = request.idem;
    const { error: lockError } = await sb.from("waouh_commerce_actions").insert({
      idem: request.idem, actor_user_id: actorId, action: request.action, status: "processing",
    });
    const duplicateKey = !!lockError &&
      ((lockError as any).code === "23505" || /duplicate/i.test(String((lockError as any).message || "")));
    if (lockError && !duplicateKey) {
      // Journal indisponible (ex. migration non appliquée) : on exécute sans
      // rejeu plutôt que de bloquer l'utilisateur.
      console.warn("[waouh-commerce-action] idempotence indisponible", lockError);
      idemKey = null;
    } else if (lockError) {
      const { data: prior } = await sb.from("waouh_commerce_actions")
        .select("actor_user_id,status,response").eq("idem", request.idem).maybeSingle();
      idemKey = null; // ne jamais libérer la clé d'une autre exécution
      if (!prior || prior.actor_user_id !== actorId) return jsonResponse({ ok: false, code: "idem_conflict" }, 409);
      if (prior.status === "done" && prior.response) return jsonResponse({ ...prior.response, replayed: true });
      return jsonResponse({ ok: false, code: "in_progress", retry_after_ms: 800 }, 409);
    }

    const { data: actorRow } = await sb.from("waouh_users")
      .select("id,auth_user_id,phone_number,web_session_id").eq("id", actorId).maybeSingle();
    const siblings = await resolveSiblingUserIds(sb, actorRow ?? { id: actorId });
    const ctx: Ctx = { sb, actorId, siblings, req: request };

    let thread = await loadThread(sb, await resolveThreadId(ctx));
    let role: Role | null = thread ? roleIn(thread, siblings) : (request.article_id ? "buyer" : null);
    if (thread && !role) return finish(jsonResponse({ ok: false, code: "not_a_participant" }, 403), "failed");

    // Texte libre strict : règles → contexte → modèle contraint.
    // Action proposée depuis le texte libre, à renvoyer avec confirmed:true
    // (et une nouvelle clé idem) quand l'utilisateur touche « Confirmer ».
    let pending: Partial<CommerceActionRequest> | null = null;
    let freeTextKey: CatalogKey | null = null;
    if (request.action === "text") {
      const current = thread ? (await loadState(sb, thread)).state : null;
      const stage = current ? stageFor({ negotiationState: current.negotiationState, dealStatus: current.dealStatus }) : "interest";
      const verdict = await classifyFreeText(String(request.text), { stage, role: role ?? "buyer", currentOffer: current?.lastOfferPrice ?? null },
        (system, user) => geminiJson(system, user, { action: "none", confidence: 0 }));
      const mapped: Partial<CommerceActionRequest> | null =
        verdict.action === "none" || verdict.action === "counter_prompt" ? null
          : {
            action: verdict.action === "open_deal" ? "open_deal" : verdict.action,
            amount: verdict.amount ?? null,
            method: verdict.method ?? null,
            text: verdict.question ?? request.text,
            article_id: verdict.articleId ?? request.article_id ?? current?.articleId ?? null,
            negotiation_id: current?.negotiationId ?? null,
            deal_id: current?.dealId ?? null,
          } as Partial<CommerceActionRequest>;
      if (verdict.action === "counter_prompt") freeTextKey = "counter_prompt";
      else if (!mapped || (!verdict.execute && !verdict.needsConfirm)) freeTextKey = "not_understood";
      else if (verdict.needsConfirm && !request.confirmed) {
        pending = { ...mapped, confirmed: true };
        freeTextKey = "confirm_money_action";
      } else {
        request = { ...request, ...mapped } as CommerceActionRequest;
        ctx.req = request;
        if (!thread) {
          thread = await loadThread(sb, await resolveThreadId(ctx));
          role = thread ? roleIn(thread, siblings) : "buyer";
        }
      }
    }

    // Écho de l'utilisateur dans le fil (sa bulle), avant la réponse.
    let outcome: EngineOutcome;
    if (freeTextKey) {
      outcome = { ok: true, key: freeTextKey, pending, threadId: thread?.id ?? null, vars: {} };
    } else {
      outcome = await execute(ctx, thread, role);
    }

    const threadId = outcome.threadId ?? thread?.id ?? null;
    const finalThread = threadId ? (thread?.id === threadId ? thread : await loadThread(sb, threadId)) : null;
    const finalRole: Role = (finalThread ? roleIn(finalThread, siblings) : role) ?? "buyer";
    const loaded = finalThread ? await loadState(sb, finalThread) : null;
    const state = loaded?.state ?? null;
    const stage = state ? stageFor({ negotiationState: state.negotiationState, dealStatus: state.dealStatus }) : "interest";

    // Prédictif (null quand les données manquent — rien n'est inventé).
    let responseMinutes: number | null = null;
    if (finalThread) {
      const { data: msgs } = await sb.from("waouh_messages")
        .select("created_at,user_id,direction")
        .eq("thread_id", finalThread.id).eq("direction", "in")
        .order("created_at", { ascending: false }).limit(200);
      const events = (msgs || []).map((m: any) => ({
        at: m.created_at,
        role: (m.user_id === finalThread.buyer_user_id ? "buyer" : "seller") as Role,
      }));
      responseMinutes = medianResponseMinutes(responseSamples(events, finalRole === "buyer" ? "seller" : "buyer"));
    }
    const buyerOffer = state?.lastActor === "buyer" ? state.lastOfferPrice : null;
    const sellerOffer = state?.lastActor === "seller" ? state.lastOfferPrice : null;
    const suggested = suggestPrice({
      buyerOffer, sellerOffer, listPrice: state?.articlePrice ?? loaded?.article?.price ?? null,
      marketMin: loaded?.article?.market_price_min, marketMax: loaded?.article?.market_price_max,
    });
    const ownLast = finalRole === "buyer" ? buyerOffer : sellerOffer;
    const actions = state
      ? nextActions(state, finalRole, { acceptFirst: acceptFirst(state.lastOfferPrice, ownLast) })
      : [];
    let paymentPreselect: string | null = null;
    if (stage === "agreement" && finalRole === "buyer" && finalThread) {
      const { data: history } = await sb.from("waouh_deals").select("payment_method")
        .eq("buyer_user_id", finalThread.buyer_user_id).not("payment_method", "is", null)
        .order("created_at", { ascending: false }).limit(10);
      paymentPreselect = preselectPayment((history || []).map((h: any) => h.payment_method));
    }
    const plan = loaded?.neg?.updated_at && turnFor(state!) !== finalRole ? followUpPlan(loaded.neg.updated_at) : null;

    const message = renderCatalog(outcome.key, {
      title: loaded?.article?.title,
      amount: (outcome.vars?.amount as number | undefined) ?? state?.lastOfferPrice ?? null,
      role: finalRole,
      suggested,
      responseMinutes,
      method: (outcome.vars?.method as any) ?? request.method ?? null,
      reason: (outcome.vars?.reason as string | undefined) ?? null,
      label: pending ? actionEcho(pending as CommerceActionRequest, fcfa) : null,
    });
    const responseActions = pending
      ? [{ id: "confirm", label: "Confirmer" }, { id: "dismiss", label: "Modifier" }]
      : actions;

    // Bulles du fil : écho de l'acteur puis réponse courte (sauf si le moteur
    // l'a déjà écrite, cas de waouh-deal-ops).
    if (finalThread) {
      const actorOnThread = finalRole === "buyer" ? finalThread.buyer_user_id : finalThread.seller_user_id;
      const echo = actionEcho(request, fcfa);
      // Une offre libre en attente de confirmation est tout de même une vraie
      // bulle utilisateur. On l'écrit sans exécuter la mutation de prix.
      if (echo && (!freeTextKey || pending)) {
        await writeBubble(sb, { threadId: finalThread.id, userId: actorOnThread, direction: "in", text: echo,
          articleId: finalThread.article_id, intent: pending ? "offer_confirmation_requested" : `action_${request.action}`, channel: "web",
          extra: { idem: request.idem, source: request.source, pending: pending ?? null } });
      }
      if (!outcome.engineWroteReply) {
        await writeBubble(sb, { threadId: finalThread.id, userId: actorOnThread, direction: "out", text: message.text,
          articleId: finalThread.article_id, intent: `commerce_${outcome.key}`, actions: responseActions, channel: "web",
          extra: {
            stage,
            workflow_state: state?.dealStatus ?? state?.negotiationState ?? null,
            negotiation_id: state?.negotiationId,
            deal_id: state?.dealId,
            pending: pending ?? null,
          } });
      }
    }

    const photos = publicPhotos(loaded?.article);
    const payload = {
      ok: outcome.ok,
      schema: "waouh.commerce_action.v3",
      idem: request.idem,
      action: request.action,
      thread_id: finalThread?.id ?? null,
      negotiation_id: state?.negotiationId ?? outcome.negotiationId ?? null,
      deal_id: state?.dealId ?? outcome.dealId ?? null,
      article_id: finalThread?.article_id ?? outcome.articleId ?? request.article_id ?? null,
      stage,
      role: finalRole,
      turn: state ? turnFor(state) : "buyer",
      reply: { title: message.title, detail: message.detail, text: message.text, key: message.key },
      card: loaded?.article
        ? {
          article_id: loaded.article.id,
          title: loaded.article.title,
          price: loaded.article.price != null ? Number(loaded.article.price) : null,
          current_offer: state?.lastOfferPrice ?? null,
          photo: photos[0] ?? null,
          city: loaded.article.city ?? null,
        }
        : null,
      actions: responseActions,
      pending,
      suggest: {
        price: suggested,
        best_action: responseActions[0]?.id ?? null,
        response_minutes: responseMinutes,
        next_follow_up_at: plan?.nextFollowUpAt ?? null,
        expires_at: plan?.expiresAt ?? null,
        payment_method: paymentPreselect,
      },
      replayed: false,
    };
    // Erreur technique : la clé est libérée pour qu'un « Réessayer » réexécute.
    return finish(jsonResponse(payload), outcome.key === "technical_error" ? "failed" : "done", payload, finalThread?.id ?? null);
  } catch (error) {
    console.error("[waouh-commerce-action]", error);
    const m = renderCatalog("technical_error");
    return finish(jsonResponse({
      ok: false, code: "technical_error",
      reply: { title: m.title, detail: m.detail, text: m.text, key: m.key },
      actions: [], retry: true,
    }, 500), "failed");
  }

  async function finish(response: Response, status: "done" | "failed", payload?: unknown, threadId?: string | null) {
    if (!idemKey) return response;
    try {
      if (status === "done") {
        await sb.from("waouh_commerce_actions").update({
          status, response: payload ?? null, thread_id: threadId ?? null, updated_at: new Date().toISOString(),
        }).eq("idem", idemKey);
      } else {
        // Échec : la clé est libérée, un « Réessayer » avec la même clé repart.
        await sb.from("waouh_commerce_actions").delete().eq("idem", idemKey);
      }
    } catch (_) { /* journal best-effort */ }
    return response;
  }
});
