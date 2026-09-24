import { constantTimeEqual, hmacHex } from "./crypto.ts";

export async function verifyProviderWebhook(req: Request, rawBody: string) {
  const secret = Deno.env.get("WAOUH_TEL_WEBHOOK_SECRET") || "";
  if (secret.length < 24) {
    return { ok: false as const, reason: "webhook_secret_not_configured" };
  }

  const token = req.headers.get("x-waouh-tel-token") || "";
  if (token && constantTimeEqual(token, secret)) {
    return { ok: true as const, method: "token" };
  }

  const timestamp = req.headers.get("x-hub-timestamp");
  if (timestamp) {
    const numeric = Number(timestamp);
    const millis = Number.isFinite(numeric)
      ? (numeric > 10_000_000_000 ? numeric : numeric * 1000)
      : Date.parse(timestamp);
    if (
      !Number.isFinite(millis) || Math.abs(Date.now() - millis) > 5 * 60_000
    ) {
      return { ok: false as const, reason: "signature_timestamp_expired" };
    }
  }

  const supplied = (req.headers.get("x-hub-signature") ||
    req.headers.get("x-waouh-tel-signature") || "")
    .trim()
    .replace(/^sha256=/i, "")
    .toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(supplied)) {
    return { ok: false as const, reason: "signature_missing" };
  }
  const expected = await hmacHex(rawBody, secret);
  return constantTimeEqual(supplied, expected)
    ? { ok: true as const, method: "hmac-sha256" }
    : { ok: false as const, reason: "signature_invalid" };
}
