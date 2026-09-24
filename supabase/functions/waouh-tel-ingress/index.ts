import {
  createTelAdminClient,
  getTelSettings,
} from "../_shared/waouh-tel/config.ts";
import { parseInboundEvents } from "../_shared/waouh-tel/canonical-event.ts";
import {
  encryptSensitiveJson,
  hashPhone,
  sha256Hex,
} from "../_shared/waouh-tel/crypto.ts";
import {
  methodNotAllowed,
  telCorsHeaders,
  telError,
  telJson,
} from "../_shared/waouh-tel/http.ts";
import { inboundRecipientMatches } from "../_shared/waouh-tel/inbound-worker.ts";
import { telRuntimeSecret } from "../_shared/waouh-tel/runtime-secret.ts";
import { verifyProviderWebhook } from "../_shared/waouh-tel/signature.ts";

async function triggerDispatch() {
  const url = Deno.env.get("SUPABASE_URL");
  const internalSecret = await telRuntimeSecret("internal_secret");
  if (!url || !internalSecret || internalSecret.length < 24) return;
  const promise = fetch(`${url}/functions/v1/${Deno.env.get("WAOUH_TEL_DISPATCH_FUNCTION") || "waouh-e2e-test"}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${internalSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ limit: 50, inbox_limit: 3, source: "ingress" }),
  }).catch((error) =>
    console.warn("[waouh-tel-ingress] dispatch trigger failed", error)
  );
  const runtime = (globalThis as any).EdgeRuntime;
  if (runtime?.waitUntil) runtime.waitUntil(promise);
  else void promise;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: telCorsHeaders(req) });
  }
  if (req.method !== "POST") return methodNotAllowed(req);

  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > 1_000_000) {
    return telError(
      413,
      "payload_too_large",
      "Le webhook dépasse 1 Mo.",
      undefined,
      req,
    );
  }
  const rawBody = await req.text();
  if (rawBody.length > 1_000_000) {
    return telError(
      413,
      "payload_too_large",
      "Le webhook dépasse 1 Mo.",
      undefined,
      req,
    );
  }
  const signature = await verifyProviderWebhook(req, rawBody);
  if (!signature.ok) {
    return telError(
      401,
      "invalid_webhook_signature",
      "Signature du fournisseur invalide.",
      { reason: signature.reason },
      req,
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return telError(
      400,
      "invalid_json",
      "Corps JSON invalide.",
      undefined,
      req,
    );
  }

  try {
    const admin = createTelAdminClient();
    const settings = await getTelSettings(admin);
    if (!settings.enabled) {
      return telError(
        503,
        "native_messaging_disabled",
        "WAOUH Native Messaging est désactivé.",
        undefined,
        req,
      );
    }
    if (settings.provider === "not_configured") {
      return telError(
        503,
        "provider_not_configured",
        "Aucun fournisseur SMS/RCS n'est configuré.",
        undefined,
        req,
      );
    }

    const { events, rejected } = await parseInboundEvents(payload, {
      provider: settings.provider,
      defaultCountryCode: settings.default_country_code,
    });
    if (events.length + rejected.length > 25) {
      return telError(
        413,
        "batch_too_large",
        "Le webhook contient plus de 25 événements. Aucun événement n'a été traité.",
        { maximum: 25 },
        req,
      );
    }
    if (
      !events.length && rejected.length &&
      rejected.every((item) => item.reason === "ignored_typing_indicator")
    ) {
      return telJson(
        {
          ok: true,
          data: {
            accepted: 0,
            ignored: rejected.length,
            durable: true,
            processing: "completed",
          },
        },
        202,
        {},
        req,
      );
    }
    if (!events.length) {
      return telError(
        400,
        "no_inbound_message",
        "Aucun message entrant valide.",
        { rejected },
        req,
      );
    }

    const acceptedEvents = events.filter((event) =>
      inboundRecipientMatches(event, settings)
    );
    const recipientRejected = events.length - acceptedEvents.length;
    if (!acceptedEvents.length) {
      return telError(
        400,
        "recipient_mismatch",
        "Le destinataire du webhook ne correspond pas au numéro ou au sender WAOUH.",
        { rejected: recipientRejected },
        req,
      );
    }

    const durableEvents = await Promise.all(
      acceptedEvents.map(async (event) => ({
        provider: event.provider,
        provider_event_id: event.provider_event_id,
        payload_hash: await sha256Hex(JSON.stringify(event.raw)),
        sender_hash: await hashPhone(event.sender),
        payload_encrypted: await encryptSensitiveJson(event),
      })),
    );
    const { data: queued, error: enqueueError } = await admin.rpc(
      "waouh_tel_enqueue_events",
      { p_events: durableEvents },
    );
    if (enqueueError) {
      throw new Error(`inbox_enqueue_failed:${enqueueError.message}`);
    }
    await triggerDispatch();
    return telJson(
      {
        ok: true,
        data: {
          accepted: acceptedEvents.length,
          queued: Number(queued || 0),
          duplicates: Math.max(0, acceptedEvents.length - Number(queued || 0)),
          ignored: rejected.length + recipientRejected,
          durable: true,
          processing: "queued",
        },
      },
      202,
      {},
      req,
    );
  } catch (error) {
    return telError(
      500,
      "ingress_internal_error",
      "Impossible de conserver le webhook de façon durable.",
      error instanceof Error ? error.message : String(error),
      req,
    );
  }
});