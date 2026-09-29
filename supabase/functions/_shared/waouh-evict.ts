// deno-lint-ignore-file no-explicit-any -- client Supabase non typé, comme le reste des edge functions.
// WAOUH — Acheteurs évincés : clôture des négociations concurrentes et reprise.
//
// Quand le vendeur conclut avec UN acheteur, les autres acheteurs de l'article
// restaient en attente indéfiniment (négociation ouverte, aucun message, boutons
// « Accepter » du vendeur périmés). Ce module :
//   - closeCompetingNegotiations : ferme leurs négociations, les prévient dans leur
//     fil (« Article réservé… vous serez prévenu s'il revient ») et retire les
//     boutons périmés de ces fils ;
//   - notifyArticleReopened : si l'accord tombe (annulation) et que l'article
//     redevient disponible, les prévient avec des boutons d'action.
// Testé par waouh-evict-test.ts.

import { articleEntryActionsV3 } from "./waouh-commands.ts";
import { type CatalogKey, isUnavailableStatus, renderCatalog, unavailableKey } from "./waouh-message-catalog.ts";
import { chatWriterV2Enabled, recordChatMessage } from "./waouh-chat-writer.ts";

/**
 * Une action arrive sur une négociation déjà fermée parce qu'un autre acheteur a été retenu :
 * la bonne réponse est « article réservé/vendu » (ou « bouton périmé » si l'article est revenu),
 * jamais « Action indisponible ». Pure — testée.
 */
export function evictedNegotiationKey(
  negotiation: { state?: string | null; meta?: Record<string, unknown> | null } | null | undefined,
  articleStatus: unknown,
): CatalogKey | null {
  if (!negotiation || negotiation.state !== "closed" || negotiation.meta?.closed_reason !== "article_reserved") return null;
  return isUnavailableStatus(articleStatus) ? unavailableKey(articleStatus) : "stale_button";
}

export interface EvictMessage {
  threadId: string;
  userId: string;
  articleId: string | null;
  text: string;
  intent: string;
  actions: Array<{ id: string; label: string }>;
  dedupeKey: string;
  payloadExtra: Record<string, unknown>;
}

export type EvictWriter = (message: EvictMessage) => Promise<void>;

/** Écriture par défaut : écrivain canonique si actif, sinon insertion directe dans le fil. */
export function defaultEvictWriter(sb: any): EvictWriter {
  return async (m) => {
    if (await chatWriterV2Enabled(sb)) {
      const written = await recordChatMessage({
        sb, threadId: m.threadId, recipientUserId: m.userId, text: m.text, intent: m.intent,
        actions: m.actions, payloadExtra: m.payloadExtra, dedupeKey: m.dedupeKey, enqueueWhatsapp: true,
      });
      if (written.ok) return;
    }
    await sb.from("waouh_messages").insert({
      thread_id: m.threadId, user_id: m.userId, channel: "system", direction: "out", text: m.text,
      article_id: m.articleId,
      meta: { intent: m.intent, thread_id: m.threadId, article_id: m.articleId, actions: m.actions, ...m.payloadExtra },
    });
  };
}

/** Boutons d'un fil devenus sans objet : on les retire pour ne pas proposer une action qui échouera. */
export async function expireDecisionButtons(sb: any, threadId: string): Promise<number> {
  const { data: rows } = await sb.from("waouh_messages")
    .select("id,meta")
    .eq("thread_id", threadId)
    .eq("direction", "out")
    .limit(60);
  let expired = 0;
  for (const row of rows ?? []) {
    const actions = row?.meta?.actions;
    if (!Array.isArray(actions) || actions.length === 0) continue;
    const { error } = await sb.from("waouh_messages")
      .update({ meta: { ...(row.meta ?? {}), actions: [], actions_expired: true } })
      .eq("id", row.id);
    if (!error) expired += 1;
  }
  return expired;
}

export interface CompetitionResult {
  closed: number;
  notified: number;
  buttonsExpired: number;
}

/**
 * Un accord vient d'être conclu (négociation gagnante `winnerNegotiationId`) : les autres
 * négociations ouvertes de l'article sont fermées, leurs acheteurs prévenus, leurs boutons retirés.
 */
export async function closeCompetingNegotiations(
  sb: any,
  args: { articleId: string; winnerNegotiationId: string },
  write: EvictWriter = defaultEvictWriter(sb),
): Promise<CompetitionResult> {
  const result: CompetitionResult = { closed: 0, notified: 0, buttonsExpired: 0 };
  const { data: rows } = await sb.from("waouh_negotiations")
    .select("id,thread_id,buyer_user_id,state,meta")
    .eq("article_id", args.articleId)
    .in("state", ["proposed", "countered"])
    .neq("id", args.winnerNegotiationId);
  const now = new Date().toISOString();
  for (const neg of rows ?? []) {
    const { error } = await sb.from("waouh_negotiations").update({
      state: "closed",
      closed_at: now,
      meta: { ...(neg.meta ?? {}), closed_reason: "article_reserved", closed_by_negotiation: args.winnerNegotiationId },
    }).eq("id", neg.id);
    if (error) continue;
    result.closed += 1;
    if (!neg.thread_id) continue;
    await sb.from("waouh_chat_threads").update({ status: "waiting_availability", updated_at: now }).eq("id", neg.thread_id);
    result.buttonsExpired += await expireDecisionButtons(sb, neg.thread_id);
    if (neg.buyer_user_id) {
      try {
        await write({
          threadId: neg.thread_id,
          userId: neg.buyer_user_id,
          articleId: args.articleId,
          text: renderCatalog("competitor_reserved").text,
          intent: "competitor_reserved",
          actions: [],
          dedupeKey: `evict:${neg.id}`,
          payloadExtra: { negotiation_id: neg.id, closed_reason: "article_reserved" },
        });
        result.notified += 1;
      } catch (error) {
        console.warn("[waouh-evict] notification acheteur impossible", neg.id, error);
      }
    }
  }
  return result;
}

/**
 * L'accord est tombé et l'article est de nouveau disponible : les acheteurs évincés sont prévenus,
 * avec les boutons « Je le veux à X / Proposer un prix / Poser une question ». Une seule fois par négociation.
 */
export async function notifyArticleReopened(
  sb: any,
  args: { articleId: string },
  write: EvictWriter = defaultEvictWriter(sb),
): Promise<{ notified: number }> {
  const { data: article } = await sb.from("waouh_articles")
    .select("id,title,price,status").eq("id", args.articleId).maybeSingle();
  if (!article || String(article.status || "").toLowerCase() !== "active") return { notified: 0 };
  const { data: rows } = await sb.from("waouh_negotiations")
    .select("id,thread_id,buyer_user_id,state,meta")
    .eq("article_id", args.articleId)
    .eq("state", "closed");
  const now = new Date().toISOString();
  let notified = 0;
  for (const neg of rows ?? []) {
    const meta = neg.meta ?? {};
    if (meta.closed_reason !== "article_reserved" || meta.reopened_notified_at) continue;
    if (!neg.thread_id || !neg.buyer_user_id) continue;
    try {
      await write({
        threadId: neg.thread_id,
        userId: neg.buyer_user_id,
        articleId: article.id,
        text: renderCatalog("article_available_again", { title: article.title, price: Number(article.price || 0) || null }).text,
        intent: "article_available_again",
        actions: articleEntryActionsV3(article.id, Number(article.price || 0) || null),
        dedupeKey: `reopen:${neg.id}`,
        payloadExtra: { negotiation_id: neg.id },
      });
      await sb.from("waouh_negotiations").update({ meta: { ...meta, reopened_notified_at: now } }).eq("id", neg.id);
      await sb.from("waouh_chat_threads").update({ status: "active", updated_at: now }).eq("id", neg.thread_id);
      notified += 1;
    } catch (error) {
      console.warn("[waouh-evict] reprise impossible", neg.id, error);
    }
  }
  return { notified };
}
