// Test E2E du parcours WhatsApp (simulation ou live)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Step = { step: string; ok: boolean; ms: number; detail?: any; error?: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const steps: Step[] = [];
  const log = async (name: string, fn: () => Promise<any>) => {
    const t0 = Date.now();
    try {
      const detail = await fn();
      steps.push({ step: name, ok: true, ms: Date.now() - t0, detail });
      return detail;
    } catch (e: any) {
      steps.push({ step: name, ok: false, ms: Date.now() - t0, error: String(e.message || e) });
      throw e;
    }
  };

  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Auth admin
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await sb.auth.getUser(token);
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: isAdmin } = await sb.rpc("has_role", { _user_id: user.id, _role_name: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { mode = "sim", seller_phone, buyer_phone } = await req.json().catch(() => ({}));

    const runId = crypto.randomUUID().slice(0, 8);
    const sellerPhone = seller_phone || `22999${Math.floor(100000 + Math.random() * 899999)}`;
    const buyerPhone = buyer_phone || `22988${Math.floor(100000 + Math.random() * 899999)}`;

    // 1. Publication article (toujours côté DB)
    const article = await log("publication", async () => {
      const { data, error } = await sb.from("waouh_articles").insert({
        title: `[E2E-${runId}] iPhone 13 test`,
        description: "Article de test E2E",
        category: "telephone",
        price: 150000,
        currency: "XOF",
        photos: ["https://placehold.co/400x400?text=E2E"],
        city: "Cotonou",
        status: "active",
      }).select().single();
      if (error) throw error;
      return { article_id: data.id };
    });

    // 2. Création intérêt acheteur (recherche → intéressé)
    const interest = await log("interest_buyer", async () => {
      const { data, error } = await sb.from("waouh_interests").insert({
        article_id: article.article_id,
        buyer_phone: buyerPhone,
        status: "pending",
      }).select().single();
      if (error) throw error;
      return { interest_id: data.id };
    });

    // 3. Transaction (accord)
    const tx = await log("agreement", async () => {
      const { data, error } = await sb.from("waouh_transactions").insert({
        article_id: article.article_id,
        amount: 150000,
        currency: "XOF",
        negotiated_price: 140000,
        payment_method: "demo",
        status: "agreed",
      }).select().single();
      if (error) throw error;
      return { transaction_id: data.id };
    });

    // 4. Paiement démo
    await log("payment_demo", async () => {
      const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/waouh-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
        body: JSON.stringify({ action: "init", transaction_id: tx.transaction_id, method: "demo" }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(JSON.stringify(j));
      return j;
    });

    // 5. Confirmation → exchange contacts
    await log("confirm_and_exchange", async () => {
      const { error } = await sb.from("waouh_transactions").update({
        status: "completed", seller_confirmed: true, buyer_confirmed: true, completed_at: new Date().toISOString(),
      }).eq("id", tx.transaction_id);
      if (error) throw error;
      return { confirmed: true };
    });

    // 6. Vérif notifications en queue
    const queued = await log("verify_queue", async () => {
      const { data } = await sb.from("waouh_outbound_queue").select("id, event_type, status, dedupe_key, last_error")
        .eq("transaction_id", tx.transaction_id).limit(20);
      return { count: data?.length || 0, items: data };
    });

    // 7. Mode live : déclencher dispatch
    if (mode === "live") {
      await log("live_dispatch", async () => {
        const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/waouh-outbound-dispatch`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
          body: JSON.stringify({ limit: 20 }),
        });
        return await res.json().catch(() => ({}));
      });
    }

    // 8. Cleanup (sim only)
    if (mode === "sim") {
      await sb.from("waouh_outbound_queue").delete().eq("transaction_id", tx.transaction_id);
      await sb.from("waouh_transactions").delete().eq("id", tx.transaction_id);
      await sb.from("waouh_interests").delete().eq("id", interest.interest_id);
      await sb.from("waouh_articles").delete().eq("id", article.article_id);
    }

    return new Response(JSON.stringify({ ok: true, mode, runId, sellerPhone, buyerPhone, steps, queued }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message, steps }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
