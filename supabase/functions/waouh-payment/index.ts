// WAOUH Payment - Qosic Mobile Money escrow flow
// Actions: init (request from buyer), status (poll), release (deposit to seller)
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

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

    // Try authenticated user (optional for init via web-session – but required for paying)
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await sb.auth.getUser(token);
      userId = data?.user?.id ?? null;
    }

    // ---------------- INIT ----------------
    if (action === "init") {
      const { transaction_id, msisdn, operator } = body as { transaction_id: string; msisdn: string; operator: string };
      const op = (operator || "mtn").toLowerCase();
      if (!transaction_id || !msisdn) {
        return json({ error: "Paramètres invalides" }, 400);
      }
      if (PAYMENT_MODE === "live" && !CLIENT_IDS[op]) {
        return json({ error: "Opérateur non configuré" }, 400);
      }
      if (!userId) return json({ error: "Authentification requise" }, 401);

      const { data: tx, error: txErr } = await sb.from("waouh_transactions").select("*").eq("id", transaction_id).single();
      if (txErr || !tx) return json({ error: "Transaction introuvable" }, 404);
      const { data: waouhBuyer } = await sb.from("waouh_users").select("id").eq("auth_user_id", userId).maybeSingle();
      const allowedBuyerId = waouhBuyer?.id ?? userId;
      if (tx.buyer_id && tx.buyer_id !== allowedBuyerId) {
        // Allow link if buyer_id is null
        return json({ error: "Vous n'êtes pas l'acheteur de cette transaction" }, 403);
      }
      if (["paid", "released", "completed"].includes(tx.status)) {
        return json({ error: "Transaction déjà payée" }, 409);
      }

      const cleanPhone = msisdn.replace(/\D/g, "");
      if (!/^229\d{8}$/.test(cleanPhone)) return json({ error: "Numéro invalide (229XXXXXXXX)" }, 400);

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
      if (PAYMENT_MODE === "demo") {
        await sb.from("waouh_payments").update({
          status: "pending",
          qosic_response: { demo: true, simulated: true },
        }).eq("id", pay.id);
        await sb.from("waouh_transactions").update({ status: "payment_pending" }).eq("id", transaction_id);
        // Schedule (best-effort) auto-confirmation after delay
        const finalize = async () => {
          await sb.from("waouh_payments").update({ status: "success", qosic_response: { demo: true, simulated: true, finalized_at: new Date().toISOString() } }).eq("id", pay.id);
          await sb.from("waouh_transactions").update({ status: "paid", escrow_status: "held" }).eq("id", transaction_id);
          // Push system messages to both buyer and seller
          const { data: txAfter } = await sb.from("waouh_transactions").select("buyer_id, seller_id, article_id, amount").eq("id", transaction_id).single();
          if (txAfter) {
            await pushSystemMessage(sb, txAfter.buyer_id, transaction_id, `✅ Paiement confirmé (mode démo). Fonds en escrow : ${Number(txAfter.amount).toLocaleString("fr-FR")} FCFA. Le vendeur va vous contacter pour la livraison.`);
            await pushSystemMessage(sb, txAfter.seller_id, transaction_id, `💰 Acheteur a payé (mode démo). Préparez la livraison et contactez-le. Cliquez sur « J'ai bien reçu » côté acheteur pour libérer les fonds.`);
          }
        };
        // Fire and forget
        // @ts-ignore EdgeRuntime is available in Supabase functions
        const wait = new Promise<void>((resolve) => setTimeout(resolve, DEMO_DELAY_MS));
        try {
          // @ts-ignore
          if (typeof EdgeRuntime !== "undefined" && (EdgeRuntime as any).waitUntil) {
            // @ts-ignore
            EdgeRuntime.waitUntil(wait.then(finalize));
          } else {
            wait.then(finalize);
          }
        } catch { wait.then(finalize); }
        return json({ success: true, payment_id: pay.id, transref, demo: true, message: "Mode démo : paiement simulé. Confirmation automatique dans quelques secondes." });
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

      // Poll Qosic
      const r = await fetch(`${QOSIC_BASE}/QosicBridge/user/gettransactionstatus`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: auth() },
        body: JSON.stringify({ transref: pay.qosic_transref, clientid: CLIENT_IDS[pay.operator] }),
      }).catch(() => null);

      let raw: any = {};
      if (r) { try { raw = await r.json(); } catch { raw = {}; } }

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
          const { data: tx } = await sb.from("waouh_transactions").select("article_id, buyer_id").eq("id", transaction_id).single();
          if (tx?.buyer_id) {
            const { data: conv } = await sb.from("waouh_conversations").select("id").eq("user_id", tx.buyer_id).limit(1).maybeSingle();
            if (conv?.id) {
              await sb.from("waouh_messages").insert({
                conversation_id: conv.id,
                user_id: tx.buyer_id,
                channel: "system",
                direction: "out",
                text: "✅ Paiement reçu. Fonds bloqués en escrow jusqu'à confirmation de réception.",
                meta: { transaction_id, event: "payment_success" },
              });
            }
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
          status: "released",
          escrow_status: "released",
          completed_at: new Date().toISOString(),
        }).eq("id", transaction_id);
      }

      return json({ success: ok, message: ok ? "Fonds libérés au vendeur" : "Échec libération", raw });
    }

    return json({ error: "Action inconnue" }, 400);
  } catch (e: any) {
    console.error("[waouh-payment]", e);
    return json({ error: e.message || String(e) }, 500);
  }
});

function json(b: any, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
