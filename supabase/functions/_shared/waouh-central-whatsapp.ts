// One explicitly authorized sender for NEXUS and Avatar external exchanges.
export const CENTRAL_WAHA_SESSION = "WaouhApp";
export const CENTRAL_WHATSAPP_PHONE = "22965653468";
export const CENTRAL_WAHA_EVENTS = [
  "message",
  "message.any",
  "message.ack",
  "session.status",
];
export function isCentralWhatsAppPhone(value: unknown) {
  const phone = String(value || "").split("@")[0].replace(/\D/g, "");
  return [CENTRAL_WHATSAPP_PHONE, "2290165653468"].includes(phone);
}
export function whatsAppPhoneCandidates(value: unknown) {
  const digits = String(value || "").split("@")[0].replace(/\D/g, "").replace(/^00/, "");
  if (!/^[1-9]\d{7,14}$/.test(digits)) return [];
  if (/^22901\d{8}$/.test(digits)) return [digits, `229${digits.slice(5)}`];
  if (/^229\d{8}$/.test(digits)) return [digits, `22901${digits.slice(3)}`];
  return [digits];
}
export function isWahaInbound(event: unknown, payload: any) {
  return ["message", "message.any"].includes(String(event)) &&
    payload?.fromMe === false &&
    typeof payload?.from === "string" &&
    !/@g\.us$|@broadcast$/.test(payload.from);
}
export function wahaMessageId(payload: any) {
  return [payload?.id, payload?.id?._serialized, payload?.messageId, payload?._data?.id?._serialized]
    .find((value) => typeof value === "string" && value.trim()) || null;
}
export function centralWebhookConfig(
  previous: any,
  supabaseUrl: string,
  secret: string,
) {
  if (secret.length < 24) throw new Error("central_webhook_secret_required");
  const url = `${supabaseUrl}/functions/v1/waha-webhook`;
  const webhooks = (Array.isArray(previous?.webhooks) ? previous.webhooks : [])
    .filter((hook: any) =>
      !/\/functions\/v1\/(waha-webhook|waha-studio-webhook|waouh-channel-in)(?:[?/#]|$)/
        .test(String(hook?.url || ""))
    );
  return {
    ...previous,
    webhooks: [...webhooks, {
      url,
      events: CENTRAL_WAHA_EVENTS,
      customHeaders: [{ name: "x-waouh-webhook-token", value: secret }],
    }],
  };
}
export function centralSessionSummary(data: any) {
  const hook = data?.config?.webhooks?.find((h: any) =>
    /\/functions\/v1\/waha-webhook(?:[?/#]|$)/.test(h.url || "")
  );
  return {
    session: CENTRAL_WAHA_SESSION,
    status: data?.status || "UNKNOWN",
    expected_phone: "+229 65653468",
    identity_matches: isCentralWhatsAppPhone(data?.me?.id),
    webhook_ready:
      CENTRAL_WAHA_EVENTS.every((event) => hook?.events?.includes(event)) &&
      !!hook?.customHeaders?.some((h: any) =>
        h.name === "x-waouh-webhook-token" && String(h.value || "").length >= 24
      ),
  };
}
// WEBJS can report WORKING after its injected WhatsApp client has failed.
// Reading the central account contact detects this condition without sending a message.
export async function centralProviderOperational(base: string, apiKey: string, data: any) {
  const engine = String(data?.engine?.engine || data?.engine || "").toUpperCase();
  if (engine !== "WEBJS") return true;
  try {
    if (!data?.me?.id) return false;
    const query = new URLSearchParams({session:CENTRAL_WAHA_SESSION,contactId:data.me.id});
    const response = await fetch(`${base.replace(/\/$/, "")}/api/contacts?${query}`, {
      headers: {"X-Api-Key":apiKey}, signal:AbortSignal.timeout(5000),
    });
    await response.body?.cancel();
    return response.ok;
  } catch { return false; }
}

let cachedHealth: {
  until: number;
  result: { working: boolean; status: string };
} | undefined;
let pendingHealth: Promise<{ working: boolean; status: string }> | undefined;
export async function centralWhatsAppHealth() {
  if (cachedHealth && cachedHealth.until > Date.now()) {
    return cachedHealth.result;
  }
  if (pendingHealth) return pendingHealth;
  pendingHealth = (async () => {
    let result = { working: false, status: "UNAVAILABLE" };
    try {
      const base = Deno.env.get("WAHA_BASE_URL") || "";
      if (base) {
        const response = await fetch(
          `${base.replace(/\/$/, "")}/api/sessions/${CENTRAL_WAHA_SESSION}`,
          {
            headers: { "X-Api-Key": Deno.env.get("WAHA_API_KEY") || "" },
            signal: AbortSignal.timeout(5000),
          },
        );
        if (response.ok) {
          const data = await response.json();
          result = {
            working: data.status === "WORKING" &&
              isCentralWhatsAppPhone(data.me?.id) &&
              await centralProviderOperational(base, Deno.env.get("WAHA_API_KEY") || "", data),
            status: data.status || "UNKNOWN",
          };
          if (data.status === "WORKING" && !result.working) result.status = "DEGRADED";
        }
      }
    } catch { /* A failed provider cannot be presented as connected. */ }
    cachedHealth = { until: Date.now() + 15000, result };
    return result;
  })();
  try {
    return await pendingHealth;
  } finally {
    pendingHealth = undefined;
  }
}
