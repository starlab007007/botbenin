// WAOUH — Synchronisation universelle chat ↔ WhatsApp (par partie).
//
// Pour CHAQUE partie d'un évènement (acheteur OU vendeur), insère un
// `waouh_messages` (avec `article_id`) ET enqueue un message WhatsApp via
// `waouh_enqueue_outbound_v2` dès qu'un numéro WA est résolu — peu importe la
// source d'identification (chat, partenaire, radar IA, lid_phone_map).
//
// Garantit le miroir parfait entre WaouhMatchChatWindow et WhatsApp pour
// les deux parties à chaque évènement de négociation.

import { resolveRealPhoneE164 } from "./waouh-format.ts";
import { traceEvent, newTraceId } from "./waouh-trace.ts";

export type SyncedRole = "buyer" | "seller";

export interface SyncedUser {
  id?: string | null;
  phone_number?: string | null;
  web_session_id?: string | null;
  auth_user_id?: string | null;
}

export interface PushSyncedEventArgs {
  sb: any;
  user: SyncedUser | null | undefined;
  role: SyncedRole;
  articleId: string | null | undefined;
  text: string;
  intent: string;            // ex: "deal_created", "negotiation_open", "negotiation_closed", "buyer_interest"
  negotiationId?: string | null;
  transactionId?: string | null;
  dealId?: string | null;
  template?: string;         // template name for outbound queue (default: intent)
  eventType?: string | null;
  attachments?: Array<{ url: string; type: string; caption?: string }>;
  imageUrl?: string | null;
  payloadExtra?: Record<string, any>;
  // Optional: explicit phone to skip resolution (rare)
  forcePhoneE164?: string | null;
  // Suffix to disambiguate same intent for same user (ex: actor vs recipient)
  dedupSuffix?: string;
  // Trace correlation id (propagated end-to-end)
  traceId?: string | null;
}

export interface PushSyncedEventResult {
  message_id: string | null;
  phone_e164: string | null;
  enqueued_whatsapp: boolean;
  enqueued_web_mirror: boolean;
}

/**
 * Insère le message dans le chat web (waouh_messages) ET enqueue WhatsApp
 * via la queue centrale pour la partie cible.
 *
 * Idempotent : utilise un dedup_key basé sur (article, intent, user, negotiation, suffix).
 */
export async function pushSyncedEvent(args: PushSyncedEventArgs): Promise<PushSyncedEventResult> {
  const {
    sb, user, role, articleId, text, intent,
    negotiationId = null, transactionId = null, dealId = null,
    template, eventType, attachments = [], imageUrl = null,
    payloadExtra = {}, forcePhoneE164 = null, dedupSuffix = "",
    traceId: traceIdIn = null,
  } = args;
  const traceId = traceIdIn || newTraceId();

  const result: PushSyncedEventResult = {
    message_id: null,
    phone_e164: null,
    enqueued_whatsapp: false,
    enqueued_web_mirror: false,
  };

  if (!user || !user.id) return result;

  // 1) Insertion chat — toujours, pour que WaouhMatchChatWindow voie l'évènement.
  const meta: Record<string, any> = {
    intent,
    article_id: articleId ?? null,
    negotiation_id: negotiationId,
    transaction_id: transactionId,
    deal_id: dealId,
    role,
    trace_id: traceId,
    ...payloadExtra,
  };

  try {
    const { data: msg } = await sb.from("waouh_messages").insert({
      user_id: user.id,
      channel: user.web_session_id ? "web" : (user.phone_number ? "whatsapp" : "system"),
      direction: "out",
      text,
      web_session_id: user.web_session_id ?? null,
      article_id: articleId ?? null,
      attachments,
      meta,
    }).select("id").maybeSingle();
    result.message_id = msg?.id ?? null;
  } catch (e) {
    console.warn("[pushSyncedEvent] msg insert", e);
  }

  // 2) Résolution du numéro WhatsApp via toutes les sources connues.
  let phone: string | null = forcePhoneE164 || null;
  if (!phone) {
    try {
      const resolved = await resolveRealPhoneE164(sb, user as any, {
        article_id: articleId ?? null,
        role,
      });
      if (resolved) phone = resolved;
    } catch (_) { /* ignore */ }
  }
  if (!phone && user.phone_number && !/@lid$/i.test(user.phone_number)) {
    phone = user.phone_number;
  }
  result.phone_e164 = phone;

  const dedupBase = `sync:${articleId ?? "noart"}:${intent}:${user.id}:${negotiationId ?? "noneg"}${dedupSuffix ? ":" + dedupSuffix : ""}`;

  const basePayload = {
    ...payloadExtra,
    text,
    actions: [] as Array<{ id: string; label: string }>,
    article_id: articleId ?? null,
    negotiation_id: negotiationId,
    transaction_id: transactionId,
    deal_id: dealId,
    message_id: result.message_id,
    attachments,
    intent,
    role,
    trace_id: traceId,
  };

  // Trace: sync stage (per party)
  traceEvent(sb, {
    trace_id: traceId,
    article_id: articleId ?? null,
    negotiation_id: negotiationId,
    transaction_id: transactionId,
    deal_id: dealId,
    actor_user_id: user.id,
    role,
    stage: "sync",
    status: result.message_id ? "ok" : "error",
    intent,
    dedup_key: dedupBase,
    payload: { phone_resolved: !!phone, message_id: result.message_id, dedupSuffix },
  });

  // 3) Enqueue WhatsApp si numéro résolu.
  if (phone) {
    try {
      await sb.rpc("waouh_enqueue_outbound_v2", {
        p_to_phone: phone,
        p_to_user_id: user.id,
        p_template: template ?? intent,
        p_payload: basePayload,
        p_web_session_id: user.web_session_id ?? null,
        p_image_url: imageUrl ?? attachments?.[0]?.url ?? null,
        p_channel: "whatsapp",
        p_message_id: result.message_id,
        p_transaction_id: transactionId,
        p_dedupe_key: `wa:${dedupBase}`,
        p_event_type: eventType ?? intent,
      });
      result.enqueued_whatsapp = true;
      traceEvent(sb, { trace_id: traceId, article_id: articleId ?? null, negotiation_id: negotiationId, transaction_id: transactionId, deal_id: dealId, actor_user_id: user.id, role, stage: "queue_enqueue", status: "ok", intent, dedup_key: `wa:${dedupBase}`, payload: { channel: "whatsapp", phone } });
    } catch (e: any) {
      console.warn("[pushSyncedEvent] enqueue wa", e);
      traceEvent(sb, { trace_id: traceId, article_id: articleId ?? null, negotiation_id: negotiationId, transaction_id: transactionId, actor_user_id: user.id, role, stage: "queue_enqueue", status: "error", intent, dedup_key: `wa:${dedupBase}`, error: String(e?.message ?? e) });
    }
  }

  // 4) Miroir web si l'utilisateur a une session web active (en plus de WhatsApp).
  if (user.web_session_id && phone) {
    try {
      await sb.rpc("waouh_enqueue_outbound_v2", {
        p_to_phone: null,
        p_to_user_id: user.id,
        p_template: template ?? intent,
        p_payload: basePayload,
        p_web_session_id: user.web_session_id,
        p_image_url: imageUrl ?? attachments?.[0]?.url ?? null,
        p_channel: "web",
        p_message_id: result.message_id,
        p_transaction_id: transactionId,
        p_dedupe_key: `web:${dedupBase}`,
        p_event_type: eventType ?? intent,
      });
      result.enqueued_web_mirror = true;
    } catch (e) {
      console.warn("[pushSyncedEvent] enqueue web mirror", e);
    }
  }

  // Déclenche le worker en fire-and-forget pour livrer rapidement.
  if (result.enqueued_whatsapp || result.enqueued_web_mirror) {
    const url = Deno.env.get("SUPABASE_URL");
    const srv = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (url && srv) {
      fetch(`${url}/functions/v1/waouh-outbound-dispatch`, {
        method: "POST",
        headers: { Authorization: `Bearer ${srv}`, "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 20 }),
      }).catch(() => {});
    }
  }

  return result;
}
