// WAOUH Outbound Dispatch — envoie les messages WhatsApp en attente via WAHA
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { resolveRealPhoneE164, stripLegacyPaymentText, lidToPhoneInline } from "../_shared/waouh-format.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WAHA_BASE_URL = Deno.env.get("WAHA_BASE_URL");
const WAHA_API_KEY = Deno.env.get("WAHA_API_KEY");
const WAHA_SESSION = Deno.env.get("WAHA_SESSION") || "WaouhApp";
const WAOUH_BUSINESS_PHONE = normalizeBeninPhone(Deno.env.get("WAOUH_BUSINESS_PHONE") || "65653468") || "22965653468";

const MAX_ATTEMPTS = 3;

function fmt(n: number | null | undefined) {
  if (n == null) return "prix à discuter";
  return Number(n).toLocaleString("fr-FR") + " FCFA";
}

function compose(template: string, p: any): string {
  if (p?.text) return String(p.text);
  switch (template) {
    case "match_buyer":
      return `🎯 *WAOUH a trouvé pour vous*\n━━━━━━━━━━━━━━━\n📦 *${p.title || "une annonce"}*\n💰 Prix : *${fmt(p.price)}*\n📍 Ville : ${p.city || "?"}\n${p.seller_rating ? `⭐ Vendeur : ${p.seller_rating}\n` : ""}━━━━━━━━━━━━━━━\n👉 Touchez un bouton ci-dessous, ou tapez *intéressé 1* / proposez un prix.`;
    case "match_seller":
      return `📩 *WAOUH — Acheteur intéressé*\n━━━━━━━━━━━━━━━\nUn acheteur cherche : *${p.category || "votre produit"}*${p.city ? `\n📍 ${p.city}` : ""}${p.budget ? `\n💰 Budget : ${fmt(p.budget)}` : ""}\n━━━━━━━━━━━━━━━\nRépondez via les boutons, ou *OUI* / *NON*.`;
    case "negotiation_open":
      return `🤝 *Nouvelle offre WAOUH*\n━━━━━━━━━━━━━━━\n📦 *${p.title || "votre annonce"}*\n💸 Offre : *${fmt(p.price)}*\n━━━━━━━━━━━━━━━\nAcceptez, refusez ou contre-proposez ci-dessous.`;
    case "payment_card":
    case "payment_link":
      return `💳 *Paiement sécurisé WAOUH*\n━━━━━━━━━━━━━━━\n📦 ${p.title || "Transaction"}\n💰 Montant : *${fmt(p.amount)}*\n🔒 Escrow — fonds libérés à réception\n📱 Mobile Money MTN / Moov\n━━━━━━━━━━━━━━━\n🔗 ${p.url}\n\nTouchez *Payer maintenant* pour valider.`;
    case "order_recap":
      return `📋 *Récapitulatif commande*\n━━━━━━━━━━━━━━━\n📦 ${p.title || "—"}\n💰 ${fmt(p.amount)}\n📍 Livraison : ${p.delivery || "à convenir"}\n👤 Vendeur : ${p.seller_name || "—"}\n━━━━━━━━━━━━━━━`;
    default:
      return p.text || "Message WAOUH";
  }
}

function normalizeBeninPhone(value: string) {
  const original = String(value || "");
  if (original.includes("@lid")) return original.replace(/[^0-9@.a-z]/gi, "");
  const digits = original.replace(/\D/g, "");
  if (!digits) return null;
  // 🚧 Garde-fou : refuse les numéros impossiblement longs (typiquement un LID camouflé).
  if (digits.length > 13) return null;
  if (digits.startsWith("00229")) return digits.slice(2);
  if (digits.startsWith("229")) return digits.length <= 13 ? digits : null;
  if (digits.length === 8 || (digits.length === 10 && digits.startsWith("01"))) return `229${digits}`;
  return digits.length > 8 && digits.length <= 13 ? digits : null;
}


/**
 * Pour un numéro Bénin, génère les deux candidats JID possibles :
 *  - format 10 chiffres (réforme 2021)        ex: 2290191299191
 *  - format 8 chiffres historique (sans 01)   ex: 22991299191
 * WhatsApp accepte généralement l'un des deux selon comment la ligne a été enregistrée.
 * On essaie les deux séquentiellement dans le dispatcher pour fiabiliser la livraison.
 */
function beninPhoneCandidates(canonical: string): string[] {
  if (!canonical) return [];
  if (canonical.includes("@")) return [canonical];
  const out: string[] = [canonical];
  if (canonical.startsWith("229")) {
    const local = canonical.slice(3);
    if (local.length === 10 && local.startsWith("01")) {
      const eight = `229${local.slice(2)}`;
      if (!out.includes(eight)) out.push(eight);
    } else if (local.length === 8) {
      const ten = `22901${local}`;
      if (!out.includes(ten)) out.push(ten);
    }
  }
  return out;
}

async function sendWahaText(base: string, session: string, chatId: string, text: string, headers: Record<string, string>) {
  const payload = JSON.stringify({ session, chatId, text });
  let r = await fetch(`${base}/api/sendText`, { method: "POST", headers, body: payload });
  if (r.ok) return r;
  r = await fetch(`${base}/api/${session}/sendText`, { method: "POST", headers, body: JSON.stringify({ chatId, text }) });
  return r;
}

async function sendWahaImage(base: string, session: string, chatId: string, imageUrl: string, caption: string, headers: Record<string, string>) {
  let r = await fetch(`${base}/api/sendImage`, {
    method: "POST",
    headers,
    body: JSON.stringify({ session, chatId, file: { url: imageUrl }, caption }),
  });
  if (r.ok) return r;
  return fetch(`${base}/api/${session}/sendImage`, {
    method: "POST",
    headers,
    body: JSON.stringify({ chatId, file: { url: imageUrl }, caption }),
  });
}

async function sendWahaButtons(base: string, session: string, chatId: string, text: string, actions: Array<{ id: string; label: string; url?: string; phone?: string }>, headers: Record<string, string>, footer?: string, title?: string, imageUrl?: string | null) {
  const richButtons = actions.slice(0, 3).map((a) => {
    if (a.url) return { type: "url", url: a.url, text: a.label };
    if (a.phone) return { type: "call", phoneNumber: a.phone, text: a.label };
    return { type: "reply", reply: { id: a.id, title: a.label } };
  });
  const richBody: any = { session, chatId, body: text, footer: footer || "WAOUH • bot.bj", buttons: richButtons };
  if (title) richBody.header = title;
  if (imageUrl) richBody.header = { image: { url: imageUrl } };
  let r = await fetch(`${base}/api/sendButtons`, { method: "POST", headers, body: JSON.stringify(richBody) });
  if (r.ok) return r;
  r = await fetch(`${base}/api/${session}/sendButtons`, { method: "POST", headers, body: JSON.stringify({ ...richBody, session: undefined }) });
  if (r.ok) return r;
  // Legacy simple format (boutons WAHA encore acceptés). Si échec, on tombe en
  // texte simple SANS jamais ré-injecter de liste numérotée « 1./2./3. ».
  const buttons = actions.slice(0, 3).map((a) => ({ id: a.id, text: a.label }));
  r = await fetch(`${base}/api/sendButtons`, { method: "POST", headers, body: JSON.stringify({ session, chatId, text, buttons }) });
  if (r.ok) return r;
  if (imageUrl) return sendWahaImage(base, session, chatId, imageUrl, text, headers);
  return sendWahaText(base, session, chatId, text, headers);
}


function defaultActionsForTemplate(_template: string, _p: any): Array<{ id: string; label: string; url?: string; phone?: string }> {
  // Parcours 100 % conversationnel : plus aucune action par défaut (OUI / NON / Je propose XXX).
  return [];
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const { limit = 50 } = req.method === "POST" ? await req.json().catch(() => ({})) : {};

    const nowIso = new Date().toISOString();
    const { data: items, error } = await sb
      .from("waouh_outbound_queue")
      .select("*")
      .eq("status", "pending")
      .lt("attempts", MAX_ATTEMPTS)
      .or(`next_attempt_at.is.null,next_attempt_at.lte.${nowIso}`)
      .order("created_at", { ascending: true })
      .limit(limit);
    if (error) throw error;

    let sent = 0, failed = 0, skipped = 0;

    for (const it of items || []) {
      // 🔒 Verrouillage atomique : pending→sending.
      const { data: claimed } = await sb
        .from("waouh_outbound_queue")
        .update({ status: "sending", attempts: it.attempts + 1 })
        .eq("id", it.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      if (!claimed) { skipped++; continue; }

      const finishFailed = async (err: string, retry = false) => {
        const newAttempts = it.attempts + 1;
        const shouldRetry = retry && newAttempts < MAX_ATTEMPTS;
        const backoffSec = Math.min(60 * Math.pow(2, newAttempts), 600); // 2,4,8…min, cap 10 min
        await sb.from("waouh_outbound_queue").update({
          status: shouldRetry ? "pending" : "failed",
          last_error: err.slice(0, 500),
          next_attempt_at: shouldRetry ? new Date(Date.now() + backoffSec * 1000).toISOString() : null,
        }).eq("id", it.id);
        failed++;
      };

      // Web-only : pas de téléphone → realtime web suffit
      if ((it.channel && it.channel === "web") || !it.to_phone) {
        await sb.from("waouh_outbound_queue").update({
          status: it.web_session_id ? "sent" : "failed",
          last_error: it.web_session_id ? null : "no phone",
          sent_at: new Date().toISOString(),
        }).eq("id", it.id);
        skipped++; continue;
      }
      if (!WAHA_BASE_URL) {
        await finishFailed("WAHA_BASE_URL missing", true);
        continue;
      }

      const rawText = compose(it.template, it.payload || {});
      const text = stripLegacyPaymentText(rawText);
      let toPhone = it.to_phone as string;

      // 🛟 Détection LID camouflé (229 suivi de >10 chiffres) — escalade en résolution LID
      // au lieu d'envoyer à un numéro fictif que WAHA refusera ("no WA contact").
      if (typeof toPhone === "string" && /^229\d{11,}$/.test(toPhone.replace(/\D/g, ""))) {
        const stripped = toPhone.replace(/\D/g, "").slice(3); // retire le faux "229"
        toPhone = `${stripped}@lid`;
        // Aligne aussi waouh_users pour les prochaines fois.
        if (it.to_user_id) {
          try {
            await sb.from("waouh_users").update({ phone_number: toPhone }).eq("id", it.to_user_id);
          } catch (_) { /* ignore */ }
        }
      }

      // Dernier verrou central : avant tout envoi, re-résoudre le numéro réel
      // depuis l'utilisateur + l'annonce pour éviter @lid/profil obsolète.
      if (it.to_user_id) {
        try {
          const { data: targetUser } = await sb
            .from("waouh_users")
            .select("id, phone_number, auth_user_id")
            .eq("id", it.to_user_id)
            .maybeSingle();
          const role = it.payload?.target_role === "seller" || it.payload?.target_role === "buyer"
            ? it.payload.target_role
            : (it.template === "match_seller" || it.event_type === "seller_new_interest" ? "seller" : "buyer");
          const resolved = await resolveRealPhoneE164(sb, targetUser, { article_id: it.payload?.article_id ?? null, role });
          if (resolved) toPhone = resolved;
        } catch (_) { /* garde le to_phone déjà en file */ }

      }

      // 🔁 LID anonyme → résolution via waouh_lid_phone_map (cache) puis
      // fallback live WAHA /api/contacts/all avant tout envoi.
      if (typeof toPhone === "string" && /@lid/i.test(toPhone)) {
        let resolved: string | null = null;
        try {
          resolved = await lidToPhoneInline(sb, toPhone, { session: WAHA_SESSION, wahaBase: WAHA_BASE_URL, wahaApiKey: WAHA_API_KEY });
        } catch (_) { /* ignore */ }
        if (resolved && resolved.length >= 10) {
          toPhone = resolved;
          // Backfill silencieux du waouh_user pour les prochains messages.
          if (it.to_user_id) {
            try {
              await sb.from("waouh_users")
                .update({ phone_number: resolved })
                .eq("id", it.to_user_id)
                .like("phone_number", "%@lid");
            } catch (_) { /* ignore */ }
          }
        } else {
          // 🔓 Pas de mapping E.164 — mais WAHA accepte parfaitement un chatId
          // au format `<lid>@lid` pour les conversations déjà ouvertes (cf.
          // waouh-channel-in qui répond ainsi avec status 201). On garde donc
          // le LID tel quel comme chatId et on continue l'envoi.
          // toPhone reste `<digits>@lid` → traité comme candidate brute plus bas.
        }
      }


      const phone = normalizeBeninPhone(toPhone);
      if (!phone || (phone.includes("@") && !phone.includes("@lid"))) {
        await sb.from("waouh_outbound_queue").update({ status: "failed", last_error: "invalid phone" }).eq("id", it.id);
        failed++; continue;
      }
      if (phone === WAOUH_BUSINESS_PHONE) {
        await sb.from("waouh_outbound_queue").update({ status: "sent", last_error: "skipped business self", sent_at: new Date().toISOString() }).eq("id", it.id);
        skipped++; continue;
      }
      const candidates = phone.includes("@lid") ? [phone] : beninPhoneCandidates(phone);
      const wahaBase = WAHA_BASE_URL.replace(/\/$/, "");
      const wahaHeaders = { "Content-Type": "application/json", ...(WAHA_API_KEY ? { "X-Api-Key": WAHA_API_KEY } : {}) };
      const customActions = Array.isArray(it.payload?.actions) ? it.payload.actions : [];
      const actions = customActions.length > 0 ? customActions : defaultActionsForTemplate(it.template, it.payload || {});
      const footer = it.payload?.footer || "WAOUH • Marché conversationnel";

      // 🔎 Pré-vol checkExists : on demande à WAHA quel JID correspond réellement
      // à chacun de nos candidats Bénin (8 vs 10 chiffres). Évite les faux 200
      // quand WAHA accepte un sendText vers un numéro non enregistré sur WhatsApp.
      const resolvedChatIds: string[] = [];
      const seenChat = new Set<string>();
      for (const candidate of candidates) {
        if (candidate.includes("@")) {
          if (!seenChat.has(candidate)) { seenChat.add(candidate); resolvedChatIds.push(candidate); }
          continue;
        }
        let mappedChatId: string | null = null;
        for (const path of [`/api/${WAHA_SESSION}/contacts/check-exists?phone=${encodeURIComponent(candidate)}`, `/api/contacts/check-exists?phone=${encodeURIComponent(candidate)}&session=${encodeURIComponent(WAHA_SESSION)}`]) {
          try {
            const cr = await fetch(`${wahaBase}${path}`, { headers: wahaHeaders });
            if (!cr.ok) { await cr.text().catch(() => ""); continue; }
            const cj = await cr.json().catch(() => null);
            if (cj && (cj.numberExists === true || cj.exists === true) && typeof cj.chatId === "string") {
              mappedChatId = cj.chatId; break;
            }
            if (cj && cj.numberExists === false) { mappedChatId = ""; break; } // explicitly not on WA
          } catch (_e) { /* ignore */ }
        }
        if (mappedChatId === "") continue; // skip candidates confirmed absent
        const chatId = mappedChatId || `${candidate}@c.us`;
        if (!seenChat.has(chatId)) { seenChat.add(chatId); resolvedChatIds.push(chatId); }
      }
      if (resolvedChatIds.length === 0) {
        await sb.from("waouh_outbound_queue").update({ status: "failed", last_error: `no WA contact for ${phone}` }).eq("id", it.id);
        failed++; continue;
      }

      let lastErr = "";
      let lastTransient = false;
      let delivered = false;
      let usedChatId: string | null = null;
      try {
        for (const chatId of resolvedChatIds) {
          let r: Response;
          if (actions.length > 0) {
            r = await sendWahaButtons(wahaBase, WAHA_SESSION, chatId, text, actions, wahaHeaders, footer, undefined, it.image_url || null);
          } else if (it.image_url) {
            r = await sendWahaImage(wahaBase, WAHA_SESSION, chatId, it.image_url, text, wahaHeaders);
          } else {
            r = await sendWahaText(wahaBase, WAHA_SESSION, chatId, text, wahaHeaders);
          }
          if (r.ok) { delivered = true; usedChatId = chatId; break; }
          const body = await r.text();
          lastErr = `WAHA ${r.status} [${chatId}]: ${body.slice(0, 200)}`;
          lastTransient = r.status === 422 || r.status === 429 || r.status >= 500;
          if (lastTransient) break;
        }
        if (!delivered) {
          await finishFailed(lastErr || "WAHA send failed", lastTransient);
          continue;
        }
        await sb.from("waouh_outbound_queue").update({
          status: "sent", sent_at: new Date().toISOString(), last_error: usedChatId ? `delivered via ${usedChatId}` : null,
        }).eq("id", it.id);
        sent++;
      } catch (e: any) {
        // Erreur réseau → retry
        await finishFailed(String(e.message || e), true);
      }
    }

    return new Response(JSON.stringify({ ok: true, processed: items?.length || 0, sent, failed, skipped }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[waouh-outbound-dispatch]", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
