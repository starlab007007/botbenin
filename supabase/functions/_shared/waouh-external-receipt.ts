import { isServiceRoleRequest } from "./waouh-auth.ts";
import { constantTimeEqual } from "./waouh-tel/crypto.ts";
export function wahaReceiptStatus(payload: Record<string, unknown>) {
  const value = typeof payload.ack === "number"
    ? payload.ack
    : Number(payload.ack);
  const name = String(payload.ackName || "").toLowerCase();
  if (value === 3 || value === 4 || ["read", "played"].includes(name)) {
    return "read";
  }
  if (value === 2 || name === "delivered" || name === "device") {
    return "delivered";
  }
  if (value === 1 || name === "server" || name === "sent") return "sent";
  if (value === -1 || name === "error") return "failed";
  return null;
}
// New receipt writes require proof of provider origin, even on legacy webhooks.
export async function trustedWahaWebhook(
  sb: any,
  req: Request,
  session: string,
) {
  let trusted = isServiceRoleRequest(req);
  const secret = Deno.env.get("WAHA_WEBHOOK_SECRET");
  const header = req.headers.get("x-waouh-webhook-token") || "";
  if (secret && constantTimeEqual(secret, header)) trusted = true;
  const token = new URL(req.url).searchParams.get("token");
  if (!trusted && token && token.length >= 24) {
    const { data } = await sb
      .from("whatsapp_accounts")
      .select("webhook_url")
      .eq("session_name", session)
      .maybeSingle();
    if (data?.webhook_url) {
      try {
        const expected = new URL(data.webhook_url).searchParams.get("token");
        trusted = !!expected && constantTimeEqual(token, expected);
      } catch {
        /* Invalid stored URL cannot authorize a receipt. */
      }
    }
  }
  return trusted;
}
export async function acceptExternalReceipt(
  sb: any,
  req: Request,
  session: string,
  payload: any,
) {
  if (!await trustedWahaWebhook(sb, req, session)) return false;
  const id = typeof payload.id === "string"
    ? payload.id
    : payload.id?._serialized;
  const status = wahaReceiptStatus(payload);
  if (!id || !status) return false;
  const { error } = await sb.rpc("waouh_external_ack", {
    p_provider_message_id: id,
    p_status: status,
  });
  if (error) throw new Error("external_receipt_storage_failed");
  return true;
}
