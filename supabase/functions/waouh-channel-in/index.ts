// WAOUH_V25_7_1_AUTH_ACTOR_STABLE
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { lidToPhoneInline } from "../_shared/waouh-format.ts";
import { resolveSiblingUserIds } from "../_shared/waouh-identity.ts";
import { bindThreadState, resolveProductThread, resolveSearchThreadForActor } from "../_shared/waouh-thread.ts";
import { pushSyncedEvent } from "../_shared/waouh-sync.ts";
import { promoteCatalogToArticle } from "../_shared/waouh-promote.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WAHA_BASE_URL = Deno.env.get("WAHA_BASE_URL");
const WAHA_API_KEY = Deno.env.get("WAHA_API_KEY");
const WAHA_SESSION = Deno.env.get("WAHA_SESSION") || "WaouhApp";

const normalizeBeninPhone = (value: string) => {
  const original = String(value || "");
  if (!original || original.includes("status@broadcast") || original.includes("@g.us")) return null;
  if (original.includes("@lid")) return original.replace(/[^0-9@.a-z]/gi, "");
  const raw = original.replace(/@c\.us/g, "");
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("229")) return digits;
  if (digits.length === 8 || (digits.length === 10 && digits.startsWith("01"))) return `229${digits}`;
  return digits.length > 8 ? digits : null;
};

const WAOUH_BUSINESS_PHONE = normalizeBeninPhone(Deno.env.get("WAOUH_BUSINESS_PHONE") || "65653468") || "22965653468";

type WaouhAction = { id: string; label: string };

function beninPhoneCandidates(value: string | null | undefined): string[] {
  const canon = normalizeBeninPhone(String(value || ""));
  const out = new Set<string>();
  if (canon) out.add(canon);
  if (canon && canon.startsWith("229") && !canon.includes("@")) {
    const local = canon.slice(3);
    if (local.length === 8) out.add(`22901${local}`);
    if (local.length === 10 && local.startsWith("01")) out.add(`229${local.slice(2)}`);
  }
  return [...out];
}

function log(step: string, data: any = {}) {
  console.log(`[waouh-channel-in] ${step}`, JSON.stringify(data));
}

function wahaHeaders() {
  return { "Content-Type": "application/json", ...(WAHA_API_KEY ? { "X-Api-Key": WAHA_API_KEY } : {}) };
}

function mediaExt(mime: string) {
  if (/png/i.test(mime)) return "png";
  if (/webp/i.test(mime)) return "webp";
  if (/mp4|video/i.test(mime)) return "mp4";
  return "jpeg";
}

// Télécharge un média (URL WAHA protégée par X-Api-Key) et l'upload dans le bucket public waouh-media.
// Retourne l'URL publique réutilisable par WhatsApp/Web.
async function rehostMedia(sb: any, sourceUrl: string, mime: string): Promise<string | null> {
  try {
    const headers: Record<string, string> = {};
    if (WAHA_API_KEY && WAHA_BASE_URL && sourceUrl.startsWith(WAHA_BASE_URL.replace(/\/$/, ""))) {
      headers["X-Api-Key"] = WAHA_API_KEY;
    }
    const res = await fetch(sourceUrl, { headers });
    if (!res.ok) {
      console.warn("[rehostMedia] fetch failed", res.status, sourceUrl);
      return null;
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength === 0) return null;
    const ext = mediaExt(mime);
    const path = `inbound/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
    const { error } = await sb.storage.from("waouh-media").upload(path, buf, {
      contentType: mime || "image/jpeg",
      upsert: false,
    });
    if (error) {
      console.warn("[rehostMedia] upload failed", error.message);
      return null;
    }
    const { data: pub } = sb.storage.from("waouh-media").getPublicUrl(path);
    return pub?.publicUrl || null;
  } catch (e) {
    console.warn("[rehostMedia] exception", e);
    return null;
  }
}

function extractInteractiveText(payload: any) {
  return payload?.body
    || payload?.caption
    || payload?._data?.caption
    || payload?.selectedButtonId
    || payload?.selectedDisplayText
    || payload?.button?.text
    || payload?.button?.id
    || payload?.listResponse?.title
    || payload?.listResponse?.singleSelectReply?.selectedRowId
    || payload?._data?.selectedButtonId
    || payload?._data?.selectedDisplayText
    || "";
}

async function sendWahaText(base: string, session: string, chatId: string, text: string) {
  const cleanBase = base.replace(/\/$/, "");
  const headers = wahaHeaders();
  const direct = await fetch(`${cleanBase}/api/sendText`, {
    method: "POST",
    headers,
    body: JSON.stringify({ session, chatId, text }),
  });
  if (direct.ok) return direct;
  return fetch(`${cleanBase}/api/${session}/sendText`, {
    method: "POST",
    headers,
    body: JSON.stringify({ chatId, text }),
  });
}

async function sendWahaImage(base: string, session: string, chatId: string, imageUrl: string, caption: string) {
  const cleanBase = base.replace(/\/$/, "");
  const headers = wahaHeaders();
  const direct = await fetch(`${cleanBase}/api/sendImage`, {
    method: "POST",
    headers,
    body: JSON.stringify({ session, chatId, file: { url: imageUrl }, caption }),
  });
  if (direct.ok) return direct;
  return fetch(`${cleanBase}/api/${session}/sendImage`, {
    method: "POST",
    headers,
    body: JSON.stringify({ chatId, file: { url: imageUrl }, caption }),
  });
}

async function sendWahaButtons(base: string, session: string, chatId: string, text: string, actions: WaouhAction[], imageUrl?: string | null) {
  const cleanBase = base.replace(/\/$/, "");
  const headers = wahaHeaders();
  const richButtons = actions.slice(0, 3).map((a: any) => {
    if (a.url) return { type: "url", url: a.url, text: a.label };
    if (a.phone) return { type: "call", phoneNumber: a.phone, text: a.label };
    return { type: "reply", reply: { id: a.id, title: a.label } };
  });
  const richBody: any = { session, chatId, body: text, footer: "WAOUH • bot.bj", buttons: richButtons };
  if (imageUrl) richBody.header = { image: { url: imageUrl } };
  let r = await fetch(`${cleanBase}/api/sendButtons`, { method: "POST", headers, body: JSON.stringify(richBody) });
  if (r.ok) return r;
  r = await fetch(`${cleanBase}/api/${session}/sendButtons`, { method: "POST", headers, body: JSON.stringify({ ...richBody, session: undefined }) });
  if (r.ok) return r;
  // Legacy fallback
  const buttons = actions.slice(0, 3).map((a) => ({ id: a.id, text: a.label }));
  r = await fetch(`${cleanBase}/api/sendButtons`, { method: "POST", headers, body: JSON.stringify({ session, chatId, text, buttons }) });
  if (r.ok) return r;
  // Final fallback: keep one WhatsApp bubble only. If media buttons fail,
  // put the choices in the same image caption instead of sending a 2nd text.
  if (imageUrl) {
    const lines = actions.map((a, i) => `${i + 1}. ${a.label}`).join("\n");
    return sendWahaImage(base, session, chatId, imageUrl, `${text}\n\n${lines}`);
  }
  const fallback = `${text}\n\n${actions.map((a, i) => `${i + 1}. ${a.label}`).join("\n")}`;
  return sendWahaText(base, session, chatId, fallback);
}

async function resolveReplyChatIds(sb: any, rawFrom: string | null, phone: string | null): Promise<string[]> {
  const out = new Set<string>();
  if (rawFrom && rawFrom.includes("@")) out.add(rawFrom);
  if (phone && !phone.includes("@")) beninPhoneCandidates(phone).forEach((p) => out.add(`${p}@c.us`));
  if (rawFrom?.includes("@lid")) {
    const lid = rawFrom.replace(/@lid$/, "");
    const { data: maps } = await sb.from("waouh_lid_phone_map")
      .select("phone, phone_e164, jid")
      .or(`lid.eq.${lid},jid.eq.${rawFrom}`)
      .limit(3);
    for (const m of maps || []) {
      const raw = m.phone_e164 || m.phone;
      beninPhoneCandidates(raw).forEach((p) => out.add(`${p}@c.us`));
    }
  }
  return [...out];
}

async function sendWahaReply(base: string, session: string, chatIds: string[], text: string, actions: WaouhAction[] = [], imageUrl?: string | null) {
  let lastError = "";
  for (const chatId of chatIds) {
    const res = actions.length > 0
      ? await sendWahaButtons(base, session, chatId, text, actions, imageUrl)
      : imageUrl
        ? await sendWahaImage(base, session, chatId, imageUrl, text)
        : await sendWahaText(base, session, chatId, text);
    if (res.ok) {
      log("waha reply sent", { chatId, status: res.status });
      return { ok: true, chatId };
    }
    const body = await res.text().catch(() => "");
    lastError = `WAHA ${res.status} ${chatId}: ${body.slice(0, 200)}`;
    console.warn("[waouh-channel-in] waha reply failed", lastError);
  }
  return { ok: false, error: lastError || "no chatId" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method === "GET") {
    const url = new URL(req.url);
    const challenge = url.searchParams.get("hub.challenge");
    if (challenge) return new Response(challenge, { headers: corsHeaders });
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const sb = createClient(SUPABASE_URL, SERVICE);
    const raw = await req.json().catch(() => ({}));
    log("payload", raw);

    let channel: "web" | "whatsapp" = raw.channel ?? "whatsapp";
    let text: string = raw.text ?? "";
    let phone: string | null = raw.phone ?? null;
    let sessionId: string | null = raw.sessionId ?? null;
    let attachments: Array<{ url: string; type: string }> = Array.isArray(raw.attachments) ? raw.attachments : [];
    const lat = typeof raw.lat === "number" && Number.isFinite(raw.lat) ? raw.lat : null;
    const lng = typeof raw.lng === "number" && Number.isFinite(raw.lng) ? raw.lng : null;
    const hasLocation = lat != null && lng != null;
    const city = raw.city ?? "Cotonou";
    let authUserId: string | null = raw.authUserId ?? null;
    const clientMeta: Record<string, any> = (raw.meta && typeof raw.meta === "object") ? raw.meta : {};

    if (channel === "web" && authUserId) {
      const bearer = (req.headers.get("authorization") || "")
        .replace(/^Bearer\s+/i, "")
        .trim();
      if (bearer && bearer !== SERVICE) {
        const { data: authenticated } = await sb.auth.getUser(bearer);
        if (authenticated.user?.id !== authUserId) {
          return new Response(JSON.stringify({ ok: false, error: "auth identity mismatch" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    const wahaSession = raw.session || WAHA_SESSION;
    let fromChatId: string | null = null;
    let toPhone: string | null = null;

    // WAHA: { event:"message", session, payload:{ id, from, body, fromMe, hasMedia, mediaUrl, mimetype } }
    if (raw.event && raw.payload) {
      const normalizedFrom = normalizeBeninPhone(raw.payload.from || raw.payload.author || "");
      toPhone = normalizeBeninPhone(raw.payload.to || raw.payload._data?.to || "") || WAOUH_BUSINESS_PHONE;
      if (normalizedFrom === WAOUH_BUSINESS_PHONE) {
        log("skip self/business echo", { from: raw.payload.from });
        return new Response(JSON.stringify({ ok: true, skipped: true, reason: "business-self" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (raw.event !== "message" || raw.payload.fromMe || !normalizedFrom) {
        return new Response(JSON.stringify({ ok: true, skipped: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // 🛡️ Idempotence : WAHA peut émettre "message" et "message.any" pour le même message → on dédupe par event id.
      const wahaEventId = raw.payload.id || raw.id || `${normalizedFrom}:${raw.payload.timestamp || ""}:${(raw.payload.body || "").slice(0, 40)}`;
      if (wahaEventId) {
        const { error: dupErr } = await sb.from("waouh_processed_events").insert({ event_id: String(wahaEventId), source: "waha" });
        if (dupErr && (dupErr.code === "23505" || /duplicate/i.test(dupErr.message))) {
          log("skip duplicate waha event", { wahaEventId });
          return new Response(JSON.stringify({ ok: true, skipped: true, reason: "duplicate" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
      channel = "whatsapp";
      phone = normalizedFrom;
      fromChatId = raw.payload.from || `${normalizedFrom}@c.us`;

      // 🔑 Si WAHA livre `<lid>@lid` (privacy mode), on résout immédiatement
      // vers le vrai numéro E.164 pour que TOUT le downstream (notifications
      // "📩 Nouvel acheteur intéressé", contre-offres, accord, livraison)
      // atterrisse réellement sur le WhatsApp de la personne.
      if (phone && /@lid$/i.test(phone)) {
        try {
          const lidDigits = await lidToPhoneInline(sb, phone, { session: wahaSession });
          // ✅ Garde-fou strict : seul un résultat plausible (8 à 12 chiffres, et pas un LID camouflé)
          // peut écraser le phone. Sinon on garde `<lid>@lid` pour redéclencher la résolution plus tard.
          let resolved: string | null = null;
          if (lidDigits && lidDigits.length >= 8 && lidDigits.length <= 12) {
            if (lidDigits.startsWith("229") && (lidDigits.length === 11 || lidDigits.length === 13)) {
              resolved = lidDigits;
            } else if (lidDigits.length === 8) {
              resolved = `229${lidDigits}`;
            } else if (lidDigits.length === 10 && lidDigits.startsWith("01")) {
              resolved = `229${lidDigits}`;
            }
          }
          if (resolved && /^229\d{8,10}$/.test(resolved)) {
            const lidOrig = phone;
            phone = resolved;
            try {
              await sb.from("waouh_users")
                .update({ phone_number: resolved })
                .eq("phone_number", lidOrig);
            } catch (_) { /* ignore */ }
            log("lid resolved", { lid: lidOrig, phone: resolved });
          } else {
            log("lid unresolved — keep @lid", { lid: phone, returned: lidDigits });
          }
        } catch (e) { console.warn("[waouh-channel-in] lid resolve failed", e); }
      }



      text = extractInteractiveText(raw.payload);
      const mime = raw.payload.mimetype || raw.payload.media?.mimetype || raw.payload._data?.mimetype || "image/jpeg";
      const hasInboundMedia = raw.payload.hasMedia || raw.payload.media || raw.payload.mediaUrl || raw.payload._data?.deprecatedMms3Url;
      const derivedMediaUrl = hasInboundMedia && raw.payload.id && WAHA_BASE_URL
        ? `${WAHA_BASE_URL.replace(/\/$/, "")}/api/files/${wahaSession}/${raw.payload.id}.${mediaExt(mime)}`
        : null;
      const candidateUrl = raw.payload.mediaUrl || raw.payload.media?.url || derivedMediaUrl || raw.payload._data?.deprecatedMms3Url;
      if (candidateUrl && !String(candidateUrl).startsWith("/") && /^image\//i.test(mime)) {
        const publicUrl = await rehostMedia(sb, candidateUrl, mime);
        if (publicUrl) {
          attachments.push({ url: publicUrl, type: mime });
        } else if (/^https?:\/\//i.test(candidateUrl)) {
          attachments.push({ url: candidateUrl, type: mime });
        }
      } else if (candidateUrl && /^https?:\/\//i.test(candidateUrl)) {
        attachments.push({ url: candidateUrl, type: mime });
      }
    }

    const chatId = fromChatId || (phone ? (phone.includes("@") ? phone : `${phone}@c.us`) : "");
    const replyChatIds = channel === "whatsapp"
      ? await resolveReplyChatIds(sb, fromChatId, phone)
      : [chatId].filter(Boolean);

    if ((!text && attachments.length === 0) || (!phone && !sessionId)) {
      return new Response(JSON.stringify({ ok: false, error: "missing text/attachments or identifier" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert user
    let user: any = null;
    if (channel === "web") {
      const { data: existing } = await sb.from("waouh_users").select("*").eq("web_session_id", sessionId).maybeSingle();
      user = existing;
      if (!user) {
        const { data: created, error } = await sb.from("waouh_users").insert({
          web_session_id: sessionId, channel: "web", city,
          auth_user_id: authUserId,
          location: hasLocation ? `SRID=4326;POINT(${lng} ${lat})` as any : null,
        }).select().single();
        if (error) log("user insert error", error);
        user = created;
      } else {
        const patch: Record<string, any> = {};
        if (authUserId && !user.auth_user_id) patch.auth_user_id = authUserId;
        if (city && city !== user.city) patch.city = city;
        if (hasLocation) patch.location = `SRID=4326;POINT(${lng} ${lat})` as any;
        if (Object.keys(patch).length) await sb.from("waouh_users").update(patch).eq("id", user.id);
      }
    } else {
      const { data: existing } = await sb.from("waouh_users").select("*").eq("phone_number", phone).maybeSingle();
      user = existing;
      if (!user) {
        const { data: created } = await sb.from("waouh_users").insert({
          phone_number: phone, channel: "whatsapp", city,
          location: hasLocation ? `SRID=4326;POINT(${lng} ${lat})` as any : null,
        }).select().single();
        user = created;
      } else if (hasLocation) {
        await sb.from("waouh_users").update({ location: `SRID=4326;POINT(${lng} ${lat})` as any, city }).eq("id", user.id);
      }
    }
    log("user", { id: user?.id });

    // WAOUH_V25_7_1_AUTH_ACTOR_CANONICALIZATION
    // Le navigateur et Flutter peuvent créer plusieurs lignes waouh_users pour
    // le même compte Auth. Avant de résoudre un thread préféré, on rattache
    // l'acteur à la ligne exacte indiquée par son rôle, uniquement si elle
    // appartient au même auth_user_id vérifié par le JWT.
    if (channel === "web" && authUserId && user?.id) {
      if (!user.auth_user_id) {
        user = { ...user, auth_user_id: authUserId };
      }
      const hintedActorUserId = clientMeta?.role === "seller"
        ? String(clientMeta?.seller_user_id || "").trim()
        : clientMeta?.role === "buyer"
          ? String(clientMeta?.buyer_user_id || "").trim()
          : "";
      if (hintedActorUserId && hintedActorUserId !== user.id) {
        const { data: hintedActor } = await sb.from("waouh_users")
          .select("*")
          .eq("id", hintedActorUserId)
          .maybeSingle();
        if (hintedActor?.id && hintedActor.auth_user_id === authUserId) {
          user = hintedActor;
          log("canonical web actor", { id: user.id, role: clientMeta?.role });
        }
      }
    }

    // Chat Meet : une relation active est déterminée par le produit, l'acheteur
    // et le vendeur. La conversation générale reste disponible, mais tous les
    // messages commerciaux portent désormais un thread_id autoritaire.
    const requestedThreadType = clientMeta?.thread_type === "search" ? "search" : "product_meet";
    const requestedSearchThreadId = requestedThreadType === "search"
      ? String(clientMeta?.thread_id || "").trim() || null
      : null;
    const searchMeet = requestedSearchThreadId
      ? await resolveSearchThreadForActor({
          sb,
          actorUser: user,
          preferredThreadId: requestedSearchThreadId,
        })
      : null;
    let inboundArticleId: string | null = requestedThreadType === "search"
      ? null
      : clientMeta?.article_id ?? null;
    const radarSource = String(clientMeta?.radar_source || "").toLowerCase();
    if (inboundArticleId && ["catalog", "partner"].includes(radarSource)) {
      const promoted = await promoteCatalogToArticle(sb, inboundArticleId, {});
      if (!promoted.article_id) {
        return new Response(JSON.stringify({
          ok: false,
          code: "radar_promotion_failed",
          error: "Ce résultat partenaire ne peut pas encore ouvrir une discussion produit.",
        }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      inboundArticleId = promoted.article_id;
      clientMeta.article_id = promoted.article_id;
      clientMeta.source_id = clientMeta.source_id || clientMeta.radar_item_id || null;
      clientMeta.source = "partner";
    }
    const requestedRole: "buyer" | "seller" = clientMeta?.role === "seller" ? "seller" : "buyer";
    const meet = inboundArticleId
      ? await resolveProductThread({
          sb,
          articleId: inboundArticleId,
          actorUser: user,
          role: requestedRole,
          counterpartUserId: clientMeta?.counterpart_user_id ?? null,
          buyerUserId: clientMeta?.buyer_user_id ?? null,
          sellerUserId: clientMeta?.seller_user_id ?? null,
          preferredThreadId: clientMeta?.thread_id ?? null,
          source: clientMeta?.source ?? channel,
          create: true,
        })
      : null;
    const threadId: string | null = meet?.id ?? searchMeet?.id ?? null;
    const requestedIdempotencyKey = String(clientMeta?.idempotency_key || "").trim();
    const idempotencyKey = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(requestedIdempotencyKey)
      ? requestedIdempotencyKey
      : crypto.randomUUID();
    const routedAction = String(clientMeta?.action || clientMeta?.intent || "message").trim() || "message";
    const threadMeta: Record<string, any> = threadId
      ? searchMeet
        ? {
            thread_id: threadId,
            thread_key: searchMeet.thread_key,
            thread_type: "search",
            search_request_id: searchMeet.search_request_id,
          }
        : {
            thread_id: threadId,
            thread_key: meet?.thread_key ?? clientMeta?.thread_key ?? clientMeta?.match_key ?? null,
            thread_type: "product_meet",
            buyer_user_id: meet?.buyer_user_id ?? clientMeta?.buyer_user_id ?? null,
            seller_user_id: meet?.seller_user_id ?? clientMeta?.seller_user_id ?? null,
            counterpart_user_id: requestedRole === "seller"
              ? (meet?.buyer_user_id ?? clientMeta?.counterpart_user_id ?? null)
              : (meet?.seller_user_id ?? clientMeta?.counterpart_user_id ?? null),
            counterpart_name: clientMeta?.counterpart_name ?? null,
          }
      : {};

    if (requestedIdempotencyKey && idempotencyKey === requestedIdempotencyKey) {
      const { data: replay } = await sb.from("waouh_messages")
        .select("id,thread_id,article_id")
        .eq("meta->>idempotency_key", idempotencyKey)
        .maybeSingle();
      if (replay?.id) {
        return new Response(JSON.stringify({
          ok: true,
          duplicate: true,
          inbound_message_id: replay.id,
          thread_id: replay.thread_id,
          article_id: replay.article_id,
          idempotency_key: idempotencyKey,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Upsert conversation so the operator-side app can subscribe by conversation_id.
    // We key on user_id + channel (one open conversation per user/channel).
    const convPhone = phone || (sessionId ? `web:${sessionId}` : "unknown");
    let convId: string | null = null;
    {
      const { data: existingConv } = await sb
        .from("waouh_conversations")
        .select("id")
        .eq("user_id", user.id)
        .eq("phone_number", convPhone)
        .maybeSingle();
      if (existingConv?.id) {
        convId = existingConv.id;
      } else {
        const { data: createdConv } = await sb
          .from("waouh_conversations")
          .insert({ user_id: user.id, phone_number: convPhone, state: "active" })
          .select("id")
          .single();
        convId = createdConv?.id ?? null;
      }
    }

    // Persist incoming
    const { data: inboundRow, error: inboundError } = await sb.from("waouh_messages").insert({
      conversation_id: convId,
      thread_id: threadId,
      user_id: user.id, channel, direction: "in", text: text || "(image)",
      web_session_id: sessionId, phone_number: phone,
      attachments,
      article_id: inboundArticleId,
      meta: {
        ...clientMeta,
        ...threadMeta,
        idempotency_key: idempotencyKey,
        action: routedAction,
        to_phone: toPhone || WAOUH_BUSINESS_PHONE,
        session: wahaSession,
      },
    }).select("id").maybeSingle();
    if (inboundError) {
      if ((inboundError as any).code === "23505" || /duplicate/i.test((inboundError as any).message || "")) {
        const { data: replay } = await sb.from("waouh_messages")
          .select("id,thread_id,article_id")
          .eq("meta->>idempotency_key", idempotencyKey)
          .maybeSingle();
        return new Response(JSON.stringify({
          ok: true,
          duplicate: true,
          inbound_message_id: replay?.id ?? null,
          thread_id: replay?.thread_id ?? threadId,
          article_id: replay?.article_id ?? inboundArticleId,
          idempotency_key: idempotencyKey,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw inboundError;
    }
    const inboundMessageId: string | null = inboundRow?.id ?? null;

    // WAOUH_V25_6_DIRECT_CHAT_MIRROR
    // Un message libre du Chat Meet doit être visible par l'autre partie dans
    // le même thread. Les commandes commerciales structurées restent gérées
    // exclusivement par negotiation-router / commerce-workflow pour éviter les
    // doublons et conserver leurs cartes intelligentes autoritaires.
    const directAction = String(
      clientMeta?.commerce_action || clientMeta?.action || clientMeta?.intent || "",
    ).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/_/g, "-");
    const directText = String(text || "").trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const structuredDirectActions = new Set([
      "interested", "interesse", "interest", "buyer-interest",
      "accept", "accepted", "accepter", "accept-offer", "negotiation-accept",
      "reject", "rejected", "refuser", "reject-offer", "negotiation-reject",
      "counter", "counter-offer", "contre-proposition", "negotiation-counter",
      "payer-mobile", "paiement-livraison", "paiement-effectue",
      "confirmer-disponibilite", "confirmer-reception", "signaler-probleme",
      "annuler", "preparer", "suivre-livraison",
    ]);
    const structuredDirectText =
      /^(?:oui|ok|d['’]?accord|j['’]?accepte|accepte|yes|non|no|je refuse|refuse)\b/.test(directText) ||
      /^(?:je\s+)?propose\b/.test(directText) ||
      /^(?:accepter|refuser|contre-proposition|payer-mobile|paiement-livraison|confirmer-disponibilite|confirmer-reception|annuler)(?::|\b)/.test(directText);
    const shouldMirrorDirectChat = !!(
      threadId &&
      inboundArticleId &&
      meet?.buyer_user_id &&
      meet?.seller_user_id &&
      !structuredDirectActions.has(directAction) &&
      !structuredDirectText
    );
    if (shouldMirrorDirectChat) {
      const targetRole: "buyer" | "seller" = requestedRole === "seller" ? "buyer" : "seller";
      const targetUserId = targetRole === "buyer" ? meet!.buyer_user_id : meet!.seller_user_id;
      if (targetUserId && targetUserId !== user.id) {
        try {
          const { data: targetUser } = await sb.from("waouh_users")
            .select("id,phone_number,web_session_id,auth_user_id")
            .eq("id", targetUserId)
            .maybeSingle();
          if (targetUser?.id) {
            await pushSyncedEvent({
              sb,
              user: targetUser,
              role: targetRole,
              articleId: inboundArticleId,
              text: text || "(image)",
              intent: "direct_chat_message",
              threadId,
              buyerUserId: meet!.buyer_user_id,
              sellerUserId: meet!.seller_user_id,
              counterpartUserId: user.id,
              actions: [],
              attachments,
              template: "direct_chat_message",
              eventType: "direct_chat_message",
              dedupSuffix: `direct:${idempotencyKey}`,
              payloadExtra: {
                workflow_state: "chat",
                source_message_id: inboundMessageId,
                sender_user_id: user.id,
                sender_role: requestedRole,
                counterpart_user_id: user.id,
                actions: [],
              },
            });
          }
        } catch (e) {
          console.warn("[waouh-channel-in] direct Chat Meet mirror failed", e);
        }
      }
    }

    // === Real "interested buyer" signal ===
    // If the inbound message is tagged with an article (match chat window),
    // notify the seller ONCE per (article, buyer) pair. This replaces the old
    // publication-time seller spam.
    const articleIdFromMeta: string | null = clientMeta?.article_id ?? null;
    const explicitInterest =
      clientMeta?.action === "interested" ||
      clientMeta?.intent === "interested" ||
      clientMeta?.commerce_action === "interest";
    if (articleIdFromMeta && explicitInterest) {
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/waouh-buyer-interest`, {
          method: "POST",
          headers: { Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            article_id: articleIdFromMeta,
            buyer_user_id: meet?.buyer_user_id ?? user.id,
            source: clientMeta?.source || clientMeta?.origin_surface || "flutter",
          }),
        });
      } catch (e) {
        console.warn("[waouh-channel-in] explicit buyer interest failed", e);
      }
    }
    if (articleIdFromMeta) {
      try {
        const { data: art } = await sb
          .from("waouh_articles")
          .select("id, seller_id")
          .eq("id", articleIdFromMeta)
          .maybeSingle();
        const buyerKey = clientMeta?.buyer_profile_id || meet?.buyer_user_id || user.id;
        const isSeller = requestedRole === "seller" ||
          (!!art?.seller_id && meet?.seller_user_id === art.seller_id && meet?.seller_user_id === user.id);
        if (art?.seller_id && !isSeller) {
          const dedupeId = `new_buyer:${articleIdFromMeta}:${buyerKey}:${threadId ?? "legacy"}`;
          const { error: dupErr } = await sb
            .from("waouh_processed_events")
            .insert({ event_id: dedupeId, source: "new_buyer" });
          if (!dupErr) {
            fetch(`${SUPABASE_URL}/functions/v1/waouh-notify-dispatch`, {
              method: "POST",
              headers: { Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                kind: "new_buyer",
                article_id: articleIdFromMeta,
                buyer_profile_id: clientMeta?.buyer_profile_id ?? null,
                counterpart_user_id: meet?.buyer_user_id ?? user.id,
                buyer_user_id: meet?.buyer_user_id ?? user.id,
                seller_user_id: meet?.seller_user_id ?? art.seller_id,
                thread_id: threadId,
                counterpart_name: user.display_name || user.phone_number || "Acheteur",
                recipient: "seller",
              }),
            }).catch(() => {});
          }
        }
      } catch (e) {
        console.warn("[waouh-channel-in] new_buyer dispatch failed", e);
      }
    }


    // Parcours commercial post-accord : paiement, préparation, livraison et
    // conclusion utilisent le même contrat pour App, Web et WhatsApp.
    const commercePayload = String(clientMeta?.button_payload || text || "").trim();
    const normalizedCommerceText = commercePayload.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const inferredCommerceAction =
      /\b(j.?ai|bien)?\s*recu\b|confirmer\s+la\s+reception/.test(normalizedCommerceText)
        ? "confirmer-reception"
        : /\b(payer|paiement|payement|momo|mobile money|je paie|je paye)\b/.test(normalizedCommerceText)
          ? "payer-mobile"
          : null;
    const commerceAction = String(clientMeta?.commerce_action || inferredCommerceAction || commercePayload.split(":")[0] || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/_/g, "-");
    const commerceActions = new Set([
      "payer-mobile",
      "paiement-effectue",
      "paiement-livraison",
      "confirmer-disponibilite",
      "preparer",
      "suivre-livraison",
      "confirmer-reception",
      "signaler-probleme",
      "annuler",
      "mtn",
      "moov",
      "sbin",
    ]);
    if (commerceActions.has(commerceAction)) {
      const workflowRes = await fetch(`${SUPABASE_URL}/functions/v1/waouh-commerce-workflow`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          phone,
          text,
          action: commerceAction,
          button_payload: commercePayload,
          commerce_reference: clientMeta?.commerce_reference || null,
          article_id: clientMeta?.article_id || null,
          thread_id: threadId,
          deal_id: clientMeta?.deal_id || null,
          transaction_id: clientMeta?.transaction_id || null,
        }),
      });
      const workflow = await workflowRes.json().catch(() => ({}));
      const workflowReply = String(workflow?.reply || workflow?.error || "Action WAOUH impossible.");
      const workflowActions: WaouhAction[] = Array.isArray(workflow?.actions) ? workflow.actions : [];
      const workflowAttachments = Array.isArray(workflow?.attachments) ? workflow.attachments : [];
      const workflowProducts = Array.isArray(workflow?.products) ? workflow.products : [];
      await sb.from("waouh_messages").insert({
        conversation_id: convId,
        thread_id: workflow?.thread_id || threadId,
        user_id: user.id,
        channel,
        direction: "out",
        text: workflowReply,
        web_session_id: sessionId,
        phone_number: phone,
        attachments: workflowAttachments,
        article_id: workflow?.article_id || inboundArticleId || null,
        meta: {
          intent: workflow?.intent || "commerce_error",
          workflow_state: workflow?.workflow_state || null,
          role: workflow?.role || clientMeta?.role || null,
          article_id: workflow?.article_id || inboundArticleId || null,
          thread_id: workflow?.thread_id || threadId,
          buyer_user_id: meet?.buyer_user_id ?? clientMeta?.buyer_user_id ?? null,
          seller_user_id: meet?.seller_user_id ?? clientMeta?.seller_user_id ?? null,
          counterpart_user_id: threadMeta.counterpart_user_id ?? null,
          deal_id: workflow?.deal_id || null,
          transaction_id: workflow?.transaction_id || null,
          actions: workflowActions,
          products: workflowProducts,
        },
      });
      if (convId) {
        await sb.from("waouh_conversations")
          .update({
            last_message: workflowReply,
            last_intent: workflow?.intent || "commerce_error",
            current_article_id: workflow?.article_id || inboundArticleId || null,
            current_transaction_id: workflow?.transaction_id || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", convId);
      }
      if (channel === "whatsapp" && phone && WAHA_BASE_URL) {
        const firstImage = workflowAttachments.find((item: any) => item?.url)?.url || null;
        await sendWahaReply(
          WAHA_BASE_URL,
          wahaSession,
          replyChatIds,
          workflowReply,
          workflowActions,
          firstImage,
        );
      }
      return new Response(JSON.stringify({
        ok: workflowRes.ok && workflow?.ok !== false,
        reply: workflowReply,
        intent: workflow?.intent || "commerce_error",
        workflow_state: workflow?.workflow_state || null,
        role: workflow?.role || null,
        actions: workflowActions,
        products: workflowProducts,
        attachments: workflowAttachments,
        article_id: workflow?.article_id || null,
        deal_id: workflow?.deal_id || null,
        transaction_id: workflow?.transaction_id || null,
        thread_id: workflow?.thread_id || threadId,
        inbound_message_id: inboundMessageId,
        conversation_id: convId,
        user_id: user.id,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }



    // Negotiation routing : si l'utilisateur a une négo ouverte, route vers negotiation-router.
    // IMPORTANT : quand le message vient de WaouhMatchChatWindow (meta.article_id + meta.role),
    // l'utilisateur web courant peut être un waouh_users DIFFÉRENT de celui qui possède la
    // négociation (sessions multiples, auth_user_id non lié). On fait donc une lookup
    // scoped par article_id + rôle, et on transmet le user_id réel de la négo à
    // negotiation-router pour qu'il ne réponde jamais "Aucune négociation en cours".
    const metaArticleId: string | null = clientMeta?.article_id ?? null;
    const metaRole: "buyer" | "seller" | null =
      clientMeta?.role === "seller" || clientMeta?.role === "buyer" ? clientMeta.role : null;

    let openNeg: { id: string; thread_id: string | null; buyer_user_id: string | null; seller_user_id: string | null } | null = null;

    // 🔑 Multi-identités : une même personne peut avoir plusieurs lignes
    // waouh_users (App + WA, LID + phone, doublons). On élargit la recherche
    // à tous les siblings pour ne plus rater la négociation côté contre-offre.
    const siblingIds = await resolveSiblingUserIds(sb, user);

    const negotiationAction = String(text || "").trim().match(/^(?:accepter|accept|refuser|refuse|contre-proposition|counter):([0-9a-f-]{36})$/i);
    const requestedNegotiationId: string | null = clientMeta?.negotiation_id ?? meet?.negotiation_id ?? negotiationAction?.[1] ?? null;
    if (requestedNegotiationId) {
      const { data } = await sb
        .from("waouh_negotiations")
        .select("id, thread_id, buyer_user_id, seller_user_id")
        .eq("id", requestedNegotiationId)
        .in("state", ["proposed", "countered"])
        .maybeSingle();
      openNeg = data as any;
    }
    if (!openNeg && threadId) {
      const { data } = await sb
        .from("waouh_negotiations")
        .select("id, thread_id, buyer_user_id, seller_user_id")
        .eq("thread_id", threadId)
        .in("state", ["proposed", "countered"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      openNeg = data as any;
    }
    // Choisit l'id sibling qui correspond effectivement à un côté de la négo,
    // pour que negotiation-router calcule correctement isBuyer/isSeller.
    let negUserId: string = user.id;
    if (openNeg) {
      if (metaRole === "seller" && openNeg.seller_user_id) {
        negUserId = openNeg.seller_user_id;
      } else if (metaRole === "buyer" && openNeg.buyer_user_id) {
        negUserId = openNeg.buyer_user_id;
      } else if (openNeg.seller_user_id && siblingIds.includes(openNeg.seller_user_id)) {
        negUserId = openNeg.seller_user_id;
      } else if (openNeg.buyer_user_id && siblingIds.includes(openNeg.buyer_user_id)) {
        negUserId = openNeg.buyer_user_id;
      }
    }

    const lowerText = (text || "").toLowerCase();
    // Les cartes Flutter envoient `interesse:1`. Le séparateur `:` doit être
    // reconnu comme une sélection de produit et ne jamais être détourné vers
    // une négociation déjà ouverte dans un autre Meet.
    const shouldStayInCore = /(?:int[ée]ress[ée]|interesse)\s*(?:[:#-]\s*)?(?:n[°o]?\s*)?(?:x|\d+)|\b(?:je\s+)?(?:cherche|vends)\b/i.test(lowerText);

    if (openNeg && !shouldStayInCore) {
      const negRes = await fetch(`${SUPABASE_URL}/functions/v1/waouh-negotiation-router`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          text,
          user_id: negUserId,
          thread_id: threadId ?? openNeg.thread_id,
          negotiation_id: openNeg.id,
          article_id: metaArticleId,
        }),
      });
      const negData = await negRes.json().catch(() => ({}));
      const negReply = negData?.reply || "OK";
      const negTxId = negData?.transaction_id || null;
      const negIntent = negData?.intent || "negotiation";
      const negActions: WaouhAction[] = Array.isArray(negData?.actions) ? negData.actions : [];
      const negAttachments = Array.isArray(negData?.attachments) ? negData.attachments : [];
      const negProducts = Array.isArray(negData?.products) ? negData.products : [];
      const suppressDirectReply = negData?.suppress_direct_reply === true;
      if (!suppressDirectReply) {
        await sb.from("waouh_messages").insert({
          conversation_id: convId,
          thread_id: negData?.thread_id ?? threadId ?? openNeg.thread_id,
          user_id: user.id, channel, direction: "out", text: negReply,
          web_session_id: sessionId, phone_number: phone,
          attachments: negAttachments,
          article_id: clientMeta?.article_id ?? null,
          meta: {
            intent: negIntent,
            workflow_state: negData?.workflow_state ?? null,
            role: negData?.role ?? clientMeta?.role ?? null,
            transaction_id: negTxId,
            deal_id: negData?.deal_id ?? null,
            article_id: negData?.article_id ?? clientMeta?.article_id ?? null,
            thread_id: negData?.thread_id ?? threadId ?? openNeg.thread_id,
            buyer_user_id: openNeg.buyer_user_id,
            seller_user_id: openNeg.seller_user_id,
            counterpart_user_id: requestedRole === "seller"
              ? openNeg.buyer_user_id
              : openNeg.seller_user_id,
            actions: negActions,
            products: negProducts,
          },
        });
        if (convId) {
          await sb.from("waouh_conversations")
            .update({ last_message: negReply, updated_at: new Date().toISOString() })
            .eq("id", convId);
        }
      }
      if (!suppressDirectReply && channel === "whatsapp" && phone && WAHA_BASE_URL) {
        try {
          const firstImage = negAttachments.find((a: any) => a?.url)?.url || null;
          await sendWahaReply(WAHA_BASE_URL, wahaSession, replyChatIds, negReply, negActions, firstImage);
        } catch (e) { console.error("WAHA send failed", e); }
      }
      await bindThreadState(sb, threadId ?? openNeg.thread_id, {
        negotiation_id: openNeg.id,
        deal_id: negData?.deal_id ?? null,
        transaction_id: negTxId,
        status: negData?.workflow_state ?? "negotiating",
      });
      return new Response(JSON.stringify({ ok: true, reply: negReply, intent: negIntent, workflow_state: negData?.workflow_state ?? null, role: negData?.role ?? null, thread_id: negData?.thread_id ?? threadId ?? openNeg.thread_id, transaction_id: negTxId, deal_id: negData?.deal_id ?? null, products: negProducts, actions: negActions, attachments: negAttachments, inbound_message_id: inboundMessageId, conversation_id: convId, user_id: user.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    }

    // Call core engine
    const coreRes = await fetch(`${SUPABASE_URL}/functions/v1/waouh-webhook`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        phone_number: phone || `web:${sessionId}`,
        web_session_id: sessionId,
        text, lat, lng, city, channel, attachments,
        user_id: user.id, auth_user_id: user.auth_user_id ?? authUserId,
        meta: clientMeta,
      }),
    });
    const core = await coreRes.json().catch(() => ({}));
    log("core reply", { ok: coreRes.ok, intent: core.intent, hasReply: !!core.reply });
    if (!coreRes.ok || core?.ok === false || core?.error) {
      const coreError = String(core?.error || core?.message || `HTTP ${coreRes.status}`);
      console.error("[waouh-channel-in] core rejected", {
        status: coreRes.status,
        error: coreError,
        action: routedAction,
        thread_id: threadId,
        article_id: inboundArticleId,
      });
      return new Response(JSON.stringify({
        ok: false,
        error: coreError,
        code: "waouh_core_rejected",
        thread_id: threadId,
        article_id: inboundArticleId,
        idempotency_key: idempotencyKey,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const reply: string = core.reply ?? "Votre demande a été prise en compte.";
    const actions: WaouhAction[] = Array.isArray(core.actions) ? core.actions : [];

    // Persist outgoing
    const outboundArticleId: string | null = core.article_id ?? inboundArticleId ?? null;
    const { data: outboundRow } = await sb.from("waouh_messages").insert({
      conversation_id: convId,
      thread_id: core.thread_id ?? threadId,
      user_id: user.id, channel, direction: "out", text: reply,
      web_session_id: sessionId, phone_number: phone,
      attachments: Array.isArray(core.attachments) ? core.attachments : [],
      article_id: outboundArticleId,
      meta: {
        intent: core.intent ?? null,
        workflow_state: core.workflow_state ?? null,
        role: core.role ?? clientMeta?.role ?? null,
        transaction_id: core.transaction_id ?? null,
        deal_id: core.deal_id ?? null,
        article_id: outboundArticleId,
        thread_id: core.thread_id ?? threadId,
        buyer_user_id: meet?.buyer_user_id ?? clientMeta?.buyer_user_id ?? null,
        seller_user_id: meet?.seller_user_id ?? clientMeta?.seller_user_id ?? null,
        counterpart_user_id: threadMeta.counterpart_user_id ?? null,
        actions,
        products: Array.isArray(core.products) ? core.products : [],
      },
    }).select("id").maybeSingle();
    const outboundMessageId: string | null = outboundRow?.id ?? null;
    if (convId) {
      await sb.from("waouh_conversations")
        .update({ last_message: reply, last_intent: core.intent ?? null, updated_at: new Date().toISOString() })
        .eq("id", convId);
    }

    // WAHA send — UN SEUL message par réponse (image + texte + boutons combinés si possible)
    if (channel === "whatsapp" && phone && WAHA_BASE_URL) {
      try {
        const firstImage = Array.isArray(core.attachments) ? core.attachments.find((a: any) => a?.url)?.url : null;
        await sendWahaReply(WAHA_BASE_URL, wahaSession, replyChatIds, reply, actions, firstImage);
      } catch (e) { console.error("WAHA send failed", e); }
    }

    return new Response(JSON.stringify({ ok: true, reply, intent: core.intent, workflow_state: core.workflow_state ?? null, role: core.role ?? null, thread_id: core.thread_id ?? threadId, search_thread_id: core.search_thread_id ?? (searchMeet?.id ?? null), actions, products: Array.isArray(core.products) ? core.products : [], attachments: Array.isArray(core.attachments) ? core.attachments : [], inbound_message_id: inboundMessageId, outbound_message_id: outboundMessageId, conversation_id: convId, user_id: user.id, article_id: outboundArticleId, deal_id: core.deal_id ?? null, transaction_id: core.transaction_id ?? null, action: routedAction, idempotency_key: idempotencyKey }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    console.error("[waouh-channel-in] error", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
