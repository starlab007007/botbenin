// WAOUH — Écrivain canonique unique des messages de Deal Room.
// Plan validé le 27/09/2026 — docs/WAOUH_CHAT_THREAD_MIGRATION.md
//
// Enveloppe TypeScript de la fonction Postgres waouh_record_chat_message()
// (migration 20260927120000). La fonction dérive rôle, contrepartie, article,
// négociation et deal depuis waouh_chat_threads, dans une seule transaction :
// les métadonnées ne dépendent plus de ce que chaque appelant pense à fournir.
//
// Bascule : chaque appelant migré n'emprunte ce chemin que si l'interrupteur
// chat_writer_v2 est activé (module + automatisation) dans le Command Center.
// Lecture FERMÉE PAR DÉFAUT (ligne absente ou erreur => ancien chemin), à
// l'inverse de getWaouhModuleControl() qui ouvre par défaut.
// Si l'écrivain échoue, l'appelant retombe sur son ancien chemin : un
// message n'est jamais perdu à cause de la bascule.

import { resolveSiblingUserIds } from "./waouh-identity.ts";

export type WaouhChatDirection = "in" | "out";

export interface RecordChatMessageArgs {
  sb: any;
  threadId: string;
  /** Acheteur ou vendeur du thread (ou une de ses identités). Vide = évènement système. */
  senderUserId?: string | null;
  /** Évènement système adressé à UNE partie (sinon : les deux parties). */
  recipientUserId?: string | null;
  direction?: WaouhChatDirection;
  text: string;
  channel?: string | null;
  attachments?: Array<{ url: string; type: string; caption?: string }>;
  imageUrl?: string | null;
  intent?: string | null;
  template?: string | null;
  actions?: Array<{ id: string; label: string; url?: string; phone?: string }>;
  correlationId?: string | null;
  mirrorToOtherParty?: boolean;
  payloadExtra?: Record<string, unknown>;
  /** false : l'appelant garde sa propre livraison WhatsApp (résolution de numéro existante). */
  enqueueWhatsapp?: boolean;
  dedupeKey?: string | null;
  conversationId?: string | null;
  phoneNumber?: string | null;
}

export interface RecordChatMessageResult {
  ok: boolean;
  threadId: string;
  senderRole: "buyer" | "seller" | "system" | null;
  /** Ligne de l'émetteur (null pour un évènement système). */
  messageId: string | null;
  /** Dernière ligne destinataire créée (la seule si recipientUserId). */
  recipientMessageId: string | null;
  buyerMessageId: string | null;
  sellerMessageId: string | null;
  queueIds: string[];
  error?: string;
}

const FLAG_TTL_MS = 5_000;
const flagCache = new Map<string, { value: boolean; at: number }>();

async function moduleFlagEnabled(sb: any, moduleKey: string): Promise<boolean> {
  const now = Date.now();
  const cached = flagCache.get(moduleKey);
  if (cached && now - cached.at < FLAG_TTL_MS) return cached.value;
  let value = false;
  try {
    const { data, error } = await sb
      .from("waouh_admin_module_controls")
      .select("enabled,automation_enabled")
      .eq("module_key", moduleKey)
      .maybeSingle();
    value = !error && !!data && data.enabled === true && data.automation_enabled === true;
  } catch {
    value = false;
  }
  flagCache.set(moduleKey, { value, at: now });
  return value;
}

/** Interrupteur écrivain canonique, fermé par défaut. */
export async function chatWriterV2Enabled(sb: any): Promise<boolean> {
  return moduleFlagEnabled(sb, "chat_writer_v2");
}

/** Interrupteur du routeur canonique, indépendant du writer pour rollback séparé. */
export async function chatRouterV2Enabled(sb: any): Promise<boolean> {
  return moduleFlagEnabled(sb, "chat_router_v2");
}

/**
 * Parcours v3 — ouverture directe de la Deal Room quand un message porte un
 * article (intérêt, prix, bouton de fiche). Correctif du Lot 1 : la migration
 * l'installe ACTIVÉ ; le couper rétablit l'ancien comportement.
 */
export async function chatInterestFastPathEnabled(sb: any): Promise<boolean> {
  return moduleFlagEnabled(sb, "chat_interest_fastpath");
}

/** Parcours v3 — textes et boutons du catalogue unifié (fermé par défaut). */
export async function chatCatalogV3Enabled(sb: any): Promise<boolean> {
  return moduleFlagEnabled(sb, "chat_catalog_v3");
}

/** Parcours v3 — point d'entrée waouh-commerce-action (fermé par défaut). */
export async function commerceActionV3Enabled(sb: any): Promise<boolean> {
  return moduleFlagEnabled(sb, "commerce_action_v3");
}

/** Tests uniquement. */
export function __resetChatWriterFlagCache() {
  flagCache.clear();
}

function emptyResult(threadId: string, error: string): RecordChatMessageResult {
  return {
    ok: false,
    threadId,
    senderRole: null,
    messageId: null,
    recipientMessageId: null,
    buyerMessageId: null,
    sellerMessageId: null,
    queueIds: [],
    error,
  };
}

export async function recordChatMessage(args: RecordChatMessageArgs): Promise<RecordChatMessageResult> {
  const {
    sb,
    threadId,
    senderUserId = null,
    recipientUserId = null,
    direction = "out",
    text,
    channel = null,
    attachments = [],
    imageUrl = null,
    intent = null,
    template = null,
    actions = [],
    correlationId = null,
    mirrorToOtherParty = true,
    payloadExtra = {},
    enqueueWhatsapp = true,
    dedupeKey = null,
    conversationId = null,
    phoneNumber = null,
  } = args;

  if (!threadId) return emptyResult("", "thread_id_required");

  const { data, error } = await sb.rpc("waouh_record_chat_message", {
    p_thread_id: threadId,
    p_sender_user_id: senderUserId,
    p_direction: direction,
    p_text: text,
    p_channel: channel,
    p_attachments: attachments,
    p_image_url: imageUrl,
    p_intent: intent,
    p_template: template,
    p_actions: actions,
    p_correlation_id: correlationId,
    p_mirror_to_other_party: mirrorToOtherParty,
    p_payload_extra: payloadExtra,
    p_recipient_user_id: recipientUserId,
    p_enqueue_whatsapp: enqueueWhatsapp,
    p_dedupe_key: dedupeKey,
    p_conversation_id: conversationId,
    p_phone_number: phoneNumber,
  });

  if (error) {
    console.warn("[waouh-chat-writer] waouh_record_chat_message failed", error);
    return emptyResult(threadId, String((error as any)?.message ?? error));
  }

  const r = (data ?? {}) as Record<string, any>;
  const queueIds = Array.isArray(r.queue_ids) ? r.queue_ids.map(String) : [];

  // Réveil immédiat du dispatcher quand l'écrivain a lui-même mis en file
  // (le pg_cron de 5 min reste le filet de sécurité).
  if (r.ok && queueIds.length > 0) {
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

  return {
    ok: !!r.ok,
    threadId: r.thread_id ?? threadId,
    senderRole: r.sender_role ?? null,
    messageId: r.message_id ?? null,
    recipientMessageId: r.recipient_message_id ?? null,
    buyerMessageId: r.buyer_message_id ?? null,
    sellerMessageId: r.seller_message_id ?? null,
    queueIds,
  };
}

/**
 * Retrouve le thread d'un évènement, du plus sûr au moins sûr :
 * thread explicite → deal → négociation → seul thread actif de cet
 * utilisateur (ou d'une de ses identités) sur cet article. Ambigu => null
 * (l'appelant garde alors l'ancien chemin).
 */
export async function resolveThreadIdForEvent(args: {
  sb: any;
  threadId?: string | null;
  dealId?: string | null;
  negotiationId?: string | null;
  articleId?: string | null;
  user?: { id: string; auth_user_id?: string | null; phone_number?: string | null; web_session_id?: string | null } | null;
  role?: "buyer" | "seller" | null;
}): Promise<string | null> {
  const { sb, threadId, dealId, negotiationId, articleId, user, role } = args;
  if (threadId) return threadId;
  try {
    if (dealId) {
      const { data } = await sb.from("waouh_deals").select("thread_id").eq("id", dealId).maybeSingle();
      if (data?.thread_id) return data.thread_id;
    }
    if (negotiationId) {
      const { data } = await sb.from("waouh_negotiations").select("thread_id").eq("id", negotiationId).maybeSingle();
      if (data?.thread_id) return data.thread_id;
    }
    if (articleId && user?.id) {
      const ids = await resolveSiblingUserIds(sb, user as any);
      if (!ids.length) return null;
      const list = `(${ids.join(",")})`;
      let query = sb
        .from("waouh_chat_threads")
        .select("id")
        .eq("thread_type", "product_meet")
        .eq("article_id", articleId)
        .not("status", "in", "(concluded,cancelled)")
        .limit(2);
      if (role === "buyer") query = query.in("buyer_user_id", ids);
      else if (role === "seller") query = query.in("seller_user_id", ids);
      else query = query.or(`buyer_user_id.in.${list},seller_user_id.in.${list}`);
      const { data } = await query;
      if (Array.isArray(data) && data.length === 1) return data[0].id;
    }
  } catch (e) {
    console.warn("[waouh-chat-writer] resolveThreadIdForEvent failed", e);
  }
  return null;
}

/** web > app > whatsapp > system — même ordre que la fonction SQL. */
export function deriveWaouhChannel(user: {
  web_session_id?: string | null;
  auth_user_id?: string | null;
  phone_number?: string | null;
}): "web" | "app" | "whatsapp" | "system" {
  if (user.web_session_id) return "web";
  if (user.auth_user_id) return "app";
  if (user.phone_number) return "whatsapp";
  return "system";
}