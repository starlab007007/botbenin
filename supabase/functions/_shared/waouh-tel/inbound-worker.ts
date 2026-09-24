import type { SupabaseClient } from "npm:@supabase/supabase-js@2.49.8";
import { auditTel } from "./config.ts";
import { decryptSensitiveJson } from "./crypto.ts";
import {
  activateConsent,
  enqueueTelMessage,
  ensureDirectThread,
  ensureTelUser,
  persistInboundMessage,
  persistOutboundMessage,
} from "./db.ts";
import { callWaouhEngine, controlledEngineFailure } from "./engine.ts";
import { inviteCodeFromMessage, redeemInvite } from "./invites.ts";
import { executeTelCommand, parseTelCommand } from "./commands.ts";
import {
  broadcastRoomBotReply,
  executeRoomCommand,
  parseRoomCommand,
} from "./rooms.ts";
import { renderRcsFromEngine } from "./render-rcs.ts";
import { renderSmsFromEngine } from "./render-sms.ts";
import {
  retryDelaySeconds,
  sendInfobipRcsConversationEvents,
} from "./provider.ts";
import type {
  CanonicalInboundEvent,
  TelOutboundPayload,
  TelSettings,
} from "./types.ts";

function simplePayload(text: string): TelOutboundPayload {
  return { schema: "waouh.tel.outbound.v1", text };
}

function throwIfError(
  result: { error?: { message?: string } | null },
  label: string,
) {
  if (result.error) {
    throw new Error(`${label}:${result.error.message || "unknown"}`);
  }
}

export function inboundRecipientMatches(
  event: Pick<CanonicalInboundEvent, "channel" | "recipient" | "recipient_raw">,
  settings: Pick<
    TelSettings,
    "provider" | "business_phone_e164" | "rcs_sender_name"
  >,
) {
  if (settings.provider !== "infobip") return true;
  if (event.channel === "sms") {
    return Boolean(
      event.recipient && event.recipient === settings.business_phone_e164,
    );
  }
  const raw = (event.recipient_raw || "").trim().toLowerCase();
  return Boolean(
    (raw && raw === settings.rcs_sender_name.trim().toLowerCase()) ||
      (event.recipient && event.recipient === settings.business_phone_e164),
  );
}

async function markInboundReceived(admin: SupabaseClient, messageId: string) {
  const result = await admin.from("waouh_tel_messages").update({
    status: "received",
  }).eq("id", messageId).neq("status", "redacted");
  throwIfError(result, "inbound_message_complete_failed");
}

async function processInboundEvent(
  admin: SupabaseClient,
  settings: TelSettings,
  event: CanonicalInboundEvent,
  processed: any,
) {
  if (!inboundRecipientMatches(event, settings)) {
    return {
      finalStatus: "ignored" as const,
      messageId: null,
      outcome: {
        event_id: event.provider_event_id,
        ignored: "recipient_mismatch",
      },
    };
  }

  let telUser: any = null;
  let thread: any = null;
  let inbound: any = null;
  try {
    telUser = await ensureTelUser(
      admin,
      event.sender,
      settings,
      event.provider_event_id,
    );
    thread = await ensureDirectThread(admin, telUser.id, event);
    inbound = await persistInboundMessage(admin, event, telUser.id, thread.id);
    const linkResult = await admin.from("waouh_tel_processed_events").update({
      message_id: inbound.id,
    }).eq("id", processed.id).eq("locked_by", processed.locked_by);
    throwIfError(linkResult, "processed_event_link_failed");

    if (inbound.reused) {
      if (["received", "redacted"].includes(inbound.status)) {
        return {
          finalStatus: "completed" as const,
          messageId: inbound.id,
          outcome: { event_id: event.provider_event_id, duplicate: true },
        };
      }
      const resumeResult = await admin.from("waouh_tel_messages").update({
        status: "processing",
      }).eq("id", inbound.id).in("status", ["processing", "failed"]);
      throwIfError(resumeResult, "inbound_message_resume_failed");
    }

    if (event.channel === "rcs") {
      const capabilityResult = await admin.from("waouh_tel_capabilities")
        .upsert({
          tel_user_id: telUser.id,
          provider: event.provider,
          rcs_reachable: true,
          supports_media: true,
          supports_cards: true,
          supports_carousel: true,
          supports_typing: true,
          supports_read_receipts: true,
          checked_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
        }, { onConflict: "tel_user_id,provider" });
      throwIfError(capabilityResult, "inbound_capability_upsert_failed");
      const indicators = sendInfobipRcsConversationEvents(
        settings,
        event.sender,
        event.provider_message_id,
      ).catch((error) =>
        console.warn("[waouh-tel-inbox] RCS indicators failed", error)
      );
      const runtime = (globalThis as any).EdgeRuntime;
      if (runtime?.waitUntil) runtime.waitUntil(indicators);
      else void indicators;
    }

    const command = parseTelCommand(event.text);
    if (command) {
      await executeTelCommand({
        admin,
        command,
        settings,
        telUser,
        thread,
        channel: event.channel,
        dedupeKey: `inbound:${inbound.id}:command`,
      });
      if (command.type !== "erase_confirm") {
        await markInboundReceived(admin, inbound.id);
      }
      return {
        finalStatus: "completed" as const,
        messageId: inbound.id,
        outcome: { event_id: event.provider_event_id, command: command.type },
      };
    }

    if (["stopped", "suspended", "deleted"].includes(telUser.status)) {
      await enqueueTelMessage(admin, {
        targetUserId: telUser.id,
        targetThreadId: thread.id,
        bypassConsent: true,
        messageKind: "system",
        channelPreference: event.channel,
        dedupeKey: `inbound:${inbound.id}:inactive`,
        payload: simplePayload(
          telUser.status === "stopped"
            ? "WAOUH Messages est arrêté. Envoyez REPRENDRE pour le réactiver."
            : "Ce compte WAOUH Messages n'est pas disponible.",
        ),
      });
      await markInboundReceived(admin, inbound.id);
      return {
        finalStatus: "completed" as const,
        messageId: inbound.id,
        outcome: { event_id: event.provider_event_id, ignored: telUser.status },
      };
    }

    const inviteCode = inviteCodeFromMessage(event.text);
    if (inviteCode) {
      const redemption = await redeemInvite(
        admin,
        inviteCode,
        telUser.id,
        processed.id,
      );
      if (redemption.ok) {
        await activateConsent(
          admin,
          telUser.id,
          event.channel,
          settings,
          "invite",
          event.provider_event_id,
        );
      }
      await enqueueTelMessage(admin, {
        targetUserId: telUser.id,
        targetThreadId: thread.id,
        bypassConsent: true,
        messageKind: "system",
        channelPreference: event.channel,
        dedupeKey: `inbound:${inbound.id}:invite`,
        payload: simplePayload(
          redemption.ok
            ? "Bienvenue sur WAOUH 👋 Décrivez ce que vous cherchez, ou envoyez AIDE pour voir les commandes."
            : "Ce code d'invitation est invalide, expiré ou déjà utilisé.",
        ),
      });
      await markInboundReceived(admin, inbound.id);
      return {
        finalStatus: "completed" as const,
        messageId: inbound.id,
        outcome: { event_id: event.provider_event_id, invite: redemption.ok },
      };
    }

    const consentResult = await admin.from("waouh_tel_consents")
      .select("status").eq("tel_user_id", telUser.id).eq(
        "channel",
        event.channel,
      ).eq("purpose", "conversation").maybeSingle();
    throwIfError(consentResult, "consent_lookup_failed");
    const consent = consentResult.data;
    if (!consent) {
      await activateConsent(
        admin,
        telUser.id,
        event.channel,
        settings,
        "inbound_message",
        event.provider_event_id,
      );
    } else if (consent.status !== "active") {
      await enqueueTelMessage(admin, {
        targetUserId: telUser.id,
        targetThreadId: thread.id,
        bypassConsent: true,
        messageKind: "system",
        channelPreference: event.channel,
        dedupeKey: `inbound:${inbound.id}:consent`,
        payload: simplePayload(
          "Votre consentement est arrêté. Envoyez REPRENDRE pour continuer.",
        ),
      });
      await markInboundReceived(admin, inbound.id);
      return {
        finalStatus: "completed" as const,
        messageId: inbound.id,
        outcome: { event_id: event.provider_event_id, consent: "inactive" },
      };
    }

    const roomCommand = parseRoomCommand(event.text);
    if (roomCommand) {
      const roomResult = await executeRoomCommand({
        admin,
        command: roomCommand,
        settings,
        telUser,
        thread,
        sourceMessageId: inbound.id,
      });
      if ((roomResult as any)?.bot_mentioned && (roomResult as any)?.room) {
        const botEvent = {
          ...event,
          text: roomCommand.type === "post"
            ? roomCommand.text.replace(/^WAOUH\b[\s,:-]*/i, "")
            : event.text,
        };
        let botReply;
        try {
          botReply = await callWaouhEngine(admin, telUser, botEvent);
        } catch {
          botReply = controlledEngineFailure();
        }
        const botPayload = renderRcsFromEngine(botReply);
        const roomInsert = await admin.from("waouh_tel_room_messages").insert({
          room_id: (roomResult as any).room.id,
          sender_tel_user_id: null,
          body_text: botReply.text,
          content: botPayload,
        });
        throwIfError(roomInsert, "room_bot_message_insert_failed");
        await broadcastRoomBotReply(
          admin,
          (roomResult as any).room,
          botPayload,
        );
      }
      await markInboundReceived(admin, inbound.id);
      return {
        finalStatus: "completed" as const,
        messageId: inbound.id,
        outcome: { event_id: event.provider_event_id, room: true },
      };
    }

    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
    const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
    const [minuteResult, hourResult] = await Promise.all([
      admin.from("waouh_tel_messages").select("id", {
        count: "exact",
        head: true,
      }).eq("tel_user_id", telUser.id).eq("direction", "inbound").gte(
        "created_at",
        oneMinuteAgo,
      ),
      admin.from("waouh_tel_messages").select("id", {
        count: "exact",
        head: true,
      }).eq("tel_user_id", telUser.id).eq("direction", "inbound").gte(
        "created_at",
        oneHourAgo,
      ),
    ]);
    throwIfError(minuteResult, "inbound_minute_rate_lookup_failed");
    throwIfError(hourResult, "inbound_hour_rate_lookup_failed");
    if ((minuteResult.count || 0) > 10 || (hourResult.count || 0) > 60) {
      await enqueueTelMessage(admin, {
        targetUserId: telUser.id,
        targetThreadId: thread.id,
        bypassConsent: true,
        messageKind: "system",
        channelPreference: event.channel,
        dedupeKey: `inbound:${inbound.id}:rate-limit`,
        payload: simplePayload(
          "Vous envoyez trop de messages. Patientez quelques minutes avant de réessayer.",
        ),
      });
      await markInboundReceived(admin, inbound.id);
      await auditTel(admin, "inbound_rate_limited", {
        telUserId: telUser.id,
        threadId: thread.id,
        actorType: "system",
        outcome: "denied",
        details: {
          minute: minuteResult.count || 0,
          hour: hourResult.count || 0,
        },
      });
      return {
        finalStatus: "completed" as const,
        messageId: inbound.id,
        outcome: { event_id: event.provider_event_id, rate_limited: true },
      };
    }

    const existingReplyResult = await admin.from("waouh_tel_messages")
      .select("*").eq("in_reply_to_message_id", inbound.id).maybeSingle();
    throwIfError(existingReplyResult, "inbound_reply_lookup_failed");
    let outbound = existingReplyResult.data;
    let outboundPayload = outbound?.content as TelOutboundPayload | undefined;
    if (!outbound || !outboundPayload?.text) {
      let engineReply;
      try {
        engineReply = await callWaouhEngine(admin, telUser, event);
      } catch (engineError) {
        console.error("[waouh-tel-inbox] engine failure", engineError);
        engineReply = controlledEngineFailure();
      }
      outboundPayload = event.channel === "rcs"
        ? renderRcsFromEngine(engineReply)
        : renderSmsFromEngine(engineReply);
      outbound = await persistOutboundMessage(admin, {
        threadId: thread.id,
        telUserId: telUser.id,
        provider: event.provider,
        channel: event.channel,
        payload: outboundPayload,
        enginePayload: engineReply.raw || { intent: engineReply.intent },
        inboundMessageId: inbound.id,
      });
      outboundPayload = outbound.content as TelOutboundPayload;
    }
    await enqueueTelMessage(admin, {
      targetUserId: telUser.id,
      targetThreadId: thread.id,
      sourceMessageId: outbound.id,
      channelPreference: event.channel,
      payload: outboundPayload,
      dedupeKey: `inbound:${inbound.id}:reply`,
    });
    await markInboundReceived(admin, inbound.id);
    await auditTel(admin, "inbound_processed", {
      telUserId: telUser.id,
      threadId: thread.id,
      actorType: "provider",
      correlationId: inbound.correlation_id,
      details: { channel: event.channel, provider: event.provider },
    });
    return {
      finalStatus: "completed" as const,
      messageId: inbound.id,
      outcome: {
        event_id: event.provider_event_id,
        message_id: inbound.id,
        queued: true,
      },
    };
  } catch (error) {
    if (inbound?.id) {
      const inboundFailure = await admin.from("waouh_tel_messages").update({
        status: processed.attempts >= processed.max_attempts
          ? "failed"
          : "processing",
      })
        .eq("id", inbound.id).neq("status", "redacted");
      if (inboundFailure.error) {
        console.error(
          "[waouh-tel-inbox] failed to update inbound status",
          inboundFailure.error,
        );
      }
    }
    if (telUser && thread && processed.attempts >= processed.max_attempts) {
      await enqueueTelMessage(admin, {
        targetUserId: telUser.id,
        targetThreadId: thread.id,
        bypassConsent: true,
        messageKind: "system",
        channelPreference: event.channel,
        dedupeKey: `inbound:${inbound.id}:terminal-error`,
        payload: simplePayload(
          "WAOUH a bien reçu votre message mais rencontre un délai temporaire. Réessayez dans quelques instants.",
        ),
      }).catch(() => null);
    }
    const wrapped = new Error(
      error instanceof Error ? error.message : String(error),
    );
    throw wrapped;
  }
}

export async function drainInboundInbox(
  admin: SupabaseClient,
  settings: TelSettings,
  limit = 25,
) {
  const workerToken = `${
    Deno.env.get("DENO_DEPLOYMENT_ID") || "local"
  }:inbox:${crypto.randomUUID()}`;
  const { data: rows, error: claimError } = await admin.rpc(
    "waouh_tel_claim_inbox",
    { p_limit: limit, p_worker_token: workerToken },
  );
  if (claimError) throw new Error(`inbox_claim_failed:${claimError.message}`);
  const outcomes: Array<Record<string, unknown>> = [];

  for (const row of rows || []) {
    try {
      if (!row.payload_encrypted) throw new Error("inbox_payload_missing");
      const event = await decryptSensitiveJson<CanonicalInboundEvent>(
        row.payload_encrypted,
      );
      if (
        event?.schema !== "waouh.tel.event.v1" ||
        event.provider_event_id !== row.provider_event_id ||
        event.provider !== row.provider
      ) {
        throw new Error("inbox_payload_invalid");
      }
      const result = await processInboundEvent(admin, settings, event, row);
      const completed = await admin.from("waouh_tel_processed_events").update({
        status: result.finalStatus,
        message_id: result.messageId,
        payload_encrypted: null,
        error_code: result.finalStatus === "ignored"
          ? "recipient_mismatch"
          : null,
        processed_at: new Date().toISOString(),
        locked_at: null,
        locked_by: null,
      }).eq("id", row.id).eq("locked_by", workerToken);
      throwIfError(completed, "inbox_complete_failed");
      outcomes.push(result.outcome);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const terminal = row.attempts >= row.max_attempts;
      const failed = await admin.from("waouh_tel_processed_events").update({
        status: terminal ? "failed" : "retry",
        attempts: row.attempts,
        scheduled_at: terminal ? row.scheduled_at : new Date(
          Date.now() + retryDelaySeconds(row.attempts) * 1000,
        ).toISOString(),
        error_code: message.slice(0, 250),
        processed_at: terminal ? new Date().toISOString() : null,
        locked_at: null,
        locked_by: null,
      }).eq("id", row.id).eq("locked_by", workerToken);
      throwIfError(failed, "inbox_failure_update_failed");
      outcomes.push({
        event_id: row.provider_event_id,
        status: terminal ? "failed" : "retry",
      });
    }
  }

  return { claimed: (rows || []).length, outcomes };
}
