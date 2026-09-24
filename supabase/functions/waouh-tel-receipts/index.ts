import {
  auditTel,
  createTelAdminClient,
  getTelSettings,
} from "../_shared/waouh-tel/config.ts";
import { sha256Hex } from "../_shared/waouh-tel/crypto.ts";
import {
  methodNotAllowed,
  telCorsHeaders,
  telError,
  telOk,
} from "../_shared/waouh-tel/http.ts";
import { verifyProviderWebhook } from "../_shared/waouh-tel/signature.ts";
import {
  nextMessageStatus,
  receiptOccurredAt,
  receiptOutboxLookup,
  receiptProviderStatus,
  receiptStatus,
} from "../_shared/waouh-tel/receipt-status.ts";

function items(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  const values = payload?.results || payload?.events || payload?.messages;
  return Array.isArray(values)
    ? values
    : payload && typeof payload === "object"
    ? [payload]
    : [];
}

async function processReceipts(payloadItems: any[]) {
  const admin = createTelAdminClient();
  const settings = await getTelSettings(admin);
  let accepted = 0;
  let ignored = 0;
  let failed = 0;
  let firstFailure = "";

  for (const item of payloadItems) {
    try {
      const providerMessageId = String(
        item?.messageId || item?.message_id || "",
      ).trim();
      if (!providerMessageId) {
        ignored += 1;
        continue;
      }
      const status = receiptStatus(item);
      if (!status) {
        ignored += 1;
        continue;
      }
      const providerEventId = String(
        item?.eventId || item?.event_id ||
          `${providerMessageId}:${status}:${
            receiptOccurredAt(item) ||
            await sha256Hex(JSON.stringify(item))
          }`,
      );
      const lookup = receiptOutboxLookup(item);
      if (!lookup) {
        ignored += 1;
        continue;
      }
      const { data: outbox, error: outboxError } = await admin.from(
        "waouh_tel_outbox",
      )
        .select("id,source_message_id,target_user_id,target_thread_id,status")
        .eq(lookup.column, lookup.value)
        .maybeSingle();
      if (outboxError) {
        throw new Error(`receipt_outbox_lookup_failed:${outboxError.message}`);
      }

      let sourceMessage: any = null;
      if (outbox?.source_message_id) {
        const { data, error } = await admin.from("waouh_tel_messages")
          .select("id,provider,status")
          .eq("id", outbox.source_message_id)
          .maybeSingle();
        if (error) {
          throw new Error(`receipt_message_lookup_failed:${error.message}`);
        }
        sourceMessage = data;
      }
      if (
        sourceMessage?.provider && sourceMessage.provider !== settings.provider
      ) {
        ignored += 1;
        await auditTel(admin, "delivery_receipt_provider_mismatch", {
          telUserId: outbox?.target_user_id,
          threadId: outbox?.target_thread_id,
          actorType: "provider",
          outcome: "denied",
          details: { configured_provider: settings.provider },
        });
        continue;
      }

      const occurredAt = receiptOccurredAt(item) || new Date().toISOString();
      const { error } = await admin.from("waouh_tel_receipts").insert({
        provider: settings.provider,
        provider_event_id: providerEventId,
        provider_message_id: providerMessageId,
        outbox_id: outbox?.id || null,
        message_id: outbox?.source_message_id || null,
        status,
        provider_status: receiptProviderStatus(item, status),
        provider_error: item?.error || null,
        occurred_at: occurredAt,
      });
      const duplicate = error?.code === "23505";
      if (error && !duplicate) {
        throw new Error(`receipt_insert_failed:${error.message}`);
      }

      if (sourceMessage?.id) {
        const nextStatus = nextMessageStatus(sourceMessage.status, status);
        if (nextStatus) {
          const { error: messageUpdateError } = await admin.from(
            "waouh_tel_messages",
          ).update({ status: nextStatus })
            .eq("id", sourceMessage.id).eq("status", sourceMessage.status);
          if (messageUpdateError) {
            throw new Error(
              `receipt_message_update_failed:${messageUpdateError.message}`,
            );
          }
        }
      }
      if (
        outbox?.id && ["failed", "expired", "rejected"].includes(status) &&
        !["delivered", "read"].includes(sourceMessage?.status)
      ) {
        const { error: outboxUpdateError } = await admin.from(
          "waouh_tel_outbox",
        ).update({
          status: "failed",
          last_error: `provider_${status}`,
        }).eq("id", outbox.id).in("status", ["processing", "retry", "sent"]);
        if (outboxUpdateError) {
          throw new Error(
            `receipt_outbox_update_failed:${outboxUpdateError.message}`,
          );
        }
      }
      await auditTel(admin, "delivery_receipt", {
        telUserId: outbox?.target_user_id,
        threadId: outbox?.target_thread_id,
        actorType: "provider",
        outcome: ["failed", "expired", "rejected"].includes(status)
          ? "failed"
          : "success",
        details: { channel: String(item?.channel || "").toLowerCase(), status },
      });
      if (duplicate) ignored += 1;
      else accepted += 1;
    } catch (error) {
      failed += 1;
      if (!firstFailure) {
        firstFailure = error instanceof Error ? error.message : String(error);
      }
      console.error("[waouh-tel-receipts] receipt failed", error);
    }
  }
  if (failed) {
    throw new Error(
      `receipt_batch_incomplete:${failed}:${firstFailure || "unknown"}`,
    );
  }
  return { accepted, ignored, durable: true };
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
  let payload: any;
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
  const payloadItems = items(payload);
  if (!payloadItems.length) {
    return telError(400, "no_receipts", "Aucun accusé valide.", undefined, req);
  }
  if (payloadItems.length > 200) {
    return telError(
      413,
      "batch_too_large",
      "Le webhook contient plus de 200 accusés. Aucun accusé n'a été traité.",
      { maximum: 200 },
      req,
    );
  }

  try {
    const result = await processReceipts(payloadItems);
    return telOk({ ...result, processing: "completed" }, 202, req);
  } catch (error) {
    return telError(
      500,
      "receipt_internal_error",
      "Impossible de traiter les accusés de réception.",
      error instanceof Error ? error.message : String(error),
      req,
    );
  }
});
