import { sha256Hex } from "./crypto.ts";
import { normalizeE164 } from "./phone.ts";
import type {
  CanonicalInboundEvent,
  TelAttachment,
  TelChannel,
} from "./types.ts";

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stringValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return "";
}

function channelOf(item: Record<string, unknown>): TelChannel {
  const value = stringValue(
    item.integrationType,
    item.integration_type,
    item.channel,
    record(item.message).integrationType,
    record(item.message).channel,
    record(item.content).channel,
  ).toLowerCase();
  return value.includes("rcs") ? "rcs" : "sms";
}

function attachmentsOf(item: Record<string, unknown>): TelAttachment[] {
  const message = record(item.message);
  const content = record(item.content);
  const body = record(content.body);
  const candidates: unknown[] = [
    ...(Array.isArray(item.attachments) ? item.attachments : []),
    ...(Array.isArray(content.attachments) ? content.attachments : []),
    body.url ? body : null,
    message.url ? message : null,
    record(message.file),
    record(message.media),
  ];
  const result: TelAttachment[] = [];
  for (const candidate of candidates) {
    const value = record(candidate);
    const url = stringValue(value.url, value.fileUrl, value.mediaUrl);
    if (!/^https:\/\//i.test(url)) continue;
    result.push({
      url,
      mime_type:
        stringValue(value.mimeType, value.mime_type, value.contentType) ||
        undefined,
      name: stringValue(value.name, value.fileName) || undefined,
      size: Number.isFinite(Number(value.size))
        ? Number(value.size)
        : undefined,
    });
  }
  return result.slice(0, 10);
}

function locationOf(item: Record<string, unknown>) {
  const content = record(item.content);
  const body = record(content.body);
  const loc = record(
    item.location || body.location || record(item.message).location,
  );
  const latitude = Number(loc.latitude ?? loc.lat);
  const longitude = Number(loc.longitude ?? loc.lng ?? loc.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    latitude,
    longitude,
    label: stringValue(loc.label, loc.name, loc.address) || undefined,
  };
}

function textOf(item: Record<string, unknown>) {
  const message = record(item.message);
  const content = record(item.content);
  const body = record(content.body);
  const suggestion = record(
    item.suggestionResponse || message.suggestionResponse ||
      content.suggestionResponse,
  );
  if (stringValue(message.type, item.type).toUpperCase() === "SUGGESTION") {
    return stringValue(
      message.postbackData,
      item.postbackData,
      suggestion.postbackData,
      message.text,
      suggestion.text,
    );
  }
  return stringValue(
    item.text,
    message.text,
    content.text,
    body.text,
    suggestion.postbackData,
    suggestion.text,
    item.keyword,
  );
}

function eventItems(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.map(record).filter((item) => Object.keys(item).length > 0);
  }
  const root = record(payload);
  for (const key of ["results", "messages", "events"]) {
    if (Array.isArray(root[key])) {
      return (root[key] as unknown[]).map(record).filter((item) =>
        Object.keys(item).length > 0
      );
    }
  }
  return Object.keys(root).length ? [root] : [];
}

export async function parseInboundEvents(
  payload: unknown,
  options: { provider: string; defaultCountryCode: string },
): Promise<
  {
    events: CanonicalInboundEvent[];
    rejected: Array<{ reason: string; index: number }>;
  }
> {
  const events: CanonicalInboundEvent[] = [];
  const rejected: Array<{ reason: string; index: number }> = [];
  const items = eventItems(payload);

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const message = record(item.message);
    const content = record(item.content);
    const eventType = stringValue(
      record(item.event).type,
      item.eventType,
      item.event_type,
    ).toUpperCase();
    if (eventType === "TYPING_INDICATOR") {
      rejected.push({ reason: "ignored_typing_indicator", index });
      continue;
    }
    const fromRaw = stringValue(
      item.from,
      item.sender,
      item.phoneNumber,
      message.from,
      record(item.contact).phoneNumber,
    );
    const sender = normalizeE164(fromRaw, options.defaultCountryCode);
    if (!sender) {
      rejected.push({ reason: "invalid_sender", index });
      continue;
    }
    const recipientRaw = stringValue(
      item.to,
      item.destination,
      item.receiver,
      message.to,
    );
    const recipient = normalizeE164(recipientRaw, options.defaultCountryCode);
    const channel = channelOf(item);
    const declaredMessageType = stringValue(message.type, item.type)
      .toLowerCase();
    const text = textOf(item);
    const attachments = attachmentsOf(item);
    const location = locationOf(item);
    if (!text && attachments.length === 0 && !location) {
      rejected.push({ reason: "empty_message", index });
      continue;
    }
    const occurredAtRaw = stringValue(
      item.receivedAt,
      item.sentAt,
      item.timestamp,
      item.occurredAt,
      message.timestamp,
    );
    const occurredAt = occurredAtRaw && !Number.isNaN(Date.parse(occurredAtRaw))
      ? new Date(occurredAtRaw).toISOString()
      : new Date().toISOString();
    const stableRaw = JSON.stringify(item);
    const fallbackId = await sha256Hex(
      `${options.provider}:${sender}:${occurredAtRaw}:${stableRaw}`,
    );
    const providerMessageId =
      stringValue(item.messageId, item.message_id, message.id, item.id) ||
      fallbackId;
    const providerEventId =
      stringValue(item.eventId, item.event_id, item.callbackData, item.id) ||
      providerMessageId;
    const externalThreadId = stringValue(
      record(item.conversation).id,
      item.sessionId,
      item.threadId,
      message.threadId,
    ) || null;

    events.push({
      schema: "waouh.tel.event.v1",
      provider: options.provider,
      provider_event_id: providerEventId,
      provider_message_id: providerMessageId,
      channel,
      sender,
      recipient,
      recipient_raw: recipientRaw || null,
      external_thread_id: externalThreadId,
      type: declaredMessageType === "suggestion"
        ? "suggestion"
        : location
        ? "location"
        : attachments.length
        ? (attachments[0].mime_type?.startsWith("image/") ? "image" : "file")
        : text
        ? "text"
        : "suggestion",
      text,
      attachments,
      location,
      occurred_at: occurredAt,
      raw: item,
    });
  }
  return { events, rejected };
}
