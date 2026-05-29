// E2E test: buyer "intéressé 1" → vérifie qu'une notification new_buyer
// arrive côté vendeur avec le texte riche WAOUH (📩 Nouvel acheteur intéressé)
// et la photo, identiques à la version WhatsApp.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const steps: any[] = [];
  const log = (s: string, d: any) => { steps.push({ step: s, ...d }); console.log("[e2e]", s, d); };

  try {
    const SB_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(SB_URL, SERVICE);

    const runId = crypto.randomUUID().slice(0, 8);
    const sellerSession = `e2e-seller-${runId}`;
    const buyerSession = `e2e-buyer-${runId}`;
    const photoUrl = "https://placehold.co/600x400?text=E2E-IPHONE";

    // 1. Seller user
    const { data: seller, error: sErr } = await sb.from("waouh_users").insert({
      web_session_id: sellerSession,
      display_name: `E2E Seller ${runId}`,
      city: "Cotonou",
      channel: "web",
    }).select().single();
    if (sErr) throw new Error("seller insert: " + sErr.message);
    log("seller_created", { id: seller.id });

    // 2. Article
    const { data: article, error: aErr } = await sb.from("waouh_articles").insert({
      title: `[E2E-${runId}] iPhone 13 Pro`,
      description: "Test E2E interest flow",
      category: "smartphone",
      price: 150000,
      currency: "XOF",
      photos: [photoUrl],
      city: "Cotonou",
      status: "active",
      seller_id: seller.id,
    }).select().single();
    if (aErr) throw new Error("article insert: " + aErr.message);
    log("article_created", { id: article.id });

    // 3. Buyer user
    const { data: buyer, error: bErr } = await sb.from("waouh_users").insert({
      web_session_id: buyerSession,
      display_name: `E2E Buyer ${runId}`,
      city: "Abomey-Calavi",
      channel: "web",
    }).select().single();
    if (bErr) throw new Error("buyer insert: " + bErr.message);
    log("buyer_created", { id: buyer.id });

    // 4. Pre-seed conversation context (last_matches → article en index 1)
    const { error: cErr } = await sb.from("waouh_conversations").insert({
      user_id: buyer.id,
      phone_number: `web:${buyerSession}`,
      state: "browsing",
      channel: "web",
      context: { last_matches: [{ id: article.id, title: article.title, price: 150000, photos: [photoUrl], seller_id: seller.id, source: "chat" }] },
    });
    if (cErr) throw new Error("conv insert: " + cErr.message);
    log("conversation_seeded", { last_matches_count: 1 });

    // 5. Call waouh-webhook as buyer with "intéressé 1"
    const wh = await fetch(`${SB_URL}/functions/v1/waouh-webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE}` },
      body: JSON.stringify({
        web_session_id: buyerSession,
        text: "intéressé 1",
        city: "Abomey-Calavi",
        channel: "web",
        user_id: buyer.id,
      }),
    });
    const whJson = await wh.json().catch(() => ({}));
    log("webhook_called", { status: wh.status, reply_preview: String(whJson?.reply || "").slice(0, 80) });

    // 6. Verify notification
    const { data: notifs } = await sb.from("waouh_notifications")
      .select("id, notification_type, channel, payload, photos, sent_at, web_session_id, user_id")
      .eq("notification_type", "new_buyer")
      .eq("article_id", article.id)
      .order("sent_at", { ascending: false })
      .limit(5);

    const sellerNotif = notifs?.find((n: any) => n.user_id === seller.id);
    const text = sellerNotif?.payload?.text || "";
    const checks = {
      notification_exists: !!sellerNotif,
      has_waouh_header: /WAOUH/i.test(text) || /📩 Nouvel acheteur intéressé/.test(text),
      has_title: text.includes(article.title),
      has_price: /150\s?000/.test(text),
      has_oui_non_je_propose: /OUI/.test(text) && /NON/.test(text) && /Je propose/i.test(text),
      has_photo: Array.isArray(sellerNotif?.photos) && sellerNotif!.photos.includes(photoUrl),
      web_session_set: sellerNotif?.web_session_id === sellerSession,
    };
    log("notification_check", { checks, text_preview: text.slice(0, 200) });

    // 7. Cleanup
    await sb.from("waouh_notifications").delete().eq("article_id", article.id);
    await sb.from("waouh_negotiations").delete().eq("article_id", article.id);
    await sb.from("waouh_conversations").delete().eq("user_id", buyer.id);
    await sb.from("waouh_articles").delete().eq("id", article.id);
    await sb.from("waouh_users").delete().in("id", [seller.id, buyer.id]);
    log("cleanup_done", {});

    const allOk = Object.values(checks).every(Boolean);
    return new Response(JSON.stringify({ ok: allOk, runId, checks, steps, text_sample: text }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message, steps }, null, 2), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
