// WAOUH Outbound Dispatch — envoie les messages WhatsApp en attente via WAHA
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

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
  if (digits.startsWith("229")) return digits;
  if (digits.length === 8 || (digits.length === 10 && digits.startsWith("01"))) return `229${digits}`;
  return digits.length > 8 ? digits : null;
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
  // Legacy simple format
  const buttons = actions.slice(0, 3).map((a) => ({ id: a.id, text: a.label }));
  r = await fetch(`${base}/api/sendButtons`, { method: "POST", headers, body: JSON.stringify({ session, chatId, text, buttons }) });
  if (r.ok) return r;
  // Final fallback : image (si présente) + texte avec options numérotées
  if (imageUrl) await sendWahaImage(base, session, chatId, imageUrl, text, headers);
  const lines = actions.map((a, i) => `${i + 1}. ${a.label}${a.url ? ` → ${a.url}` : a.phone ? ` ☎ ${a.phone}` : ""}`).join("\n");
  return sendWahaText(base, session, chatId, imageUrl ? `_Répondez avec le numéro de votre choix :_\n${lines}` : `${text}\n\n${lines}`, headers);
}

function defaultActionsForTemplate(template: string, p: any): Array<{ id: string; label: string; url?: string; phone?: string }> {
  switch (template) {
    case "match_buyer":
      return [
        { id: `interest:${p.product_id || ""}`, label: "✅ Intéressé" },
        { id: `negotiate:${p.product_id || ""}`, label: "💬 Négocier" },
        { id: `skip:${p.product_id || ""}`, label: "⏭️ Passer" },
      ];
    case "match_seller":
      return [
        { id: `match_yes:${p.product_id || ""}`, label: "✅ Oui, mettre en contact" },
        { id: `match_no:${p.product_id || ""}`, label: "❌ Non merci" },
      ];
    case "negotiation_open":
      return [
        { id: `accept:${p.negotiation_id || ""}`, label: "✅ Accepter" },
        { id: `counter:${p.negotiation_id || ""}`, label: "💬 Contre-offre" },
        { id: `refuse:${p.negotiation_id || ""}`, label: "❌ Refuser" },
      ];
    case "payment_card":
    case "payment_link":
      return [
        ...(p.url ? [{ id: "pay_open", label: "💳 Payer maintenant", url: p.url }] : []),
        { id: `pay_help:${p.transaction_id || ""}`, label: "❓ Aide paiement" },
        { id: `pay_cancel:${p.transaction_id || ""}`, label: "✖️ Annuler" },
      ];
    default:
      return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const { limit = 50 } = req.method === "POST" ? await req.json().catch(() => ({})) : {};

    const { data: items, error } = await sb
      .from("waouh_outbound_queue")
      .select("*")
      .eq("status", "pending")
      .lt("attempts", MAX_ATTEMPTS)
      .order("created_at", { ascending: true })
      .limit(limit);
    if (error) throw error;

    let sent = 0, failed = 0, skipped = 0;

    for (const it of items || []) {
      // Skip web-only entries (frontend listens via Realtime)
      if ((it.channel && it.channel === "web") || !it.to_phone) {
        if (!it.to_phone) {
          await sb.from("waouh_outbound_queue").update({ status: it.web_session_id ? "sent" : "failed", last_error: it.web_session_id ? null : "no phone", sent_at: new Date().toISOString() }).eq("id", it.id);
          skipped++; continue;
        }
      }
      if (!WAHA_BASE_URL) {
        await sb.from("waouh_outbound_queue").update({ attempts: it.attempts + 1, last_error: "WAHA_BASE_URL missing" }).eq("id", it.id);
        skipped++; continue;
      }

      const text = compose(it.template, it.payload || {});
      const phone = normalizeBeninPhone(it.to_phone);
      if (!phone) {
        await sb.from("waouh_outbound_queue").update({ status: "failed", attempts: it.attempts + 1, last_error: "invalid phone" }).eq("id", it.id);
        failed++; continue;
      }
      if (phone === WAOUH_BUSINESS_PHONE) {
        await sb.from("waouh_outbound_queue").update({ status: "sent", attempts: it.attempts + 1, last_error: "skipped business self", sent_at: new Date().toISOString() }).eq("id", it.id);
        skipped++; continue;
      }
      const chatId = phone.includes("@") ? phone : `${phone}@c.us`;
      const wahaBase = WAHA_BASE_URL.replace(/\/$/, "");
      const wahaHeaders = { "Content-Type": "application/json", ...(WAHA_API_KEY ? { "X-Api-Key": WAHA_API_KEY } : {}) };
      try {
        let r: Response;
        const customActions = Array.isArray(it.payload?.actions) ? it.payload.actions : [];
        const actions = customActions.length > 0 ? customActions : defaultActionsForTemplate(it.template, it.payload || {});
        const footer = it.payload?.footer || "WAOUH • Marché conversationnel";
        if (it.image_url) {
          r = await sendWahaImage(wahaBase, WAHA_SESSION, chatId, it.image_url, text, wahaHeaders);
          if (r.ok && actions.length > 0) await sendWahaButtons(wahaBase, WAHA_SESSION, chatId, "Actions rapides", actions, wahaHeaders, footer);
        } else if (actions.length > 0) {
          r = await sendWahaButtons(wahaBase, WAHA_SESSION, chatId, text, actions, wahaHeaders, footer);
        } else {
          r = await sendWahaText(wahaBase, WAHA_SESSION, chatId, text, wahaHeaders);
        }
        if (!r.ok) {
          const body = await r.text();
          throw new Error(`WAHA ${r.status}: ${body.slice(0, 200)}`);
        }
        await sb.from("waouh_outbound_queue").update({
          status: "sent", sent_at: new Date().toISOString(), attempts: it.attempts + 1,
        }).eq("id", it.id);
        sent++;
      } catch (e: any) {
        const newAttempts = it.attempts + 1;
        await sb.from("waouh_outbound_queue").update({
          attempts: newAttempts,
          status: newAttempts >= MAX_ATTEMPTS ? "failed" : "pending",
          last_error: String(e.message || e),
        }).eq("id", it.id);
        failed++;
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
