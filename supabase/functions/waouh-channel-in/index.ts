import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

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
    const lat = raw.lat ?? 6.36;
    const lng = raw.lng ?? 2.42;
    const city = raw.city ?? "Cotonou";
    const authUserId: string | null = raw.authUserId ?? null;

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
          location: `SRID=4326;POINT(${lng} ${lat})` as any,
        }).select().single();
        if (error) log("user insert error", error);
        user = created;
      } else if (authUserId && !user.auth_user_id) {
        await sb.from("waouh_users").update({ auth_user_id: authUserId, city }).eq("id", user.id);
      } else if (city && city !== user.city) {
        await sb.from("waouh_users").update({ city }).eq("id", user.id);
      }
    } else {
      const { data: existing } = await sb.from("waouh_users").select("*").eq("phone_number", phone).maybeSingle();
      user = existing;
      if (!user) {
        const { data: created } = await sb.from("waouh_users").insert({
          phone_number: phone, channel: "whatsapp", city,
          location: `SRID=4326;POINT(${lng} ${lat})` as any,
        }).select().single();
        user = created;
      }
    }
    log("user", { id: user?.id });

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
    const { data: inboundRow } = await sb.from("waouh_messages").insert({
      conversation_id: convId,
      user_id: user.id, channel, direction: "in", text: text || "(image)",
      web_session_id: sessionId, phone_number: phone,
      attachments,
      meta: { to_phone: toPhone || WAOUH_BUSINESS_PHONE, session: wahaSession },
    }).select("id").maybeSingle();
    const inboundMessageId: string | null = inboundRow?.id ?? null;


    // Negotiation routing : si l'utilisateur a une négo ouverte, route vers negotiation-router
    const { data: openNeg } = await sb
      .from("waouh_negotiations")
      .select("id")
      .or(`buyer_user_id.eq.${user.id},seller_user_id.eq.${user.id}`)
      .in("state", ["proposed", "countered"])
      .limit(1)
      .maybeSingle();

    const lowerText = (text || "").toLowerCase();
    const shouldStayInCore = /(?:int[ée]ress[ée]|interesse)\s*(?:n[°o]?\s*)?(?:x|\d+)|\b(?:je\s+)?(?:cherche|vends)\b/i.test(lowerText);

    if (openNeg && !shouldStayInCore) {
      const negRes = await fetch(`${SUPABASE_URL}/functions/v1/waouh-negotiation-router`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
        body: JSON.stringify({ phone, text, user_id: user.id }),
      });
      const negData = await negRes.json().catch(() => ({}));
      const negReply = negData?.reply || "OK";
      const negTxId = negData?.transaction_id || null;
      const negIntent = negData?.intent || "negotiation";
      const negActions: WaouhAction[] = Array.isArray(negData?.actions) ? negData.actions : [];
      const negAttachments = Array.isArray(negData?.attachments) ? negData.attachments : [];
      await sb.from("waouh_messages").insert({
        conversation_id: convId,
        user_id: user.id, channel, direction: "out", text: negReply,
        web_session_id: sessionId, phone_number: phone,
        attachments: negAttachments,
        meta: { intent: negIntent, transaction_id: negTxId, actions: negActions },
      });
      if (convId) {
        await sb.from("waouh_conversations")
          .update({ last_message: negReply, updated_at: new Date().toISOString() })
          .eq("id", convId);
      }
      if (channel === "whatsapp" && phone && WAHA_BASE_URL) {
        try {
          const firstImage = negAttachments.find((a: any) => a?.url)?.url || null;
          await sendWahaReply(WAHA_BASE_URL, wahaSession, replyChatIds, negReply, negActions, firstImage);
        } catch (e) { console.error("WAHA send failed", e); }
      }
      return new Response(JSON.stringify({ ok: true, reply: negReply, intent: negIntent, transaction_id: negTxId, attachments: negAttachments, inbound_message_id: inboundMessageId, conversation_id: convId, user_id: user.id }), {
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
      }),
    });
    const core = await coreRes.json().catch(() => ({}));
    log("core reply", { ok: coreRes.ok, intent: core.intent, hasReply: !!core.reply });
    const reply: string = core.reply ?? "Désolé, une erreur est survenue. Réessayez.";
    const actions: WaouhAction[] = Array.isArray(core.actions) ? core.actions : [];

    // Persist outgoing
    await sb.from("waouh_messages").insert({
      conversation_id: convId,
      user_id: user.id, channel, direction: "out", text: reply,
      web_session_id: sessionId, phone_number: phone,
      attachments: Array.isArray(core.attachments) ? core.attachments : [],
      meta: { intent: core.intent ?? null, transaction_id: core.transaction_id ?? null, article_id: core.article_id ?? null, actions },
    });
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

    return new Response(JSON.stringify({ ok: true, reply, intent: core.intent, actions, inbound_message_id: inboundMessageId, conversation_id: convId, user_id: user.id, article_id: core.article_id ?? null, transaction_id: core.transaction_id ?? null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    console.error("[waouh-channel-in] error", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
