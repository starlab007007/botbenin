import { classifyAvatarReply, selectReplyJourney } from "../waouh-avatar-lifecycle.ts";
import { avatarNotice, revokeAvatarContacts, openAvatarReplyRoom } from "../waouh-avatar-orchestrator.ts";
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

async function captureOpportunityReply(
  admin: SupabaseClient,
  telUser: any,
  thread: any,
  event: CanonicalInboundEvent,
  inbound: any,
) {
  try {
    const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
    const { data: contactEvents, error: contactEventError } = await admin
      .from("waouh_conversation_bus_events")
      .select("*")
      .in("event_type", ["autonomy.native_contact_queued", "autonomy.native_followup_queued"])
      .eq("channel", event.channel)
      .contains("payload", { native_tel_user_id: telUser.id })
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(50);
    if (contactEventError) throw contactEventError;
    const ids = [...new Set((contactEvents ?? []).map((r: any) => r.journey_id).filter(Boolean))];
    if (!ids.length) return false;
    const { data: live } = await admin.from("waouh_opportunity_journeys").select("id,owner_id,stage").in("id", ids).not("stage", "in", '("completed","cancelled")');
    if (classifyAvatarReply(event.text) === "stop") {
      await revokeAvatarContacts(admin, (contactEvents ?? []).map((r: any) => r.payload?.contact_id).filter(Boolean));
      for (const j of live ?? []) {
        await admin.from("waouh_opportunity_journeys").update({ stage: "cancelled", last_action: "contact_opted_out", completed_at: new Date().toISOString() }).eq("id", j.id).in("stage", ["contact_ready", "contacting", "waiting_reply", "negotiating"]);
        await avatarNotice(admin, j.owner_id, `native-optout:${inbound.id}:${j.id}`, "Le contact a demandé l’arrêt des messages.", j);
      }
      return true;
    }
    const liveIds = new Set((live ?? []).map((j: any) => j.id));
    const candidates = (contactEvents ?? []).filter((r: any) => liveIds.has(r.journey_id)).map((row: any) => ({ ...row, payload: { ...row.payload, journey_id: row.journey_id } }));
    const contactEvent: any = selectReplyJourney(candidates, String(event.text || ""));
    if (!contactEvent && candidates.length) {
      for (const j of live ?? []) await avatarNotice(admin, j.owner_id, `native-ambiguous:${inbound.id}:${j.id}`, "La réponse concerne plusieurs missions. Précisez la référence WA de l’échange.", j);
      return true;
    }
    if (contactEventError || !contactEvent?.journey_id || !contactEvent?.owner_id) return false;

    const { data: journey } = await admin.from("waouh_opportunity_journeys")
      .select("*").eq("id", contactEvent.journey_id).maybeSingle();
    if (!journey || ["completed","cancelled"].includes(String(journey.stage || ""))) return false;

    if (["negotiating", "agreed", "executing"].includes(journey.stage)) return false;
    const disposition = classifyAvatarReply(event.text);
    if (disposition !== "positive") {
      const terminal = disposition === "negative" || disposition === "stop";
      await admin.from("waouh_opportunity_journeys").update({ stage: terminal ? "cancelled" : "waiting_reply",
        last_action: terminal ? "counterparty_declined" : "reply_needs_clarification",
        last_message: terminal ? "La contrepartie a refusé cette piste." : "Réponse reçue, précision nécessaire.",
        ...(terminal ? { completed_at: new Date().toISOString() } : {}),
      }).eq("id", journey.id);
      await avatarNotice(admin, journey.owner_id, `native-disposition:${inbound.id}`, terminal ? "Cette piste ne souhaite pas poursuivre." : "Avatar attend une précision sur la réponse reçue.", journey);
      return true;
    }
    const room = await openAvatarReplyRoom(admin, journey, event.sender, event.channel);
    journey.thread_id = room.threadId; journey.article_id = room.articleId; journey.negotiation_id = room.negotiationId;
    const replyAt = new Date().toISOString();
    const replyPreview = String(event.text || "").trim().slice(0, 180);
    const payload = contactEvent.payload && typeof contactEvent.payload === "object"
      ? contactEvent.payload as Record<string, unknown>
      : {};
    const contactId = typeof payload.contact_id === "string" ? payload.contact_id : null;

    await admin.rpc("waouh_append_conversation_bus_event", {
      p_owner_id: contactEvent.owner_id,
      p_event_type: "nexus.counterparty_reply",
      p_channel: event.channel,
      p_direction: "in",
      p_fabric_id: contactEvent.fabric_id ?? journey.fabric_id ?? null,
      p_journey_id: journey.id,
      p_mandate_id: contactEvent.mandate_id ?? journey.mandate_id ?? null,
      p_article_id: journey.article_id ?? null,
      p_thread_id: journey.thread_id ?? null,
      p_negotiation_id: journey.negotiation_id ?? null,
      p_deal_id: journey.deal_id ?? null,
      p_external_ref: `native-reply:${inbound.id}`,
      p_payload: {
        reply_preview: replyPreview,
        native_tel_user_id: telUser.id,
        native_thread_id: thread.id,
        contact_id: contactId,
        provider_message_id: event.provider_message_id,
      },
    });

    await admin.from("waouh_opportunity_journeys").update({
      stage: journey.thread_id ? "negotiating" : "contact_ready",
      contactability_level: "C5",
      readiness_level: "R5",
      readiness_score: 100,
      actionability_score: 100,
      next_best_action: "NEGOTIATE",
      contact_channel: event.channel,
      last_action: "native_counterparty_reply",
      next_action: "NEGOTIATE",
      last_message: replyPreview
        ? `Réponse reçue via ${event.channel.toUpperCase()} : ${replyPreview}`
        : `Réponse reçue via ${event.channel.toUpperCase()}.`,
      last_activity_at: replyAt,
      updated_at: replyAt,
    }).eq("id", journey.id);

    if (contactEvent.fabric_id ?? journey.fabric_id) {
      await admin.from("waouh_contact_packs").update({
        contactability_level: "C5",
        readiness_level: "R5",
        readiness_score: 100,
        actionability_score: 100,
        next_best_action: "NEGOTIATE",
        best_channel: event.channel,
        last_verified_at: replyAt,
        updated_at: replyAt,
      }).eq("fabric_id", contactEvent.fabric_id ?? journey.fabric_id);
    }

    if (contactId) {
      const { data: metrics } = await admin.from("waouh_entity_contacts")
        .select("reply_count,avg_reply_delay_seconds").eq("id", contactId).maybeSingle();
      const oldCount = Number(metrics?.reply_count || 0);
      const oldAvg = Number(metrics?.avg_reply_delay_seconds || 0);
      const sentAt = contactEvent.created_at ? Date.parse(contactEvent.created_at) : NaN;
      const delaySeconds = Number.isFinite(sentAt) ? Math.max(0, (Date.now() - sentAt) / 1000) : 0;
      const nextAvg = delaySeconds > 0
        ? ((oldAvg * oldCount) + delaySeconds) / (oldCount + 1)
        : oldAvg;
      await admin.from("waouh_entity_contacts").update({
        reply_count: oldCount + 1,
        avg_reply_delay_seconds: nextAvg || null,
        last_success_at: replyAt,
        verification_status: "reachable",
        contactability_level: "C5",
        verified_at: replyAt,
        updated_at: replyAt,
      }).eq("id", contactId);
    }

    const mandateId = contactEvent.mandate_id ?? journey.mandate_id ?? null;
    if (mandateId) {
      const { data: mandate } = await admin.from("waouh_avatar_mandates")
        .select("replied_count").eq("id", mandateId).maybeSingle();
      if (mandate) {
        await admin.from("waouh_avatar_mandates").update({
          replied_count: Number(mandate.replied_count || 0) + 1,
          updated_at: replyAt,
        }).eq("id", mandateId);
      }
    }

    const { data: ownerWaouh } = await admin.from("waouh_users")
      .select("id,web_session_id")
      .eq("auth_user_id", contactEvent.owner_id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (ownerWaouh?.id) {
      await admin.from("waouh_notifications").insert({
        user_id: ownerWaouh.id,
        article_id: journey.article_id ?? null,
        thread_id: journey.thread_id ?? null,
        notification_type: "nexus_opportunity_reply",
        photos: [],
        channel: "waouh_app",
        delivery_status: "delivered",
        delivered_at: replyAt,
        web_session_id: ownerWaouh.web_session_id ?? null,
        dedupe_key: `native-opportunity-reply:${inbound.id}`,
        payload: {
          text: `💬 Réponse reçue via ${event.channel.toUpperCase()}. Votre Avatar est prêt à poursuivre.`,
          reply_preview: replyPreview,
          fabric_id: contactEvent.fabric_id ?? journey.fabric_id ?? null,
          journey_id: journey.id,
          mandate_id: mandateId,
          workflow_state: journey.thread_id ? "negotiating" : "contact_ready",
          contactability_level: "C5",
          readiness_level: "R5",
          next_best_action: "NEGOTIATE",
          native_thread_id: thread.id,
        },
      });
    }
    return true;
  } catch (error) {
    console.warn("[waouh-tel-inbox] opportunity reply correlation failed", error);
    return false;
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

    const opportunityReply = await captureOpportunityReply(
      admin, telUser, thread, event, inbound,
    );
    if (opportunityReply) {
      await auditTel(admin, "opportunity_reply_correlated", {
        telUserId: telUser.id,
        threadId: thread.id,
        actorType: "provider",
        correlationId: inbound.correlation_id,
        details: { channel: event.channel, provider: event.provider },
      });
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
