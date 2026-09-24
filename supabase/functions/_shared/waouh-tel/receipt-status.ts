import { isUuid } from "./http.ts";

export type ReceiptState =
  | "accepted"
  | "sent"
  | "delivered"
  | "read"
  | "failed"
  | "expired"
  | "rejected";

export function receiptStatus(value: any): ReceiptState | null {
  if (value?.seenAt) return "read";
  if (value?.deliveredAt) return "delivered";
  const raw = String(
    value?.status?.groupName || value?.status?.name || value?.status ||
      value?.event || "",
  ).toUpperCase();
  if (/READ|SEEN/.test(raw)) return "read";
  if (/DELIVER/.test(raw)) return "delivered";
  if (/SENT|ENROUTE/.test(raw)) return "sent";
  if (/ACCEPT|PENDING/.test(raw)) return "accepted";
  if (/EXPIRED/.test(raw)) return "expired";
  if (/REJECT|UNDELIVERABLE/.test(raw)) return "rejected";
  if (/FAIL|ERROR/.test(raw)) return "failed";
  return null;
}

export function receiptOccurredAt(value: any): string | null {
  const raw = value?.seenAt || value?.deliveredAt || value?.doneAt ||
    value?.sentAt || value?.timestamp;
  if (typeof raw !== "string" || Number.isNaN(Date.parse(raw))) return null;
  return new Date(raw).toISOString();
}

export function receiptProviderStatus(
  value: any,
  status: ReceiptState,
): string {
  if (value?.seenAt) return "SEEN";
  if (value?.deliveredAt) return "DELIVERED";
  return String(
    value?.status?.name || value?.status?.groupName || value?.event || status,
  );
}

export function receiptOutboxLookup(value: any):
  | { column: "id" | "provider_message_id"; value: string }
  | null {
  const callbackData = String(value?.callbackData || "").trim();
  if (isUuid(callbackData)) return { column: "id", value: callbackData };
  const providerMessageId = String(
    value?.messageId || value?.message_id || "",
  ).trim();
  return providerMessageId
    ? { column: "provider_message_id", value: providerMessageId }
    : null;
}

const MESSAGE_RANK: Record<string, number> = {
  received: 0,
  processing: 1,
  queued: 2,
  sent: 3,
  delivered: 4,
  read: 5,
};

export function nextMessageStatus(
  current: string | null | undefined,
  receipt: ReceiptState,
) {
  if (current === "redacted") return null;
  const next = receipt === "accepted"
    ? "sent"
    : receipt === "expired" || receipt === "rejected" || receipt === "failed"
    ? "failed"
    : receipt;
  if (next === "failed") {
    return (MESSAGE_RANK[current || ""] || 0) < MESSAGE_RANK.delivered
      ? next
      : null;
  }
  return (MESSAGE_RANK[next] || 0) > (MESSAGE_RANK[current || ""] || 0)
    ? next
    : null;
}
