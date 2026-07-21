// Analyse le stock d'un agent : ruptures, valeur, rotation, recommandations IA.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const auth = req.headers.get("Authorization") || "";
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

    const { agent_id, question } = await req.json();
    if (!agent_id) throw new Error("agent_id requis");

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: items } = await admin.from("waouh_stock_items").select("*").eq("agent_id", agent_id).eq("user_id", user.id);
    const list = items || [];
    const totalValue = list.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price_fcfa), 0);
    const critical = list.filter((i) => Number(i.quantity) <= 0);
    const low = list.filter((i) => Number(i.quantity) > 0 && Number(i.quantity) <= Number(i.threshold_low));

    const key = Deno.env.get("LOVABLE_API_KEY");
    let insight = "";
    if (key) {
      const sys = "Tu es un expert IA en gestion de stock en Afrique de l'Ouest. Réponds en français, très concis (3-5 lignes), avec des recommandations actionnables et chiffrées en FCFA.";
      const ctx = `Produits: ${list.length}. Valeur totale: ${Math.round(totalValue)} FCFA. Ruptures: ${critical.length}. Stock bas: ${low.length}. Top ruptures: ${critical.slice(0,5).map(i=>i.name).join(", ")}. Stock bas: ${low.slice(0,5).map(i=>`${i.name} (${i.quantity})`).join(", ")}.`;
      const q = question || "Que recommandes-tu ?";
      try {
        const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({ model: "google/gemini-2.5-flash-lite", messages: [{ role: "system", content: sys }, { role: "user", content: `${ctx}\n\nQuestion: ${q}` }] }),
        });
        if (r.ok) { const j = await r.json(); insight = j.choices?.[0]?.message?.content || ""; }
      } catch (_) {}
    }

    return new Response(JSON.stringify({
      ok: true,
      stats: {
        total_items: list.length,
        total_value_fcfa: Math.round(totalValue),
        out_of_stock: critical.length,
        low_stock: low.length,
      },
      critical_items: critical.slice(0, 20),
      low_items: low.slice(0, 20),
      insight,
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
