import type { SupabaseClient } from "npm:@supabase/supabase-js@2.49.8";
import { encryptPhone, hashPhone } from "./crypto.ts";
import { phoneLast4 } from "./phone.ts";
import type {
  CanonicalInboundEvent,
  TelOutboundPayload,
  TelSettings,
} from "./types.ts";

export async function ensureTelUser(
  admin: SupabaseClient,
  e164: string,
  settings: TelSettings,
  eventId: string,
) {
  const phoneHash = await hashPhone(e164);
  const { data: existing, error: lookupError } = await admin.from(
    "waouh_tel_users",
  ).select("*").eq("phone_hash", phoneHash).maybeSingle();
  if (lookupError) {
    throw new Error(`tel_user_lookup_failed:${lookupError.message}`);
  }
  if (existing) {
    const { data, error } = await admin.from("waouh_tel_users")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", existing.id).select("*").single();
    if (error) throw new Error(`tel_user_touch_failed:${error.message}`);
    return data;
  }
  const insert = {
    phone_encrypted: await encryptPhone(e164),
    phone_hash: phoneHash,
    phone_last4: phoneLast4(e164),
    locale: settings.default_locale,
    status: "active",
    metadata: { first_event_id: eventId, source: "native_messaging" },
    last_seen_at: new Date().toISOString(),
  };
  const { data, error } = await admin.from("waouh_tel_users").insert(insert)
    .select("*").single();
  if (!error) return data;
  if (error.code === "23505") {
    const { data: raced, error: retryError } = await admin.from(
      "waouh_tel_users",
    ).select("*").eq("phone_hash", phoneHash).single();
    if (!retryError) return raced;
  }
  throw new Error(`tel_user_create_failed:${error.message}`);
}

export async function activateConsent(
  admin: SupabaseClient,
  telUserId: string,
  channel: "sms" | "rcs",
  settings: TelSettings,
  source: "inbound_message" | "invite" | "admin" | "command",
  eventId?: string,
) {
  const { error } = await admin.from("waouh_tel_consents").upsert({
    tel_user_id: telUserId,
    channel,
    purpose: "conversation",
    status: "active",
    terms_version: settings.terms_version,
    source,
    evidence_event_id: eventId || null,
    consented_at: new Date().toISOString(),
    stopped_at: null,
  }, { onConflict: "tel_user_id,channel,purpose" });
  if (error) throw new Error(`consent_upsert_failed:${error.message}`);
}

export async function ensureDirectThread(
  admin: SupabaseClient,
  telUserId: string,
  event: Pick<
    CanonicalInboundEvent,
    "provider" | "channel" | "external_thread_id"
  >,
) {
  const { data: existing, error: lookupError } = await admin.from(
    "waouh_tel_threads",
  ).select("*")
    .eq("tel_user_id", telUserId).eq("provider", event.provider).eq(
      "channel",
      event.channel,
    )
    .eq("thread_kind", "direct").eq("status", "open").maybeSingle();
  if (lookupError) {
    throw new Error(`thread_lookup_failed:${lookupError.message}`);
  }
  if (existing) {
    const update: Record<string, unknown> = {
      last_message_at: new Date().toISOString(),
    };
    if (!existing.external_thread_id && event.external_thread_id) {
      update.external_thread_id = event.external_thread_id;
    }
    const { data } = await admin.from("waouh_tel_threads").update(update).eq(
      "id",
      existing.id,
    ).select("*").single();
    return data || existing;
  }
  const { data, error } = await admin.from("waouh_tel_threads").insert({
    tel_user_id: telUserId,
    provider: event.provider,
    channel: event.channel,
    external_thread_id: event.external_thread_id,
    thread_kind: "direct",
    status: "open",
    last_message_at: new Date().toISOString(),
  }).select("*").single();
  if (!error) return data;
  if (error.code === "23505") {
    const { data: raced } = await admin.from("waouh_tel_threads").select("*")
      .eq("tel_user_id", telUserId).eq("provider", event.provider).eq(
        "channel",
        event.channel,
      )
      .eq("thread_kind", "direct").eq("status", "open").single();
    if (raced) return raced;
  }
  throw new Error(`thread_create_failed:${error.message}`);
}

export async function enqueueTelMessage(
  admin: SupabaseClient,
  options: {
    targetUserId: string;
    targetThreadId?: string | null;
    sourceMessageId?: string | null;
    payload: TelOutboundPayload;
    channelPreference?: "auto" | "sms" | "rcs";
    bypassConsent?: boolean;
    messageKind?: "message" | "typing" | "read_receipt" | "system";
    dedupeKey?: string | null;
  },
) {
  const { data, error } = await admin.from("waouh_tel_outbox").insert({
    target_user_id: options.targetUserId,
    target_thread_id: options.targetThreadId ?? null,
    source_message_id: options.sourceMessageId ?? null,
    payload: options.payload,
    channel_preference: options.channelPreference ?? "auto",
    bypass_consent: options.bypassConsent ?? false,
    message_kind: options.messageKind ?? "message",
    dedupe_key: options.dedupeKey ?? null,
  }).select("*").single();
  if (error?.code === "23505" && options.dedupeKey) {
    const { data: existing, error: existingError } = await admin.from(
      "waouh_tel_outbox",
    ).select("*").eq("dedupe_key", options.dedupeKey).maybeSingle();
    if (!existingError && existing) return { ...existing, reused: true };
  }
  if (error) throw new Error(`outbox_enqueue_failed:${error.message}`);
  return data;
}

export async function persistInboundMessage(
  admin: SupabaseClient,
  event: CanonicalInboundEvent,
  telUserId: string,
  threadId: string,
) {
  const { data, error } = await admin.from("waouh_tel_messages").insert({
    thread_id: threadId,
    tel_user_id: telUserId,
    provider: event.provider,
    provider_message_id: event.provider_message_id,
    direction: "inbound",
    channel: event.channel,
    message_type: event.type,
    body_text: event.text || null,
    content: { attachments: event.attachments, location: event.location },
    status: "processing",
    occurred_at: event.occurred_at,
  }).select("*").single();
  if (error?.code === "23505") {
    const { data: existing, error: existingError } = await admin.from(
      "waouh_tel_messages",
    ).select("*")
      .eq("provider", event.provider)
      .eq("provider_message_id", event.provider_message_id)
      .maybeSingle();
    if (!existingError && existing) return { ...existing, reused: true };
  }
  if (error) throw new Error(`inbound_message_insert_failed:${error.message}`);
  return data;
}

export async function persistOutboundMessage(
  admin: SupabaseClient,
  options: {
    threadId: string;
    telUserId: string;
    provider: string;
    channel: "sms" | "rcs";
    payload: TelOutboundPayload;
    enginePayload?: unknown;
    inboundMessageId?: string | null;
  },
) {
  const { data, error } = await admin.from("waouh_tel_messages").insert({
    thread_id: options.threadId,
    tel_user_id: options.telUserId,
    provider: options.provider,
    direction: "outbound",
    channel: options.channel,
    message_type: options.payload.products?.length
      ? (options.payload.products.length > 1 ? "carousel" : "card")
      : "text",
    body_text: options.payload.text,
    content: options.payload,
    engine_payload: options.enginePayload ?? null,
    in_reply_to_message_id: options.inboundMessageId ?? null,
    status: "queued",
  }).select("*").single();
  if (error?.code === "23505" && options.inboundMessageId) {
    const { data: existing, error: existingError } = await admin.from(
      "waouh_tel_messages",
    ).select("*").eq("in_reply_to_message_id", options.inboundMessageId)
      .maybeSingle();
    if (!existingError && existing) return { ...existing, reused: true };
  }
  if (error) throw new Error(`outbound_message_insert_failed:${error.message}`);
  return data;
}
