// WAOUH Payment - Qosic Mobile Money escrow flow
// Actions: init (request from buyer), status (poll), release (deposit to seller)
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { contactExchangeText } from "../_shared/waouh-format.ts";
import { pushSyncedEvent } from "../_shared/waouh-sync.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const QOSIC_BASE = (Deno.env.get("QOSIC_BASE_URL") || "https://staging.qosic.net:9010").replace(/^http:\/\//, "https://");
const QOSIC_USER = Deno.env.get("QOSIC_USERNAME") || "";
const QOSIC_PASS = Deno.env.get("QOSIC_PASSWORD") || "";
const PAYMENT_MODE = (Deno.env.get("WAOUH_PAYMENT_MODE") || "demo").toLowerCase(); // "demo" | "live"
const DEMO_DELAY_MS = Number(Deno.env.get("WAOUH_DEMO_DELAY_MS") || "3000");
const CLIENT_IDS: Record<string, string | undefined> = {
  mtn: Deno.env.get("QOSIC_MTN_CLIENT_ID"),
  moov: Deno.env.get("QOSIC_MOOV_CLIENT_ID"),
  sbin: Deno.env.get("QOSIC_SBIN_CLIENT_ID"),
};

const auth = () => "Basic " + btoa(`${QOSIC_USER}:${QOSIC_PASS}`);
const newRef = (prefix: string) => {
  const ts = Date.now().toString().slice(-9);
  const r = Math.random().toString(36).slice(2, 7);
  return `${prefix}_${ts}_${r}`.slice(0, 19);
};

const normalizeBeninMsisdn = (value: string) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return null;
  let local = digits;
  if (local.startsWith("00229")) local = local.slice(5);
  if (local.startsWith("229")) local = local.slice(3);
  if (local.length === 9 && local.startsWith("1")) local = `0${local}`;
  if (local.length > 10) local = local.slice(-10).startsWith("01") ? local.slice(-10) : local.slice(-8);
  if (local.length === 8 || (local.length === 10 && local.startsWith("01"))) return local;
  return null;
};

const reqEndpoint = (op: string) => {
  if (op === "mtn") return `${QOSIC_BASE}/QosicBridge/user/requestpayment`;
  if (op === "moov") return `${QOSIC_BASE}/QosicBridge/user/requestpaymentmv`;
  return `${QOSIC_BASE}/QosicBridge/sb/v1/requestpayment`;
};
const depositEndpoint = (op: string) =>
  op === "mtn"
    ? `${QOSIC_BASE}/QosicBridge/user/depositpayment`
    : `${QOSIC_BASE}/QosicBridge/user/depositpaymentmv`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const body = await req.json();
    const action = body.action as "init" | "status" | "release";

    // Try authenticated user (optional in demo mode – falls back to x-waouh-session)
    const authHeader = req.headers.get("Authorization");
    const sessionHeader = req.headers.get("x-waouh-session");
    let userId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await sb.auth.getUser(token);
      userId = data?.user?.id ?? null;
    }

    // Resolve waouh_users.id from auth user OR web session
    let waouhBuyerId: string | null = null;
    if (userId) {
      const { data: wu } = await sb.from("waouh_users").select("id").eq("auth_user_id", userId).maybeSingle();
      waouhBuyerId = wu?.id ?? null;
    }
    if (!waouhBuyerId && sessionHeader) {
      const { data: wu } = await sb.from("waouh_users").select("id").eq("web_session_id", sessionHeader).maybeSingle();
      waouhBuyerId = wu?.id ?? null;
    }

    // ---------------- INIT ----------------
    if (action === "init") {
      const { transaction_id, msisdn, operator, waouh_buyer_id } = body as { transaction_id: string; msisdn: string; operator: string; waouh_buyer_id?: string };
      const op = (operator || "mtn").toLowerCase();
      if (!transaction_id || !msisdn) {
        return json({ error: "Paramètres invalides" }, 400);
      }
      const serviceCall = authHeader === `Bearer ${SERVICE_ROLE}`;
      if (!waouhBuyerId && serviceCall && waouh_buyer_id) waouhBuyerId = waouh_buyer_id;
      if (PAYMENT_MODE === "live" && !CLIENT_IDS[op]) {
        return json({ error: "Opérateur non configuré" }, 400);
      }
      // In LIVE mode auth is mandatory; in DEMO mode we accept web session for testing
      if (PAYMENT_MODE === "live" && !userId && !serviceCall) return json({ error: "Authentification requise" }, 401);
      if (PAYMENT_MODE === "demo" && !userId && !waouhBuyerId) {
        return json({ error: "Session introuvable. Rechargez la page." }, 401);
      }

      const { data: tx, error: txErr } = await sb.from("waouh_transactions").select("*").eq("id", transaction_id).single();
      if (txErr || !tx) return json({ error: "Transaction introuvable" }, 404);
      const allowedBuyerId = waouhBuyerId ?? userId;
      if (tx.buyer_id && allowedBuyerId && tx.buyer_id !== allowedBuyerId && PAYMENT_MODE === "live") {
        return json({ error: "Vous n'êtes pas l'acheteur de cette transaction" }, 403);
      }
      if (["paid", "released", "completed"].includes(tx.status)) {
        return json({ error: "Transaction déjà payée" }, 409);
      }

      const cleanPhone = normalizeBeninMsisdn(msisdn);
      if (!cleanPhone) return json({ error: "Numéro invalide. Utilisez le format local, ex: 0165653468" }, 400);

      // 🧪 Demo MTN sandbox — toujours success (solde virtuel 10 000 000 FCFA)
      const DEMO_MTN_MSISDNS = new Set(["0165653468", "65653468"]);
      const DEMO_BALANCE = 10_000_000;
      const isDemoMsisdn = DEMO_MTN_MSISDNS.has(cleanPhone);
      if (isDemoMsisdn && Number(tx.amount) > DEMO_BALANCE) {
        return json({ error: "Solde démo insuffisant" }, 400);
      }

      const transref = newRef("WPAY");
      const { data: pay, error: payErr } = await sb
        .from("waouh_payments")
        .insert({
          transaction_id,
          user_id: userId,
          msisdn: cleanPhone,
          operator: op,
          amount: tx.amount,
          qosic_transref: transref,
          payment_type: "request",
          status: "initiated",
        })
        .select()
        .single();
      if (payErr) throw payErr;

      // Ensure buyer_id is set
      if (!tx.buyer_id) {
        await sb.from("waouh_transactions").update({ buyer_id: allowedBuyerId }).eq("id", transaction_id);
      }

      // ---- DEMO MODE: skip Qosic, simulate success after a short delay ----
      if (PAYMENT_MODE === "demo" || isDemoMsisdn) {
        await sb.from("waouh_payments").update({
          status: "success",
          qosic_response: { demo: true, simulated: true, finalized_at: new Date().toISOString() },
        }).eq("id", pay.id);
        await sb.from("waouh_transactions").update({ status: "paid", escrow_status: "held" }).eq("id", transaction_id);
        const { data: txAfter } = await sb.from("waouh_transactions").select("buyer_id, seller_id, article_id, amount").eq("id", transaction_id).single();
        if (txAfter) {
          await pushSystemMessage(sb, txAfter.buyer_id, transaction_id, `✅ Paiement confirmé (mode démo). Fonds en escrow : ${Number(txAfter.amount).toLocaleString("fr-FR")} FCFA.`);
          await pushSystemMessage(sb, txAfter.seller_id, transaction_id, `💰 Acheteur a payé (mode démo). Préparez la livraison.`);
          await exchangeContacts(sb, txAfter.buyer_id, txAfter.seller_id, transaction_id);
        }
        return json({ success: true, status: "success", payment_id: pay.id, transref, demo: true, message: "Mode démo : paiement confirmé sans vérification." });
      }

      // ---- LIVE MODE: call Qosic ----
      const payload = {
        msisdn: cleanPhone,
        amount: String(tx.amount),
        firstname: "Client",
        lastname: "WAOUH",
        transref,
        clientid: CLIENT_IDS[op],
      };

      const r = await fetch(reqEndpoint(op), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Basic " + btoa(`${QOSIC_USER}:${QOSIC_PASS}`) },
        body: JSON.stringify(payload),
      });
      const txt = await r.text();
      let raw: any = {};
      try { raw = JSON.parse(txt); } catch { raw = { raw: txt }; }

      const ok = raw.responsecode === "01" || raw.responsecode === "00";
      await sb.from("waouh_payments").update({
        status: ok ? "pending" : "failed",
        qosic_response: raw,
        error_message: ok ? null : (raw.responsemsg || txt.slice(0, 200)),
      }).eq("id", pay.id);

      if (!ok) return json({ success: false, error: raw.responsemsg || "Échec initiation Qosic", raw });

      return json({ success: true, payment_id: pay.id, transref, message: "Validez la notification Mobile Money sur votre téléphone." });
    }

    // ---------------- STATUS ----------------
    if (action === "status") {
      const { transaction_id } = body;
      const { data: pay } = await sb
        .from("waouh_payments")
        .select("*")
        .eq("transaction_id", transaction_id)
        .eq("payment_type", "request")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!pay) return json({ status: "none" });

      if (pay.status === "success" || pay.status === "failed") {
        return json({ status: pay.status, payment: pay });
      }

      // Demo: status follows the payments row directly (no Qosic poll)
      let raw: any = {};
      if (PAYMENT_MODE === "live") {
        const r = await fetch(`${QOSIC_BASE}/QosicBridge/user/gettransactionstatus`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Basic " + btoa(`${QOSIC_USER}:${QOSIC_PASS}`) },
          body: JSON.stringify({ transref: pay.qosic_transref, clientid: CLIENT_IDS[pay.operator] }),
        }).catch(() => null);
        if (r) { try { raw = await r.json(); } catch { raw = {}; } }
      } else {
        // Re-read payments row (it may have been updated by the demo finalize)
        const { data: fresh } = await sb.from("waouh_payments").select("status").eq("id", pay.id).maybeSingle();
        if (fresh?.status === "success") raw = { responsecode: "00" };
        else if (fresh?.status === "failed") raw = { responsecode: "99" };
        else raw = { responsecode: "01" };
      }

      let newStatus: string = pay.status;
      if (raw.responsecode === "00") newStatus = "success";
      else if (raw.responsecode === "01") newStatus = "pending";
      else if (raw.responsecode) newStatus = "failed";

      if (newStatus !== pay.status) {
        await sb.from("waouh_payments").update({ status: newStatus, qosic_response: raw }).eq("id", pay.id);

        if (newStatus === "success") {
          await sb.from("waouh_transactions").update({
            status: "paid",
            escrow_status: "held",
          }).eq("id", transaction_id);

          // System message in chat
          const { data: tx } = await sb.from("waouh_transactions").select("article_id, buyer_id, seller_id, amount").eq("id", transaction_id).single();
          if (tx?.buyer_id) {
            await pushSystemMessage(sb, tx.buyer_id, transaction_id, "✅ Paiement reçu. Fonds bloqués en escrow jusqu'à confirmation de réception.");
            await pushSystemMessage(sb, tx.seller_id, transaction_id, `💰 Paiement reçu (${Number(tx.amount).toLocaleString("fr-FR")} FCFA). Préparez la livraison.`);
            await exchangeContacts(sb, tx.buyer_id, tx.seller_id, transaction_id);
          }
        } else if (newStatus === "failed") {
          await sb.from("waouh_transactions").update({ status: "payment_pending" }).eq("id", transaction_id);
        }
      }

      return json({ status: newStatus, payment: { ...pay, status: newStatus } });
    }

    // ---------------- RELEASE ----------------
    if (action === "release") {
      const { transaction_id } = body;
      if (!userId) return json({ error: "Auth requise" }, 401);

      const { data: tx } = await sb.from("waouh_transactions").select("*, seller:waouh_users!seller_id(*)").eq("id", transaction_id).single();
      if (!tx || tx.buyer_id !== userId) return json({ error: "Non autorisé" }, 403);
      if (tx.status !== "paid") return json({ error: "Transaction non payée" }, 400);

      const sellerPhone = (tx.seller?.phone_number || "").replace(/\D/g, "");
      if (!/^229\d{8}$/.test(sellerPhone)) return json({ error: "Numéro vendeur invalide" }, 400);

      // Detect operator from prefix (rough)
      const op = /^229(6[1-9]|9[0-9])/.test(sellerPhone) ? "mtn" : "moov";
      const transref = newRef("WREL");
      const sellerAmount = Number(tx.amount) - Number(tx.commission || 0);

      const { data: pay } = await sb.from("waouh_payments").insert({
        transaction_id,
        user_id: tx.seller_id,
        msisdn: sellerPhone,
        operator: op,
        amount: sellerAmount,
        qosic_transref: transref,
        payment_type: "deposit",
        status: "initiated",
      }).select().single();

      const r = await fetch(depositEndpoint(op), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: auth() },
        body: JSON.stringify({
          msisdn: sellerPhone,
          amount: String(sellerAmount),
          firstname: "Vendeur",
          lastname: "WAOUH",
          transref,
          clientid: CLIENT_IDS[op],
        }),
      });
      const raw = await r.json().catch(() => ({}));
      const ok = raw.responsecode === "00" || raw.responsecode === "01";

      await sb.from("waouh_payments").update({
        status: ok ? "success" : "failed",
        qosic_response: raw,
      }).eq("id", pay!.id);

      if (ok) {
        await sb.from("waouh_transactions").update({
          status: "completed",
          escrow_status: "released",
          completed_at: new Date().toISOString(),
        }).eq("id", transaction_id);
      }

      return json({ success: ok, message: ok ? "Fonds libérés au vendeur" : "Échec libération", raw });
    }

    // ---------------- CONFIRM RECEIVED (buyer) → release escrow ----------------
    if (action === "confirm_received") {
      const { transaction_id, waouh_buyer_id } = body;
      if (!transaction_id) return json({ error: "transaction_id requis" }, 400);
      const { data: tx } = await sb.from("waouh_transactions").select("*").eq("id", transaction_id).maybeSingle();
      if (!tx) return json({ error: "Transaction introuvable" }, 404);
      if (tx.status !== "paid") return json({ error: "La transaction doit être au statut 'payé' pour être libérée" }, 400);

      // Authorize: buyer (auth user OR matching web session)
      let allowed = false;
      if (userId) {
        const { data: wu } = await sb.from("waouh_users").select("id").eq("auth_user_id", userId).maybeSingle();
        if (wu?.id === tx.buyer_id) allowed = true;
      }
      const sessionHeader = req.headers.get("x-waouh-session");
      if (!allowed && sessionHeader) {
        const { data: wu } = await sb.from("waouh_users").select("id").eq("web_session_id", sessionHeader).maybeSingle();
        if (wu?.id === tx.buyer_id) allowed = true;
      }
      if (!allowed && authHeader === `Bearer ${SERVICE_ROLE}` && waouh_buyer_id === tx.buyer_id) allowed = true;
      if (!allowed) return json({ error: "Seul l'acheteur peut confirmer la réception" }, 403);

      if (PAYMENT_MODE === "demo") {
        await sb.from("waouh_transactions").update({
          status: "completed",
          escrow_status: "released",
          buyer_confirmed: true,
          completed_at: new Date().toISOString(),
        }).eq("id", transaction_id);
        await pushSystemMessage(sb, tx.buyer_id, transaction_id, "🎉 Félicitations ! Transaction terminée. Notez le vendeur de 1 à 5 ⭐ ci-dessous.");
        await pushSystemMessage(sb, tx.seller_id, transaction_id, "🎉 L'acheteur a confirmé la réception. Les fonds sont libérés sur votre compte (mode démo).");
        return json({ success: true, demo: true, message: "Réception confirmée — fonds libérés (démo)." });
      }

      // LIVE: trigger release flow (reuse existing 'release' code path would require Qosic deposit)
      await sb.from("waouh_transactions").update({ buyer_confirmed: true }).eq("id", transaction_id);
      return json({ success: true, message: "Confirmation enregistrée. Libération en cours." });
    }

    return json({ error: "Action inconnue" }, 400);
  } catch (e: any) {
    console.error("[waouh-payment]", e);
    return json({ error: e.message || String(e) }, 500);
  }
});

async function pushSystemMessage(sb: any, waouhUserId: string | null, transaction_id: string, text: string, eventKey?: string) {
  if (!waouhUserId) return;
  // 🔁 Helper unifié : résolution multi-sources (chat / partenaire / radar IA)
  // via pushSyncedEvent → insère chat + enqueue WhatsApp + trace + dedup.
  const { data: wu } = await sb.from("waouh_users")
    .select("id, web_session_id, phone_number, auth_user_id")
    .eq("id", waouhUserId)
    .maybeSingle();
  if (!wu) return;

  // Récupère article_id depuis la transaction pour permettre la résolution
  // partenaire/radar IA basée sur l'annonce.
  let articleId: string | null = null;
  try {
    const { data: tx } = await sb.from("waouh_transactions")
      .select("article_id, buyer_id, seller_id")
      .eq("id", transaction_id)
      .maybeSingle();
    articleId = tx?.article_id ?? null;
  } catch (_) { /* ignore */ }

  // Hash court du texte pour différencier les notifs successives du même event
  const txtHash = Array.from(text).reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0).toString(36);

  try {
    await pushSyncedEvent({
      sb,
      user: wu,
      role: "buyer", // role indicatif ; la résolution couvre buyer/seller via article_id
      articleId,
      text,
      intent: eventKey || "transaction_update",
      template: "transaction_update",
      eventType: eventKey || "transaction_update",
      transactionId: transaction_id,
      dedupSuffix: txtHash,
      payloadExtra: { transaction_id, event: eventKey || "post_payment_flow" },
    });
  } catch (e) { console.warn("[waouh-payment] pushSyncedEvent", e); }
}

async function getWaouhUserContact(sb: any, id: string | null) {
  if (!id) return null;
  const { data } = await sb.from("waouh_users")
    .select("id, display_name, phone_number, city, web_session_id")
    .eq("id", id).maybeSingle();
  return data;
}

/** Exchange both contacts (buyer↔seller) — strictement une seule fois par transaction. */
async function exchangeContacts(sb: any, buyerId: string | null, sellerId: string | null, transaction_id: string) {
  try {
    // 🔒 Verrou atomique : on ne fait l'échange QUE si contacts_exchanged_at est NULL.
    const { data: claimed } = await sb
      .from("waouh_transactions")
      .update({ contacts_exchanged_at: new Date().toISOString() })
      .eq("id", transaction_id)
      .is("contacts_exchanged_at", null)
      .select("id")
      .maybeSingle();
    if (!claimed) {
      console.log("[waouh-payment] contacts already exchanged for", transaction_id);
      return;
    }
    const [buyer, seller] = await Promise.all([
      getWaouhUserContact(sb, buyerId),
      getWaouhUserContact(sb, sellerId),
    ]);
    if (buyer && seller) {
      const toSellerText = contactExchangeText("seller_to_buyer", buyer);
      const toBuyerText = contactExchangeText("buyer_to_seller", seller);
      await pushSystemMessage(sb, sellerId, transaction_id, toSellerText);
      await pushSystemMessage(sb, buyerId, transaction_id, toBuyerText);
    }
  } catch (e) {
    console.warn("[waouh-payment] exchangeContacts", e);
  }
}

function json(b: any, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
