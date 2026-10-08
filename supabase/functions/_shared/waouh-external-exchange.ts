import { CENTRAL_WAHA_SESSION, centralWhatsAppHealth } from "./waouh-central-whatsapp.ts";
import { planAvatarNegotiation } from "./waouh-avatar-lifecycle.ts";
// deno-lint-ignore-file no-explicit-any
import { sha256Hex, decryptPhone, hashPhone } from "./waouh-tel/crypto.ts";
import { normalizeE164 } from "./waouh-tel/phone.ts";
import { enqueueTelMessage } from "./waouh-tel/db.ts";
import {
  avatarNotice,
  revokeAvatarContacts,
  requestAvatarApproval,
} from "./waouh-avatar-orchestrator.ts";

export class ExchangeError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function isExternalExchangeAction(action: string) {
  const operations = [
    "read",
    "message",
    "propose",
    "accept",
    "shipment",
    "receipt",
    "payment",
    "payment_received",
    "stop",
  ];
  return (
    operations.some(
      (op) =>
        action === `nexus.guest.${op}` || action === `nexus.external.${op}`,
    ) || ["nexus.external.invite", "nexus.external.revoke"].includes(action)
  );
}
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function exchangeUuid(value: unknown) {
  if (typeof value !== "string" || !uuidPattern.test(value))
    throw new ExchangeError(422, "invalid_exchange_reference");
  return value;
}
export function exchangeText(value: unknown, max = 2000) {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new ExchangeError(422, "invalid_exchange_message");
  return value.trim();
}
export function exchangeTerms(value: any) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !Number.isInteger(value.amount) ||
    value.amount <= 0 ||
    value.amount > 1e12 ||
    !Number.isInteger(value.quantity) ||
    value.quantity < 1 ||
    value.quantity > 1e6
  )
    throw new ExchangeError(422, "invalid_exchange_terms");
  return {
    amount: value.amount,
    quantity: value.quantity,
    currency: "XOF",
    delivery: exchangeText(value.delivery, 300),
    payment: exchangeText(value.payment, 200),
  };
}
const check = (result: any) => {
  if (result.error) throw new ExchangeError(500, "exchange_storage_failed");
  return result.data;
};
export async function createExchangeInvite(sb: any, journey: any) {
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) =>
    n.toString(16).padStart(2, "0"),
  ).join("");
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + 7 * 86400_000).toISOString();
  check(
    await sb.from("waouh_external_invites").insert({
      journey_id: journey.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
    }),
  );
  return { url: `https://bot.bj/exchange#${token}`, expires_at: expiresAt };
}
export async function appendExternalReply(
  sb: any,
  journey: any,
  text: string,
  channel: string,
  reference: string,
) {
  const { error } = await sb.rpc("waouh_append_conversation_bus_event", {
    p_owner_id: journey.owner_id,
    p_journey_id: journey.id,
    p_fabric_id: journey.fabric_id,
    p_mandate_id: journey.mandate_id ?? null,
    p_thread_id: journey.thread_id ?? null,
    p_article_id: journey.article_id ?? null,
    p_event_type: "nexus.external.message",
    p_direction: "in",
    p_channel: channel,
    p_external_ref: `inbound:${channel}:${reference}:${journey.id}`,
    p_payload: {
      role: "counterparty",
      text: String(text).slice(0, 2000),
      operation: "message",
    },
  });
  if (error) throw new Error("external_reply_record_failed");
  check(await sb.from("waouh_opportunity_journeys").update({ last_response_at: new Date().toISOString(),
    last_activity_at: new Date().toISOString(), last_action: "external_reply_received",
    next_action: "Examiner la réponse et préciser les conditions" }).eq("id",journey.id));
  wakeExternalAvatar(journey);
}
export function wakeExternalAvatar(journey: any) {
  if (!journey.mandate_id) return;
  const task = fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/waouh-e2e-v3-relay`, {
    method: "POST", headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ advance_only: true, journey_id: journey.id }), signal: AbortSignal.timeout(20000),
  }).catch(() => undefined);
  (globalThis as any).EdgeRuntime?.waitUntil(task);
}
async function journeyForOwner(sb: any, owner: string, id: unknown) {
  const journey = check(
    await sb
      .from("waouh_opportunity_journeys")
      .select("*")
      .eq("id", exchangeUuid(id))
      .eq("owner_id", owner)
      .maybeSingle(),
  );
  if (!journey || !journey.fabric_id.startsWith("external:"))
    throw new ExchangeError(404, "exchange_not_found");
  return journey;
}
async function guestJourney(sb: any, token: unknown) {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token))
    throw new ExchangeError(404, "invite_unavailable");
  const invite = check(
    await sb
      .from("waouh_external_invites")
      .select("id,journey_id")
      .eq("token_hash", await sha256Hex(token))
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle(),
  );
  if (!invite) throw new ExchangeError(404, "invite_unavailable");
  const journey = check(
    await sb
      .from("waouh_opportunity_journeys")
      .select("*")
      .eq("id", invite.journey_id)
      .maybeSingle(),
  );
  if (!journey) throw new ExchangeError(404, "invite_unavailable");
  return { journey, invite };
}
async function contactsFor(sb: any, journey: any) {
  const signal = check(
    await sb
      .from("waouh_external_commerce_signals")
      .select("entity_id,contactability_level")
      .eq("id", journey.fabric_id.slice(9))
      .maybeSingle(),
  );
  if (!signal?.entity_id) return [];
  return (
    check(
      await sb
        .from("waouh_entity_contacts")
        .select("*")
        .eq("entity_id", signal.entity_id)
        .neq("consent_state", "revoked")
        .order("contactability_level", { ascending: false }),
    ) ?? []
  );
}
async function availableRoutes(sb: any, journey: any) {
  const contacts = await contactsFor(sb, journey);
  const { data: settings } = await sb
    .from("waouh_tel_settings")
    .select("enabled,provider,sms_enabled,rcs_enabled,dry_run")
    .eq("key", "default")
    .maybeSingle();
  const usable = contacts.filter(
    (c: any) =>
      c.value_encrypted &&
      ["C1", "C2", "C3", "C4", "C5"].includes(c.contactability_level) &&
      (c.contactability_level !== "C1" ||
        c.is_public_business === true ||
        c.consent_state === "public_business"),
  );
  const phone = usable.find((c: any) =>
    ["whatsapp", "phone"].includes(c.channel),
  );
  const routes: any[] = [
    {
      channel: "guest",
      available: true,
      label: "Lien invité · sans installation",
    },
  ];
  const centralHealth = phone && Deno.env.get("WAHA_BASE_URL") ? await centralWhatsAppHealth() : null;
  routes.push({
    channel: "whatsapp",
    available:
      !!phone &&
      !!Deno.env.get("WAHA_BASE_URL") &&
      centralHealth?.working === true &&
      phone.is_whatsapp_reachable !== false,
    label: "WhatsApp · WAOUH",
    reason: !phone
      ? "Aucun téléphone autorisé"
      : phone.is_whatsapp_reachable === false
        ? "WhatsApp indisponible pour ce contact"
        : !Deno.env.get("WAHA_BASE_URL")
          ? "Fournisseur non configuré"
          : !centralHealth?.working ? "WhatsApp central à reconnecter ou momentanément indisponible" : null,
  });
  routes.push({
    channel: "email",
    available:
      !!usable.find((c: any) => c.channel === "email") &&
      !!Deno.env.get("RESEND_API_KEY") &&
      !!Deno.env.get("WAOUH_EMAIL_FROM"),
    label: "E-mail · réponse via le lien invité",
    reason: "Adresse autorisée et fournisseur configuré nécessaires",
  });
  let nativeUser: any = null;
  if (phone) {
    const number = normalizeE164(await decryptPhone(phone.value_encrypted));
    if (number) {
      const response = await sb
        .from("waouh_tel_users")
        .select("id,status")
        .eq("phone_hash", await hashPhone(number))
        .maybeSingle();
      nativeUser = response.data;
    }
  }
  const nativeConsents = nativeUser
    ? ((
        await sb
          .from("waouh_tel_consents")
          .select("channel,status")
          .eq("tel_user_id", nativeUser.id)
          .eq("purpose", "conversation")
      ).data ?? [])
    : [];
  const capability = nativeUser
    ? (
        await sb
          .from("waouh_tel_capabilities")
          .select("rcs_reachable,expires_at")
          .eq("tel_user_id", nativeUser.id)
          .maybeSingle()
      ).data
    : null;
  for (const channel of ["sms", "rcs"])
    routes.push({
      channel,
      available:
        !!settings?.enabled &&
        settings.dry_run !== true &&
        settings.provider !== "not_configured" &&
        settings[`${channel}_enabled`] === true &&
        nativeUser?.status === "active" &&
        nativeConsents.some(
          (c: any) => c.channel === channel && c.status === "active",
        ) &&
        (channel !== "rcs" ||
          (capability?.rcs_reachable === true &&
            (!capability.expires_at ||
              Date.parse(capability.expires_at) > Date.now()))),
      label: channel.toUpperCase(),
      reason: "Fournisseur actif et consentement du destinataire nécessaires",
    });
  return { routes, usable, phone, nativeUser };
}
async function snapshot(sb: any, journey: any, guest: boolean) {
  const [events, agreement, queued] = await Promise.all([
    sb
      .from("waouh_conversation_bus_events")
      .select("id,event_type,channel,direction,payload,created_at,external_ref")
      .eq("journey_id", journey.id)
      .in("event_type", ["nexus.external.message", "nexus.external.delivery"])
      .order("created_at", { ascending: false })
      .limit(100),
    sb
      .from("waouh_external_agreements")
      .select("*")
      .eq("journey_id", journey.id)
      .is("superseded_at", null)
      .maybeSingle(),
    sb
      .from("waouh_outbound_queue")
      .select("id,status,payload,created_at,sent_at")
      .eq("payload->>journey_id", journey.id)
      .eq("template", "nexus_discovery_outreach")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  const messages: any[] = (check(events) ?? [])
    .filter((e: any) => e.event_type === "nexus.external.message")
    .reverse()
    .map((e: any) => ({
      id: e.id,
      channel: e.channel,
      role: e.payload.role,
      text: e.payload.text || "",
      operation: e.payload.operation || "message",
      terms: e.payload.terms,
      created_at: e.created_at,
      status:
        e.payload.delivery_status ||
        (e.channel === "guest" ? "recorded" : "received"),
    }));
  const known = new Set(
    (events.data ?? []).map((e: any) => e.payload.request_id).filter(Boolean),
  );
  for (const row of check(queued) ?? []) {
    if (known.has(row.payload?.request_id)) {
      const found = messages.find(
        (m) =>
          m.id ===
          (events.data ?? []).find(
            (e: any) => e.payload.request_id === row.payload.request_id,
          )?.id,
      );
      if (found)
        found.status =
          (events.data ?? []).find(
            (e: any) =>
              e.event_type === "nexus.external.delivery" &&
              e.payload.queue_id === row.id,
          )?.payload.delivery_status || row.status;
    } else
      messages.push({
        id: row.id,
        channel: "whatsapp",
        role: "owner",
        text: String(row.payload?.text || "").replace(
          /https:\/\/bot\.bj\/exchange#[a-f0-9]{64}/g,
          "[Lien invité]",
        ),
        created_at: row.created_at,
        status:
          (events.data ?? []).find(
            (e: any) =>
              e.event_type === "nexus.external.delivery" &&
              e.payload.queue_id === row.id,
          )?.payload.delivery_status || row.status,
        operation: "message",
      });
  }
  const native = await sb
    .from("waouh_tel_outbox")
    .select("id,status,dedupe_key,payload,created_at,channel_preference")
    .eq("payload->>journey_id", journey.id)
    .order("created_at", { ascending: false })
    .limit(100);
  const nativeRows = check(native) ?? [];
  const receipts = nativeRows.length
    ? (check(
        await sb
          .from("waouh_tel_receipts")
          .select("outbox_id,status,provider_status,occurred_at")
          .in(
            "outbox_id",
            nativeRows.map((r: any) => r.id),
          )
          .order("occurred_at", { ascending: false }),
      ) ?? [])
    : [];
  for (const row of nativeRows) {
    const event = (events.data ?? []).find(
      (e: any) => e.external_ref === row.dedupe_key,
    );
    const receipt = receipts.find((r: any) => r.outbox_id === row.id);
    const status =
      receipt?.provider_status === "dry_run"
        ? "simulation"
        : receipt?.status || row.status;
    const found = messages.find((m) => m.id === event?.id);
    if (found) found.status = status;
    else
      messages.push({
        id: row.id,
        role: "owner",
        channel: row.channel_preference || "sms/rcs",
        text: String(row.payload?.text || "").replace(
          /https:\/\/bot\.bj\/exchange#[a-f0-9]{64}/g,
          "[Lien invité]",
        ),
        created_at: row.created_at,
        status,
        operation: "message",
      });
  }
  messages.sort((a, b) => a.created_at.localeCompare(b.created_at));
  const a = check(agreement);
  const safeAgreement = a
    ? {
        id: a.id,
        terms: a.terms,
        proposed_by: a.proposed_by,
        owner_accepted_at: a.owner_accepted_at,
        counterparty_accepted_at: a.counterparty_accepted_at,
        shipped_at: a.shipped_at,
        received_at: a.received_at,
        payment_reported_at: a.payment_reported_at,
        payment_received_at: a.payment_received_at,
      }
    : null;
  return {
    journey: {
      id: journey.id,
      subject: journey.subject,
      mode: journey.mode,
      stage: journey.stage,
      source_key: journey.source_key,
      next_action: journey.next_action,
    },
    messages: messages.slice(-100),
    agreement: safeAgreement,
    routes: guest ? [] : (await availableRoutes(sb, journey)).routes,
  };
}
export async function handleExternalExchange(
  sb: any,
  action: string,
  payload: any,
  owner?: string,
) {
  const guest = action.startsWith("nexus.guest.");
  if (!guest && !owner) throw new ExchangeError(401, "authentication_required");
  const access = guest
    ? await guestJourney(sb, payload.token)
    : {
        journey: await journeyForOwner(sb, owner!, payload.journey_id),
        invite: null,
      };
  const { journey, invite } = access;
  const operation = action.split(".").pop();
  const role = guest ? "counterparty" : "owner";
  if (operation === "read") return await snapshot(sb, journey, guest);
  if (operation === "invite" && !guest) {
    if (["completed", "cancelled"].includes(journey.stage))
      throw new ExchangeError(409, "journey_closed");
    const { count } = await sb
      .from("waouh_external_invites")
      .select("id", { count: "exact", head: true })
      .eq("journey_id", journey.id)
      .gte("created_at", new Date(Date.now() - 3600_000).toISOString());
    if ((count ?? 0) >= 10) throw new ExchangeError(429, "invite_rate_limited");
    return await createExchangeInvite(sb, journey);
  }
  if (operation === "revoke" && !guest) {
    check(
      await sb
        .from("waouh_external_invites")
        .update({ revoked_at: new Date().toISOString() })
        .eq("journey_id", journey.id)
        .is("revoked_at", null),
    );
    return { revoked: true };
  }
  const allowed = [
    "message",
    "propose",
    "accept",
    "shipment",
    "receipt",
    "payment",
    "payment_received",
    "stop",
  ];
  if (!allowed.includes(operation!))
    throw new ExchangeError(422, "exchange_operation_not_allowed");
  const requestId = exchangeUuid(payload.request_id);
  const text =
    operation === "message"
      ? exchangeText(payload.text)
      : String(payload.text || "").slice(0, 2000);
  const terms = operation === "propose" ? exchangeTerms(payload.terms) : {};
  const channel = guest ? "guest" : payload.channel || "guest";
  let routes: any = null;
  if (operation === "message" && channel !== "guest") {
    if (payload.confirmed !== true)
      throw new ExchangeError(422, "explicit_confirmation_required");
    routes = await availableRoutes(sb, journey);
    if (!routes.routes.find((r: any) => r.channel === channel)?.available)
      throw new ExchangeError(409, "channel_unavailable");
  }
  const mutation = await sb.rpc("waouh_external_exchange_mutate", {
    p_journey_id: journey.id,
    p_role: role,
    p_operation: operation,
    p_request_id: requestId,
    p_text: text,
    p_terms: terms,
    p_agreement_id: payload.agreement_id
      ? exchangeUuid(payload.agreement_id)
      : null,
    p_invite_id: invite?.id ?? null,
  });
  if (mutation.error) {
    const code = String(mutation.error.message || "exchange_update_failed");
    throw new ExchangeError(code.includes("rate_limited") ? 429 : 409, code);
  }
  if (operation === "stop") {
    const contacts = await contactsFor(sb, journey);
    if (guest)
      await revokeAvatarContacts(
        sb,
        contacts.map((c: any) => c.id),
      );
    check(
      await sb
        .from("waouh_outbound_queue")
        .update({ status: "failed", last_error: "exchange_stopped" })
        .eq("payload->>journey_id", journey.id)
        .in("status", ["pending", "sending"]),
    );
  }
  if (operation === "stop") {
    check(await sb.from("waouh_tel_outbox").update({status:"cancelled",last_error:"exchange_stopped"}).eq("payload->>journey_id",journey.id).in("status",["queued","retry","processing"]));
  }
  if (guest && !mutation.data?.reused)
    await avatarNotice(
      sb,
      journey.owner_id,
      `guest:${requestId}`,
      operation === "message"
        ? `Réponse reçue : ${text.slice(0, 180)}`
        : "Votre interlocuteur a mis à jour les conditions de l’échange.",
      journey,
    );
  if (
    operation === "message" &&
    channel !== "guest" &&
    !mutation.data?.reused
  ) {
    const ref = `exchange:${journey.id}:${role}:${requestId}`;
    let delivery = "pending";
    try {
      const link = await createExchangeInvite(sb, journey);
      const outgoing = `${text}\nRéférence WA-${journey.id.replace(/-/g, "").slice(0, 8).toUpperCase()}. Répondez ${channel === "email" ? "via ce lien" : "ici ou via ce lien"} : ${link.url}\nPour arrêter les messages : STOP.`;
      if (channel === "whatsapp") {
        const target = routes.phone;
        const e164 = normalizeE164(await decryptPhone(target.value_encrypted));
        if (!e164) throw new ExchangeError(422, "invalid_contact_phone");
        check(
          await sb.rpc("waouh_enqueue_outbound_v2", {
            p_to_phone: e164.replace(/\D/g, ""),
            p_to_user_id: null,
            p_template: "nexus_discovery_outreach",
            p_payload: {
              waha_session: CENTRAL_WAHA_SESSION,
              text: outgoing,
              journey_id: journey.id,
              mandate_id: journey.mandate_id,
              signal_id: journey.fabric_id.slice(9),
              fabric_id: journey.fabric_id,
              initiated_by_auth_user: owner,
              contact_id: target.id,
              request_id: requestId,
            },
            p_web_session_id: null,
            p_image_url: null,
            p_channel: "whatsapp",
            p_dedupe_key: ref,
            p_event_type: "nexus_external_message",
          }),
        );
        const task = fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/waouh-outbound-dispatch`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ limit: 20 }),
          },
        ).catch(() => {});
        (globalThis as any).EdgeRuntime?.waitUntil(task);
      } else if (channel === "email") {
        const target = routes.usable.find((c: any) => c.channel === "email");
        const email = await decryptPhone(target.value_encrypted);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
          throw new ExchangeError(422, "invalid_contact_email");
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
            "Content-Type": "application/json",
            "Idempotency-Key": ref,
          },
          body: JSON.stringify({
            from: Deno.env.get("WAOUH_EMAIL_FROM"),
            to: [email],
            subject: `WAOUH · ${String(journey.subject || "Votre offre").slice(0, 100)}`,
            text: outgoing,
          }),
          signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) throw new ExchangeError(502, "email_provider_failed");
        delivery = "sent"; // Provider accepted; delivery is not inferred.
      } else {
        const outbox = await enqueueTelMessage(sb, {
          targetUserId: routes.nativeUser.id,
          channelPreference: channel,
          bypassConsent: false,
          dedupeKey: ref,
          payload: {
            schema: "waouh.tel.outbound.v1",
            text: outgoing,
            journey_id: journey.id,
          },
        });
        check(
          await sb.rpc("waouh_append_conversation_bus_event", {
            p_owner_id: owner,
            p_event_type: "autonomy.native_contact_queued",
            p_channel: channel,
            p_direction: "out",
            p_journey_id: journey.id,
            p_fabric_id: journey.fabric_id,
            p_external_ref: ref,
            p_payload: {
              native_tel_user_id: routes.nativeUser.id,
              outbox_id: outbox.id,
              contact_id: routes.phone.id,
            },
          }),
        );
      }
    } catch (error) {
      await sb
        .from("waouh_conversation_bus_events")
        .update({
          channel,
          payload: {
            role,
            text,
            operation: "message",
            request_id: requestId,
            delivery_status: "failed",
          },
        })
        .eq("event_type", "nexus.external.message")
        .eq("external_ref", ref);
      throw error;
    }
    check(
      await sb
        .from("waouh_opportunity_journeys")
        .update({
          stage: [
            "discovered",
            "enriching",
            "contact_ready",
            "contacting",
          ].includes(journey.stage)
            ? "waiting_reply"
            : journey.stage,
          contact_channel: channel,
          last_activity_at: new Date().toISOString(),
          last_action: "external_message_sent",
          next_action: "Attendre la réponse",
        })
        .eq("id", journey.id)
        .eq("stage", journey.stage),
    );
    check(
      await sb
        .from("waouh_conversation_bus_events")
        .update({
          channel,
          payload: {
            role,
            text,
            operation: "message",
            request_id: requestId,
            delivery_status: delivery,
          },
        })
        .eq("event_type", "nexus.external.message")
        .eq("external_ref", ref),
    );
  }
  if (guest && !mutation.data?.reused && operation !== "read" && operation !== "stop") wakeExternalAvatar(journey);
  const fresh =
    guest && operation === "stop"
      ? { stopped: true }
      : await snapshot(
          sb,
          check(
            await sb
              .from("waouh_opportunity_journeys")
              .select("*")
              .eq("id", journey.id)
              .single(),
          ),
          guest,
        );
  if (!mutation.data?.reused && "journey" in fresh && fresh.journey.stage === "completed" && journey.contact_channel === "whatsapp") {
    const completionRoutes = await availableRoutes(sb, journey);
    if (completionRoutes.routes.find((route:any)=>route.channel === "whatsapp")?.available && fresh.agreement) {
      const recipient = normalizeE164(await decryptPhone(completionRoutes.phone.value_encrypted));
      if (recipient) check(await sb.rpc("waouh_enqueue_outbound_v2", {
        p_to_phone:recipient.replace(/\D/g,""),p_to_user_id:null,p_template:"nexus_discovery_outreach",
        p_payload:{text:`Mission WA-${journey.id.replace(/-/g,"").slice(0,8).toUpperCase()} terminée. Réception confirmée par l’acheteur et paiement reçu confirmé par le vendeur. Ces confirmations sont déclaratives ; WAOUH n’a exécuté aucun paiement. Merci.`,
          waha_session:CENTRAL_WAHA_SESSION,journey_id:journey.id,fabric_id:journey.fabric_id,
          completion_notice:fresh.agreement.id,contact_id:completionRoutes.phone.id},
        p_channel:"whatsapp",p_web_session_id:null,p_image_url:null,
        p_dedupe_key:`external-completed:${journey.id}:${fresh.agreement.id}`,p_event_type:"external_exchange_completed",
      }));
    }
    await avatarNotice(sb,journey.owner_id,`external-completed:${journey.id}`,"Mission terminée : réception et paiement reçu confirmés par les participants.",journey);
  }
  return fresh;
}

/** Guest negotiations use the same hard price bounds and final owner approval. */
export async function advanceExternalNegotiation(
  sb: any,
  journey: any,
  mandate: any,
): Promise<boolean> {
  const { data: a, error } = await sb
    .from("waouh_external_agreements")
    .select("*")
    .eq("journey_id", journey.id)
    .is("superseded_at", null)
    .maybeSingle();
  if (error) throw new Error("external_agreement_lookup_failed");
  if (!a) {
    if (journey.contact_channel !== "whatsapp" || !journey.last_response_at ||
      mandate.autonomy_mode === "assisted" || mandate.status !== "active" ||
      Date.parse(mandate.expires_at) <= Date.now() || journey.metadata?.quote_requested_for === journey.last_response_at ||
      Number(journey.metadata?.quote_requests || 0) >= 3) return false;
    const reference = "WA-" + journey.id.replace(/-/g, "").slice(0,8).toUpperCase();
    const digest = await sha256Hex(`quote:${journey.id}:${journey.last_response_at}`);
    const requestId = `${digest.slice(0,8)}-${digest.slice(8,12)}-4${digest.slice(13,16)}-8${digest.slice(17,20)}-${digest.slice(20,32)}`;
    await handleExternalExchange(sb,"nexus.external.message",{journey_id:journey.id,request_id:requestId,
      channel:"whatsapp",confirmed:true,text:`Merci pour votre réponse. Pour comparer votre offre, précisez le prix total, la quantité, la livraison et les conditions de paiement.\nExemple : PROPOSER ${reference} 25000 FCFA | 1 | Livraison à Cotonou | Paiement après réception\nLe montant de cet exemple n’est pas une offre ni un accord.`},mandate.owner_id);
    check(await sb.from("waouh_opportunity_journeys").update({metadata:{...journey.metadata,
      quote_requested_for:journey.last_response_at,quote_requests:Number(journey.metadata?.quote_requests || 0)+1},
      next_action:"Attendre le prix et les conditions du contact"}).eq("id",journey.id));
    return true;
  }
  if (
    a.proposed_by !== "counterparty" ||
    a.owner_accepted_at ||
    journey.metadata?.processed_external_revision === a.id
  )
    return true;
  const plan = planAvatarNegotiation(
    mandate,
    {
      state: "proposed",
      last_actor: mandate.mode === "sell" ? "buyer" : "seller",
      last_offer_price: a.terms.amount,
    },
    Number(journey.metadata?.avatar_counter_rounds || 0),
  );
  if (plan.kind === "counter") {
    await handleExternalExchange(
      sb,
      "nexus.external.message",
      {
        journey_id: journey.id,
        request_id: a.id,
        text: `Je représente l’utilisateur WAOUH pour « ${journey.subject || mandate.goal} ». Je propose ${plan.amount} FCFA dans ses limites. Merci de proposer vos conditions dans cet échange ; l’accord final devra être confirmé par l’utilisateur.`,
        channel: journey.contact_channel === "whatsapp" ? "whatsapp" : "guest",
        confirmed: journey.contact_channel === "whatsapp",
      },
      mandate.owner_id,
    );
    await sb
      .from("waouh_opportunity_journeys")
      .update({
        metadata: {
          ...journey.metadata,
          processed_external_revision: a.id,
          avatar_counter_rounds:
            Number(journey.metadata?.avatar_counter_rounds || 0) + 1,
        },
        last_action: "bounded_external_counter_offer",
        next_action: "Attendre la proposition du contact",
      })
      .eq("id", journey.id)
      .eq("updated_at", journey.updated_at);
  } else if (plan.kind === "approval" && plan.action === "accept_offer") {
    await requestAvatarApproval(
      sb,
      mandate,
      journey,
      "accept_offer",
      `external-agreement:${journey.id}:${a.id}`,
      `Confirmer l’accord externe : ${a.terms.amount} FCFA, quantité ${a.terms.quantity}. Livraison : ${a.terms.delivery}. Paiement : ${a.terms.payment}.`,
      { external_agreement_id: a.id, amount: a.terms.amount, terms: a.terms },
    );
  } else if (plan.kind === "approval") {
    await avatarNotice(
      sb,
      mandate.owner_id,
      `external-terms:${journey.id}:${a.id}`,
      "La proposition externe demande votre décision. Consultez l’échange pour ajuster les conditions ou votre mandat.",
      journey,
    );
    await sb
      .from("waouh_opportunity_journeys")
      .update({
        metadata: { ...journey.metadata, processed_external_revision: a.id },
        last_action: "external_terms_required",
        next_action: "Préciser votre contre-offre dans l’échange externe",
      })
      .eq("id", journey.id)
      .eq("updated_at", journey.updated_at);
  }
  return true;
}
