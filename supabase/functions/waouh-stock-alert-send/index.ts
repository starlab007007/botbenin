// WAOUH Stock IA — automatic threshold alert after an atomic stock movement.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

const asChatId = (value: string) => {
  const trimmed = value.trim();
  if (trimmed.includes("@")) return trimmed;
  const digits = trimmed.replace(/\D/g, "");
  return `${digits}@c.us`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return reply(405, { error: "Méthode non autorisée." });

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const authHeader = req.headers.get("authorization") ?? "";
    if (!url || !serviceKey || !anonKey) throw new Error("SUPABASE_CONFIG_MISSING");
    if (!authHeader.startsWith("Bearer ")) return reply(401, { error: "Session utilisateur manquante." });

    const body = await req.json();
    const productId = String(body?.product_id ?? "").trim();
    if (!productId) return reply(400, { error: "product_id est requis." });

    const admin = createClient(url, serviceKey);
    const { data: auth, error: authError } = await admin.auth.getUser(authHeader.slice(7));
    if (authError || !auth.user) return reply(401, { error: "Session utilisateur invalide." });

    const { data: product, error: productError } = await admin
      .from("waouh_partner_products")
      .select("id,partner_id,nom,unite,stock_estime,stock_minimum,stock_target")
      .eq("id", productId)
      .maybeSingle();
    if (productError) throw productError;
    if (!product) return reply(404, { error: "Produit introuvable." });

    const { data: partner, error: partnerError } = await admin
      .from("waouh_partners")
      .select("id,user_id")
      .eq("id", product.partner_id)
      .maybeSingle();
    if (partnerError) throw partnerError;
    if (!partner || partner.user_id !== auth.user.id) {
      return reply(403, { error: "Produit non accessible." });
    }

    const stock = Math.max(0, Number(product.stock_estime ?? 0));
    const minimum = Math.max(0, Number(product.stock_minimum ?? 0));
    if (stock > minimum) return reply(200, { ok: true, sent: false, reason: "ABOVE_THRESHOLD" });

    const { data: setting, error: settingError } = await admin
      .from("waouh_stock_alert_settings")
      .select("enabled,recipient_msisdn,session_name")
      .eq("user_id", auth.user.id)
      .eq("partner_id", product.partner_id)
      .maybeSingle();
    if (settingError) throw settingError;
    if (!setting?.enabled || !setting.recipient_msisdn || !setting.session_name) {
      return reply(200, { ok: true, sent: false, reason: "ALERTS_DISABLED" });
    }

    const { data: alreadySent, error: logError } = await admin
      .from("waouh_stock_alert_log")
      .select("id")
      .eq("product_id", product.id)
      .eq("sent_on", new Date().toISOString().slice(0, 10))
      .maybeSingle();
    if (logError) throw logError;
    if (alreadySent) return reply(200, { ok: true, sent: false, reason: "ALREADY_SENT_TODAY" });

    const { data: account, error: accountError } = await admin
      .from("whatsapp_accounts")
      .select("id,status")
      .eq("user_id", auth.user.id)
      .eq("session_name", setting.session_name)
      .maybeSingle();
    if (accountError) throw accountError;
    if (!account || account.status !== "connected") {
      return reply(200, { ok: true, sent: false, reason: "WHATSAPP_NOT_CONNECTED" });
    }

    const recommended = Math.max(0, Number(product.stock_target ?? minimum) - stock);
    const finalMessage = `Alerte stock WAOUH\n${product.nom ?? "Produit"} : ${stock} ${product.unite ?? "unités"} en stock (seuil : ${minimum}).${recommended > 0 ? ` Réapprovisionnement conseillé : +${recommended} ${product.unite ?? "unités"}.` : ""}`;

    const sendResponse = await fetch(`${url}/functions/v1/waha-send-message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
        "apikey": anonKey,
      },
      body: JSON.stringify({
        sessionName: setting.session_name,
        to: asChatId(setting.recipient_msisdn),
        message: finalMessage,
        messageType: "text",
      }),
    });
    const sendData = await sendResponse.json().catch(() => ({}));
    if (!sendResponse.ok || sendData?.success !== true) {
      return reply(502, { error: String(sendData?.error ?? "Envoi WhatsApp impossible.") });
    }

    const { error: insertError } = await admin.from("waouh_stock_alert_log").insert({
      user_id: auth.user.id,
      product_id: product.id,
      recipient_msisdn: setting.recipient_msisdn,
      session_name: setting.session_name,
    });
    if (insertError) throw insertError;
    return reply(200, { ok: true, sent: true });
  } catch (error) {
    console.error("waouh-stock-alert-send", error);
    return reply(400, { error: error instanceof Error ? error.message : String(error) });
  }
});
