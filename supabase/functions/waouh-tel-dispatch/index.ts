import {
  auditTel,
  createTelAdminClient,
  getTelSettings,
  isInternalRequest,
} from "../_shared/waouh-tel/config.ts";
import { decryptPhone } from "../_shared/waouh-tel/crypto.ts";
import {
  clampInt,
  methodNotAllowed,
  telCorsHeaders,
  telError,
  telOk,
} from "../_shared/waouh-tel/http.ts";
import {
  chooseOutboundChannel,
  queryInfobipCapability,
  retryDelaySeconds,
  sendProviderMessage,
} from "../_shared/waouh-tel/provider.ts";
import { ensureSmsPayload } from "../_shared/waouh-tel/render-sms.ts";
import { drainInboundInbox } from "../_shared/waouh-tel/inbound-worker.ts";
import type { TelOutboundPayload } from "../_shared/waouh-tel/types.ts";

function validPayload(value: unknown): value is TelOutboundPayload {
  return Boolean(
    value && typeof value === "object" &&
      (value as any).schema === "waouh.tel.outbound.v1" &&
      typeof (value as any).text === "string" && (value as any).text.trim(),
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: telCorsHeaders(req) });
  }
  if (req.method !== "POST") return methodNotAllowed(req);
  if (!isInternalRequest(req)) {
    return telError(
      401,
      "internal_authorization_required",
      "Autorisation interne requise.",
      undefined,
      req,
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const limit = clampInt(body?.limit, 20, 1, 100);
    const inboxLimit = clampInt(body?.inbox_limit, 3, 1, 5);
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
    if (
      !settings.business_phone_e164 || settings.provider === "not_configured"
    ) {
      return telError(
        503,
        "provider_not_configured",
        "Le numéro ou le fournisseur n'est pas configuré.",
        undefined,
        req,
      );
    }

    const inbox = await drainInboundInbox(admin, settings, inboxLimit);

    const workerToken = `${
      Deno.env.get("DENO_DEPLOYMENT_ID") || "local"
    }:${crypto.randomUUID()}`;
    const { data: rows, error: claimError } = await admin.rpc(
      "waouh_tel_claim_outbox",
      { p_limit: limit, p_worker_token: workerToken },
    );
    if (claimError) {
      throw new Error(`outbox_claim_failed:${claimError.message}`);
    }
    const results: Array<Record<string, unknown>> = [];

    for (const row of rows || []) {
      try {
        if (!validPayload(row.payload)) {
          throw new Error("invalid_outbox_payload");
        }
        const [
          { data: user, error: userError },
          { data: consents, error: consentError },
          { data: existingCapability, error: capabilityError },
        ] = await Promise.all([
          admin.from("waouh_tel_users").select("*").eq("id", row.target_user_id)
            .single(),
          admin.from("waouh_tel_consents").select("channel,status").eq(
            "tel_user_id",
            row.target_user_id,
          ).eq("purpose", "conversation"),
          admin.from("waouh_tel_capabilities").select("*").eq(
            "tel_user_id",
            row.target_user_id,
          ).eq("provider", settings.provider).maybeSingle(),
        ]);
        if (userError || !user) {
          throw new Error(
            `target_user_missing:${userError?.message || "missing"}`,
          );
        }
        if (consentError) {
          throw new Error(`consent_lookup_failed:${consentError.message}`);
        }
        if (capabilityError) {
          throw new Error(
            `capability_lookup_failed:${capabilityError.message}`,
          );
        }
        if (
          !row.bypass_consent &&
          (user.status !== "active" ||
            !(consents || []).some((consent: any) =>
              consent.status === "active"
            ))
        ) {
          await admin.from("waouh_tel_outbox").update({
            status: "cancelled",
            last_error: "consent_inactive",
            locked_at: null,
            locked_by: null,
          }).eq("id", row.id).eq("locked_by", workerToken);
          results.push({
            id: row.id,
            status: "cancelled",
            reason: "consent_inactive",
          });
          continue;
        }
        const activeSms = (consents || []).some((consent: any) =>
          consent.status === "active" && consent.channel === "sms"
        );
        const activeRcs = (consents || []).some((consent: any) =>
          consent.status === "active" && consent.channel === "rcs"
        );
        const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
        const { count: recentOutbound, error: outboundCountError } = await admin
          .from("waouh_tel_outbox")
          .select("id", { count: "exact", head: true })
          .eq("target_user_id", user.id)
          .eq("status", "sent")
          .gte("sent_at", oneHourAgo);
        if (outboundCountError) {
          throw new Error(
            `outbound_rate_lookup_failed:${outboundCountError.message}`,
          );
        }
        if ((recentOutbound || 0) >= 60) {
          await admin.from("waouh_tel_outbox").update({
            status: "cancelled",
            last_error: "outbound_hourly_limit",
            locked_at: null,
            locked_by: null,
          }).eq("id", row.id).eq("locked_by", workerToken);
          results.push({
            id: row.id,
            status: "cancelled",
            reason: "outbound_hourly_limit",
          });
          continue;
        }
        const destination = await decryptPhone(user.phone_encrypted);
        let capability = existingCapability;
        const needsCapability = settings.rcs_enabled &&
          row.channel_preference !== "sms" &&
          (!capability || !capability.expires_at ||
            Date.parse(capability.expires_at) <= Date.now());
        if (needsCapability) {
          const checked = await queryInfobipCapability(settings, destination);
          const { data } = await admin.from("waouh_tel_capabilities").upsert({
            tel_user_id: user.id,
            provider: settings.provider,
            rcs_reachable: checked.reachable,
            supports_media: checked.reachable,
            supports_cards: checked.reachable,
            supports_carousel: checked.reachable,
            supports_typing: checked.reachable,
            supports_read_receipts: checked.reachable,
            raw_capabilities: checked.raw || {},
            checked_at: new Date().toISOString(),
            expires_at: new Date(
              Date.now() + (checked.reachable ? 7 : 1) * 86_400_000,
            ).toISOString(),
          }, { onConflict: "tel_user_id,provider" }).select("*").single();
          capability = data;
        }
        let channel = chooseOutboundChannel(
          row.channel_preference,
          settings,
          capability,
        );
        if (!channel) throw new Error("no_available_transport");
        if (
          !row.bypass_consent &&
          !(consents || []).some((consent: any) =>
            consent.status === "active" && consent.channel === channel
          )
        ) {
          if (activeSms && settings.sms_enabled) channel = "sms";
          else if (
            activeRcs && settings.rcs_enabled && capability?.rcs_reachable
          ) channel = "rcs";
          else throw new Error("channel_consent_inactive");
        }

        let sendResult = await sendProviderMessage({
          settings,
          destination,
          channel,
          payload: channel === "sms"
            ? ensureSmsPayload(row.payload)
            : row.payload,
          callbackData: row.id,
        });
        if (
          !sendResult.ok && channel === "rcs" && settings.fallback_to_sms &&
          settings.sms_enabled && (row.bypass_consent || activeSms)
        ) {
          await admin.from("waouh_tel_capabilities").update({
            rcs_reachable: false,
            checked_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 86_400_000).toISOString(),
          }).eq("tel_user_id", user.id).eq("provider", settings.provider);
          sendResult = await sendProviderMessage({
            settings,
            destination,
            channel: "sms",
            payload: ensureSmsPayload(row.payload),
            callbackData: row.id,
          });
        }

        if (sendResult.ok && sendResult.provider_message_id) {
          const now = new Date().toISOString();
          await admin.from("waouh_tel_outbox").update({
            status: "sent",
            provider_message_id: sendResult.provider_message_id,
            sent_at: now,
            last_error: null,
            locked_at: null,
            locked_by: null,
          }).eq("id", row.id).eq("locked_by", workerToken);
          if (row.source_message_id) {
            await admin.from("waouh_tel_messages").update({
              provider_message_id: sendResult.provider_message_id,
              channel: sendResult.channel,
              status: "sent",
            }).eq("id", row.source_message_id);
          }
          await admin.from("waouh_tel_receipts").upsert({
            provider: settings.provider,
            provider_event_id: `accepted:${row.id}:${row.attempts}`,
            provider_message_id: sendResult.provider_message_id,
            outbox_id: row.id,
            message_id: row.source_message_id,
            status: "accepted",
            provider_status: sendResult.status || "accepted",
            occurred_at: now,
          }, { onConflict: "provider,provider_event_id" });
          await auditTel(admin, "outbound_sent", {
            telUserId: user.id,
            threadId: row.target_thread_id,
            actorType: "worker",
            details: {
              provider: settings.provider,
              channel: sendResult.channel,
              dry_run: sendResult.status === "dry_run",
            },
          });
          results.push({
            id: row.id,
            status: "sent",
            channel: sendResult.channel,
            dry_run: sendResult.status === "dry_run",
          });
          continue;
        }

        const terminal = sendResult.retryable === false ||
          row.attempts >= row.max_attempts;
        await admin.from("waouh_tel_outbox").update({
          status: terminal ? "failed" : "retry",
          scheduled_at: terminal
            ? row.scheduled_at
            : new Date(Date.now() + retryDelaySeconds(row.attempts) * 1000)
              .toISOString(),
          last_error: (sendResult.error || "provider_send_failed").slice(
            0,
            500,
          ),
          locked_at: null,
          locked_by: null,
        }).eq("id", row.id).eq("locked_by", workerToken);
        if (row.source_message_id && terminal) {
          await admin.from("waouh_tel_messages").update({ status: "failed" })
            .eq("id", row.source_message_id);
        }
        results.push({ id: row.id, status: terminal ? "failed" : "retry" });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const terminal = row.attempts >= row.max_attempts;
        await admin.from("waouh_tel_outbox").update({
          status: terminal ? "failed" : "retry",
          scheduled_at: terminal
            ? row.scheduled_at
            : new Date(Date.now() + retryDelaySeconds(row.attempts) * 1000)
              .toISOString(),
          last_error: message.slice(0, 500),
          locked_at: null,
          locked_by: null,
        }).eq("id", row.id).eq("locked_by", workerToken);
        results.push({
          id: row.id,
          status: terminal ? "failed" : "retry",
          error: "dispatch_failed",
        });
      }
    }
    if ((rows || []).length >= limit || inbox.claimed >= inboxLimit) {
      const url = Deno.env.get("SUPABASE_URL");
      const internalSecret = Deno.env.get("WAOUH_TEL_INTERNAL_SECRET");
      if (url && internalSecret) {
        const next = fetch(`${url}/functions/v1/waouh-tel-dispatch`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${internalSecret}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            limit,
            inbox_limit: inboxLimit,
            source: "self_drain",
          }),
        }).catch((error) =>
          console.warn("[waouh-tel-dispatch] self-drain failed", error)
        );
        (globalThis as any).EdgeRuntime?.waitUntil?.(next);
      }
    }
    return telOk(
      {
        inbox,
        outbox: { claimed: (rows || []).length, results },
      },
      200,
      req,
    );
  } catch (error) {
    return telError(
      500,
      "dispatch_internal_error",
      "Impossible de traiter la file télécom.",
      error instanceof Error ? error.message : String(error),
      req,
    );
  }
});
