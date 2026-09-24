import { providerPhone } from "./phone.ts";
import { segmentSms } from "./render-sms.ts";
import type {
  ProviderSendResult,
  TelChannel,
  TelOutboundPayload,
  TelSettings,
  WaouhProduct,
} from "./types.ts";

type Capability =
  | { rcs_reachable?: boolean; expires_at?: string | null }
  | null;

export function chooseOutboundChannel(
  preference: "auto" | "sms" | "rcs",
  settings: Pick<
    TelSettings,
    "sms_enabled" | "rcs_enabled" | "fallback_to_sms"
  >,
  capability: Capability,
): TelChannel | null {
  const rcsUsable = settings.rcs_enabled &&
    Boolean(capability?.rcs_reachable) &&
    (!capability?.expires_at || Date.parse(capability.expires_at) > Date.now());
  if (preference === "sms") return settings.sms_enabled ? "sms" : null;
  if (preference === "rcs") {
    if (rcsUsable) return "rcs";
    return settings.fallback_to_sms && settings.sms_enabled ? "sms" : null;
  }
  if (rcsUsable) return "rcs";
  return settings.sms_enabled ? "sms" : null;
}

function firstProductImage(product: WaouhProduct | undefined) {
  return product?.photos?.find((url) => /^https:\/\//i.test(url)) ||
    (product?.image_url && /^https:\/\//i.test(product.image_url)
      ? product.image_url
      : null);
}

export function infobipSmsRequest(
  settings: TelSettings,
  destination: string,
  payload: TelOutboundPayload,
  callbackData: string,
) {
  return {
    messages: segmentSms(payload.text).map((text) => ({
      sender: providerPhone(
        settings.business_phone_e164 || settings.rcs_sender_name,
      ),
      destinations: [{ to: providerPhone(destination) }],
      content: { text },
      callbackData,
    })),
  };
}

export function infobipRcsRequest(
  settings: TelSettings,
  destination: string,
  payload: TelOutboundPayload,
  callbackData: string,
) {
  const suggestions = (payload.actions || []).slice(0, 11).map(
    (action, index) => {
      const text = (action.label || action.title || `Choix ${index + 1}`).slice(
        0,
        25,
      );
      const postbackData = action.value || action.id || String(index + 1);
      return action.url && /^https?:\/\//i.test(action.url)
        ? { type: "OPEN_URL", text, url: action.url, postbackData }
        : { type: "REPLY", text, postbackData };
    },
  );
  const products = (payload.products || []).slice(0, 10);
  const cardContent = (product: WaouhProduct, index: number) => {
    const image = firstProductImage(product);
    const price = product.price == null
      ? "Prix à discuter"
      : `${Number(product.price).toLocaleString("fr-FR")} ${
        product.currency || "XOF"
      }`;
    const productSuggestions = [
      ...(product.source_url && /^https?:\/\//i.test(product.source_url)
        ? [{
          type: "OPEN_URL",
          text: "Voir",
          url: product.source_url,
          postbackData: `product:${product.id || index + 1}`,
        }]
        : []),
      {
        type: "REPLY",
        text: `Choisir ${index + 1}`,
        postbackData: String(index + 1),
      },
    ].slice(0, 4);
    return {
      title: (product.title || `Article ${index + 1}`).slice(0, 200),
      description: [price, product.city, product.description].filter(Boolean)
        .join(" • ").slice(0, 2000),
      ...(image ? { media: { file: { url: image }, height: "MEDIUM" } } : {}),
      suggestions: productSuggestions,
    };
  };

  let content: Record<string, unknown>;
  if (products.length >= 2) {
    content = {
      type: "CAROUSEL",
      cardWidth: "MEDIUM",
      contents: products.map(cardContent),
      ...(suggestions.length ? { suggestions: suggestions.slice(0, 3) } : {}),
    };
  } else if (
    products.length === 1 ||
    payload.attachments?.some((item) => /^https:\/\//i.test(item.url))
  ) {
    const product = products[0] ||
      {
        title: "WAOUH",
        description: payload.text,
        photos: [
          payload.attachments!.find((item) => /^https:\/\//i.test(item.url))!
            .url,
        ],
      };
    const card = cardContent(product, 0);
    content = {
      type: "CARD",
      orientation: "VERTICAL",
      alignment: "LEFT",
      content: {
        ...card,
        description: payload.text.slice(0, 2000),
        suggestions: suggestions.length
          ? suggestions.slice(0, 4)
          : card.suggestions,
      },
    };
  } else {
    content = {
      type: "TEXT",
      text: payload.text.slice(0, 3072),
      ...(suggestions.length ? { suggestions } : {}),
    };
  }

  return {
    messages: [{
      sender: settings.rcs_sender_name,
      destinations: [{ to: providerPhone(destination) }],
      content,
      callbackData,
    }],
  };
}

async function postInfobip(path: string, body: unknown) {
  const baseUrl = (Deno.env.get("WAOUH_TEL_INFOBIP_BASE_URL") || "").replace(
    /\/$/,
    "",
  );
  const apiKey = Deno.env.get("WAOUH_TEL_INFOBIP_API_KEY") || "";
  if (!/^https:\/\//i.test(baseUrl) || !apiKey) {
    throw new Error("infobip_credentials_not_configured");
  }
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      Authorization: `App ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

export function infobipRcsEventRequest(
  settings: Pick<TelSettings, "rcs_sender_name">,
  destination: string,
  inboundMessageId: string,
) {
  const target = [{ to: providerPhone(destination) }];
  return {
    events: [
      {
        sender: settings.rcs_sender_name,
        destinations: target,
        content: { messageId: inboundMessageId, type: "SEEN" },
      },
      {
        sender: settings.rcs_sender_name,
        destinations: target,
        content: { type: "TYPING_INDICATOR" },
      },
    ],
  };
}

/**
 * Best-effort RCS conversation indicators. Infobip documents these events on
 * POST /rcs/1/events. A failure must never block ingestion or SMS fallback.
 */
export async function sendInfobipRcsConversationEvents(
  settings: TelSettings,
  destination: string,
  inboundMessageId: string,
) {
  if (settings.provider === "test") return { ok: true, dry_run: true };
  if (
    settings.provider !== "infobip" || !settings.rcs_enabled ||
    !inboundMessageId
  ) {
    return { ok: false, skipped: true };
  }
  const path = Deno.env.get("WAOUH_TEL_INFOBIP_RCS_EVENTS_PATH") ||
    "/rcs/1/events";
  const { response, data } = await postInfobip(
    path,
    infobipRcsEventRequest(settings, destination, inboundMessageId),
  );
  if (!response.ok) {
    throw new Error(`Infobip RCS events HTTP ${response.status}`);
  }
  return { ok: true, raw: data };
}

export async function queryInfobipCapability(
  settings: TelSettings,
  destination: string,
) {
  if (settings.provider === "test") {
    return { reachable: settings.rcs_enabled, raw: { dry_run: true } };
  }
  if (settings.provider !== "infobip" || !settings.rcs_enabled) {
    return { reachable: false, raw: null };
  }
  const path = Deno.env.get("WAOUH_TEL_INFOBIP_CAPABILITY_PATH") ||
    "/rcs/2/capability-check/query";
  try {
    const { response, data } = await postInfobip(path, {
      sender: settings.rcs_sender_name,
      phoneNumbers: [providerPhone(destination)],
    });
    if (!response.ok) {
      return {
        reachable: false,
        raw: data,
        error: `Infobip HTTP ${response.status}`,
      };
    }
    const item = data?.capabilityCheckResults?.[0] || data?.results?.[0] ||
      null;
    return {
      reachable:
        String(item?.code || item?.status || "").toUpperCase() === "ENABLED",
      raw: data,
    };
  } catch (error) {
    return {
      reachable: false,
      raw: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function extractProviderMessageId(data: any) {
  return data?.messages?.[0]?.messageId || data?.messages?.[0]?.message_id ||
    data?.messageId || data?.bulkId || null;
}

export async function sendProviderMessage(options: {
  settings: TelSettings;
  destination: string;
  channel: TelChannel;
  payload: TelOutboundPayload;
  callbackData: string;
}): Promise<ProviderSendResult> {
  if (options.settings.provider === "test") {
    return {
      ok: true,
      provider_message_id: `test-${crypto.randomUUID()}`,
      channel: options.channel,
      status: "dry_run",
      raw: { dry_run: true },
    };
  }
  if (options.settings.provider !== "infobip") {
    return {
      ok: false,
      channel: options.channel,
      retryable: false,
      error: "provider_not_configured",
    };
  }

  try {
    const isRcs = options.channel === "rcs";
    const path = isRcs
      ? (Deno.env.get("WAOUH_TEL_INFOBIP_RCS_PATH") || "/rcs/2/messages")
      : (Deno.env.get("WAOUH_TEL_INFOBIP_SMS_PATH") || "/sms/3/messages");
    const body = isRcs
      ? infobipRcsRequest(
        options.settings,
        options.destination,
        options.payload,
        options.callbackData,
      )
      : infobipSmsRequest(
        options.settings,
        options.destination,
        options.payload,
        options.callbackData,
      );
    const { response, data } = await postInfobip(path, body);
    if (!response.ok) {
      const detail =
        typeof data?.requestError?.serviceException?.text === "string"
          ? data.requestError.serviceException.text
          : `Infobip HTTP ${response.status}`;
      return {
        ok: false,
        channel: options.channel,
        retryable: response.status === 429 || response.status >= 500,
        error: detail,
        raw: data,
      };
    }
    const providerMessageId = extractProviderMessageId(data);
    if (!providerMessageId) {
      return {
        ok: false,
        channel: options.channel,
        retryable: true,
        error: "infobip_missing_message_id",
        raw: data,
      };
    }
    return {
      ok: true,
      provider_message_id: String(providerMessageId),
      channel: options.channel,
      status: "accepted",
      raw: data,
    };
  } catch (error) {
    return {
      ok: false,
      channel: options.channel,
      retryable: true,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function retryDelaySeconds(attempt: number) {
  return Math.min(3600, Math.max(15, 15 * (2 ** Math.max(0, attempt - 1)))) +
    Math.floor(Math.random() * 10);
}
