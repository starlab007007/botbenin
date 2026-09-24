import { telRuntimeSecret } from "./runtime-secret.ts";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.49.8";
import type {
  CanonicalInboundEvent,
  WaouhAction,
  WaouhEngineReply,
  WaouhProduct,
} from "./types.ts";

const PAYMENT_RE =
  /\b(paiement|payer|payement|checkout|mobile\s*money|momo|stripe|kkiapay|fedapay|acheter\s+maintenant|ach[èe]te\s+maintenant|je\s+paie|je\s+paye)\b/i;

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function sanitizeEngineReply(raw: Record<string, any>): WaouhEngineReply {
  const products = asArray<WaouhProduct>(
    raw.products?.length ? raw.products : raw.results,
  ).slice(0, 10);
  const actions = asArray<WaouhAction>(raw.actions)
    .filter((action) => !PAYMENT_RE.test(JSON.stringify(action)))
    .slice(0, 11);
  const attachments = asArray<any>(raw.attachments)
    .map((attachment) =>
      typeof attachment === "string" ? { url: attachment } : attachment
    )
    .filter((attachment) =>
      attachment && typeof attachment.url === "string" &&
      /^https:\/\//i.test(attachment.url)
    )
    .slice(0, 10);
  let text = String(raw.reply || raw.text || "").trim();
  if (
    !text || PAYMENT_RE.test(String(raw.intent || "")) || PAYMENT_RE.test(text)
  ) {
    text =
      "Je peux vous aider à rechercher, comparer, suivre ou négocier un article. Les paiements ne sont pas disponibles dans WAOUH Messages.";
  }
  return {
    schema: "waouh.message.v1",
    text,
    intent: raw.intent || null,
    products,
    actions,
    attachments,
    raw,
  };
}

async function ensureEngineIdentity(admin: SupabaseClient, telUser: any) {
  if (telUser.engine_user_id) return telUser.engine_user_id as string;
  const sessionId = `tel:${telUser.id}`;
  const { data: existing } = await admin.from("waouh_users").select("id").eq(
    "web_session_id",
    sessionId,
  ).maybeSingle();
  let id = existing?.id as string | undefined;
  if (!id) {
    const { data, error } = await admin.from("waouh_users").insert({
      phone_number: null,
      web_session_id: sessionId,
      display_name: telUser.display_name || "Utilisateur WAOUH Messages",
      channel: "native_messaging",
      country: "BJ",
    }).select("id").single();
    if (error) {
      throw new Error(`engine_identity_create_failed:${error.message}`);
    }
    id = data.id;
  }
  await admin.from("waouh_tel_users").update({ engine_user_id: id }).eq(
    "id",
    telUser.id,
  );
  return id!;
}

export async function callWaouhEngine(
  admin: SupabaseClient,
  telUser: any,
  event: CanonicalInboundEvent,
): Promise<WaouhEngineReply> {
  if (PAYMENT_RE.test(event.text)) {
    return {
      schema: "waouh.message.v1",
      text:
        "WAOUH Messages ne réalise aucun paiement. Je peux rechercher, comparer, suivre les prix et vous mettre en relation avec un vendeur.",
      intent: "payment_unavailable",
      products: [],
      actions: [],
      attachments: [],
    };
  }
  await ensureEngineIdentity(admin, telUser);
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const internalSecret = await telRuntimeSecret("internal_secret");
  if (internalSecret.length < 24) {
    throw new Error("waouh_tel_internal_secret_missing");
  }
  const endpoint = Deno.env.get("WAOUH_TEL_ENGINE_URL") ||
    `${supabaseUrl}/functions/v1/waouh-webhook`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${internalSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source: "native_messaging",
      channel: "native_messaging",
      transport_channel: event.channel,
      phone_number: `web:tel:${telUser.id}`,
      web_session_id: `tel:${telUser.id}`,
      text: event.text,
      attachments: event.attachments,
      ...(event.location
        ? {
          lat: event.location.latitude,
          lng: event.location.longitude,
          city: event.location.label || "Cotonou",
        }
        : {}),
      meta: {
        schema: "waouh.tel.event.v1",
        provider_message_id: event.provider_message_id,
      },
    }),
    signal: AbortSignal.timeout(35_000),
  });
  const raw = await response.json().catch(() => null);
  if (!response.ok || !raw || typeof raw !== "object" || raw.error) {
    throw new Error(`waouh_engine_unavailable:${response.status}`);
  }
  return sanitizeEngineReply(raw as Record<string, any>);
}

export function controlledEngineFailure(): WaouhEngineReply {
  return {
    schema: "waouh.message.v1",
    text:
      "WAOUH rencontre un délai temporaire. Votre message est bien reçu. Réessayez dans quelques instants.",
    intent: "temporary_unavailable",
    products: [],
    actions: [],
    attachments: [],
  };
}