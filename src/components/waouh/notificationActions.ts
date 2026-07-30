import { getMatchKind, type WaouhNotification } from "@/hooks/useWaouhMatchNotifications";
import { correlationIdFor, traceUi } from "./waouhCorrelation";

export type OpenNotificationOptions = {
  /** Optional: invoked for `deal_payment_request` notifications to display the payment dialog. */
  onPayDialog?: (args: { dealId: string; amount?: number }) => void;
  /** Optional: invoked just before dispatching open events (used to mark notif as read). */
  beforeOpen?: () => void;
};

/**
 * Shared click handler for WAOUH notifications.
 * Dispatches the same events as `WaouhNotificationsBell` so that the chat
 * surface (mobile screen OR desktop `WaouhChatPage`) opens the relevant chat
 * tab through `useWaouhMatchChats`.
 *
 * Returns `true` if the notification produced an actionable open, `false`
 * otherwise (caller may decide whether to still close a popover).
 */
export function openNotificationTarget(
  n: WaouhNotification,
  options: OpenNotificationOptions = {}
): boolean {
  const matchKind = getMatchKind(n.template);
  const isMatch = !!matchKind;
  const isPaymentRequest = n.template === "deal_payment_request" && (n.payload as any)?.deal_id;

  if (isPaymentRequest && options.onPayDialog) {
    options.beforeOpen?.();
    options.onPayDialog({
      dealId: (n.payload as any).deal_id,
      amount: (n.payload as any)?.amount,
    });
    return true;
  }

  if (isMatch && n.article_id) {
    options.beforeOpen?.();
    const counterpartId =
      (n.payload as any)?.counterpart_user_id ?? (n.payload as any)?.buyer_user_id ?? null;
    const correlationId = correlationIdFor(n.article_id, matchKind as any, counterpartId);
    traceUi({
      correlation_id: correlationId,
      stage: "ui_notification_click",
      article_id: n.article_id,
      role: matchKind as any,
      counterpart_user_id: counterpartId,
      notification_id: n.id,
      intent: n.template ?? null,
    });
    window.dispatchEvent(
      new CustomEvent("waouh:open-match-chat", {
        detail: {
          notification_id: n.id,
          seed_text: (n.payload as any)?.text ?? n.body ?? null,
          article_id: n.article_id,
          buyer_profile_id: (n.payload as any)?.buyer_profile_id ?? null,
          counterpart_user_id: counterpartId,
          correlation_id: correlationId,
          kind: matchKind,
          title: (n.payload as any)?.title,
          price: (n.payload as any)?.price,
          city: (n.payload as any)?.city,
          photo: n.image_url,
        },
      })
    );
    return true;
  }

  if (n.message_id || n.transaction_id) {
    options.beforeOpen?.();
    window.dispatchEvent(
      new CustomEvent("waouh:focus-message", {
        detail: { message_id: n.message_id, transaction_id: n.transaction_id },
      })
    );
    return true;
  }

  return false;
}
