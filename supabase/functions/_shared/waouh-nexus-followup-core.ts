// deno-lint-ignore-file no-explicit-any -- client Supabase non typé.
// WAOUH — Suivi de l'avatar pour les offres vers des vendeurs externes (tick idempotent).
//
// L'avatar N'ENVOIE JAMAIS rien au tiers : il écrit des NOTES dans le fil de l'acheteur (rappel de relance, voie de contact
// ouverte, clôture) avec des boutons ; l'envoi reste un tap de l'acheteur, donc la politique de contact C0–C5 est intacte.

import { resolveContactPath } from "./waouh-contact-path.ts";
import { followUpDecision, nudgeAllowed, watchDecision, AVATAR_INTENTS } from "./waouh-avatar-notes.ts";
import { externalContactState, loadExternalTimeline } from "./waouh-nexus-deal.ts";
import { renderCatalog, type CatalogKey } from "./waouh-message-catalog.ts";
import { followUpOfferAction, modifyOfferAction, transmitOfferAction } from "./waouh-commands.ts";
import { chatWriterV2Enabled, recordChatMessage } from "./waouh-chat-writer.ts";
import { notifyInApp } from "./waouh-avatar-inapp.ts";

export interface TickResult { scanned: number; nudges: number; reachable: number; expired: number; skipped: number; errors: number }

type Note = { key: CatalogKey; intent: string; actions: Array<{ id: string; label: string }>; extra?: Record<string, unknown> };

/** WhatsApp pour les évènements d'offre : actif par défaut, coupé si l'acheteur a désactivé `notify_events`. */
async function eventsWhatsappAllowed(sb: any, buyerUserId: string): Promise<boolean> {
  const { data: u } = await sb.from("waouh_users").select("auth_user_id").eq("id", buyerUserId).maybeSingle();
  if (!u?.auth_user_id) return true;
  const { data: p } = await sb.from("waouh_avatar_prefs").select("notify_events").eq("auth_user_id", u.auth_user_id).maybeSingle();
  return p?.notify_events !== false;
}

async function writeNote(sb: any, thread: any, note: Note, vars: Record<string, unknown> = {}): Promise<boolean> {
  const message = renderCatalog(note.key, vars as any);
  const dedupeKey = `avatar:${thread.id}:${note.intent}:${(note.extra?.nudge_no as number | undefined) ?? 0}`;
  if (await chatWriterV2Enabled(sb)) {
    const w = await recordChatMessage({
      sb, threadId: thread.id, recipientUserId: thread.buyer_user_id, direction: "out", text: message.text, intent: note.intent,
      actions: note.actions, mirrorToOtherParty: false, enqueueWhatsapp: await eventsWhatsappAllowed(sb, thread.buyer_user_id), dedupeKey, payloadExtra: note.extra ?? {},
    });
    if (w.ok) { await notifyAvatarEvent(sb, thread, note, message.text, dedupeKey); return true; }
  }
  const { error } = await sb.from("waouh_messages").insert({
    thread_id: thread.id, user_id: thread.buyer_user_id, channel: "system", direction: "out", text: message.text, article_id: thread.article_id,
    meta: { intent: note.intent, thread_id: thread.id, article_id: thread.article_id, actions: note.actions, dedupe_key: dedupeKey, ...(note.extra ?? {}) },
  });
  if (!error) await notifyAvatarEvent(sb, thread, note, message.text, dedupeKey);
  return !error;
}

/** Évènement d'offre : notification dans l'application (Web + Flutter), en plus de la bulle dans la Deal Room. */
async function notifyAvatarEvent(sb: any, thread: any, note: Note, text: string, dedupeKey: string) {
  await notifyInApp(sb, {
    userId: thread.buyer_user_id, text, actions: note.actions.slice(0, 3), threadId: thread.id, articleId: thread.article_id ?? null, dedupeKey,
  });
}

/** Un passage : au plus `limit` fils actifs, chacun traité indépendamment (une erreur n'arrête pas les autres). */
export async function runNexusFollowUp(sb: any, opts: { now?: Date; limit?: number } = {}): Promise<TickResult> {
  const now = opts.now ?? new Date();
  const result: TickResult = { scanned: 0, nudges: 0, reachable: 0, expired: 0, skipped: 0, errors: 0 };
  const since = new Date(now.getTime() - 16 * 24 * 3600_000).toISOString();
  const { data: rows } = await sb.from("waouh_messages").select("thread_id")
    .eq("direction", "out").in("meta->>intent", [AVATAR_INTENTS.sent, AVATAR_INTENTS.watching])
    .gte("created_at", since).order("created_at", { ascending: false }).limit(400);
  const threadIds = [...new Set((rows ?? []).map((r: any) => r.thread_id).filter(Boolean))].slice(0, opts.limit ?? 100) as string[];

  for (const threadId of threadIds) {
    result.scanned += 1;
    try {
      const { data: thread } = await sb.from("waouh_chat_threads")
        .select("id,article_id,buyer_user_id,seller_user_id,negotiation_id,status").eq("id", threadId).maybeSingle();
      if (!thread || ["concluded", "cancelled"].includes(String(thread.status))) { result.skipped += 1; continue; }
      const timeline = await loadExternalTimeline(sb, threadId);
      const modify = thread.article_id ? [modifyOfferAction(thread.article_id)] : [];
      const negotiationId: string | null = thread.negotiation_id ?? null;

      if (timeline.transmittedAt) {
        const { data: reply } = await sb.from("waouh_messages").select("id").eq("thread_id", threadId)
          .eq("direction", "in").eq("user_id", thread.seller_user_id).gte("created_at", timeline.transmittedAt.toISOString()).limit(1);
        const decision = followUpDecision({
          transmittedAt: timeline.transmittedAt, now, nudgesNoted: timeline.nudgesNoted, replied: (reply ?? []).length > 0, expiredNoted: timeline.expiredNoted,
        });
        // Une relance vient d'être envoyée par l'acheteur (< 24 h) : pas de rappel superflu.
        const justNudged = !!timeline.lastSentAt && !nudgeAllowed({ lastSentAt: timeline.lastSentAt, now });
        if (decision.action === "nudge" && negotiationId && !justNudged) {
          const hours = Math.round((now.getTime() - timeline.transmittedAt.getTime()) / 3600_000);
          const ok = await writeNote(sb, thread, {
            key: "avatar_nudge_due", intent: AVATAR_INTENTS.nudgeDue, actions: [followUpOfferAction(negotiationId), ...modify], extra: { nudge_no: decision.nudgeNo },
          }, { hours });
          if (ok) result.nudges += 1; else result.errors += 1;
        } else if (decision.action === "expire") {
          const ok = await writeNote(sb, thread, { key: "avatar_expired", intent: AVATAR_INTENTS.expired, actions: modify });
          if (ok) result.expired += 1; else result.errors += 1;
        } else result.skipped += 1;
        continue;
      }

      if (timeline.watchingSince) {
        if (timeline.expiredNoted) { result.skipped += 1; continue; }
        const contact = await externalContactState(sb, thread.article_id, now);
        if (contact.unavailable) {
          const ok = await writeNote(sb, thread, { key: "external_unavailable", intent: AVATAR_INTENTS.expired, actions: [] });
          if (ok) result.expired += 1; else result.errors += 1;
          continue;
        }
        const { data: buyer } = await sb.from("waouh_users").select("auth_user_id").eq("id", thread.buyer_user_id).maybeSingle();
        const path = resolveContactPath({ level: contact.level, reachable: contact.reachable, signedIn: !!buyer?.auth_user_id, relayAvailable: contact.relayAvailable });
        const decision = watchDecision({ watchingSince: timeline.watchingSince, now, canSendNow: path.canSendNow, reachableNoted: timeline.reachableNoted });
        if (decision.action === "notify_reachable" && negotiationId) {
          const ok = await writeNote(sb, thread, {
            key: "avatar_reachable", intent: AVATAR_INTENTS.reachable, actions: [transmitOfferAction(negotiationId), ...modify], extra: { level: path.level },
          });
          if (ok) result.reachable += 1; else result.errors += 1;
        } else if (decision.action === "expire") {
          const ok = await writeNote(sb, thread, { key: "avatar_watch_expired", intent: AVATAR_INTENTS.expired, actions: modify });
          if (ok) result.expired += 1; else result.errors += 1;
        } else result.skipped += 1;
      }
    } catch (error) {
      console.error("[waouh-nexus-followup] fil ignoré", threadId, error);
      result.errors += 1;
    }
  }
  return result;
}
