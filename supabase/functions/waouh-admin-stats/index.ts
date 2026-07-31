import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-waouh-session",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const [arts, txs, users] = await Promise.all([
      sb.from("waouh_articles").select("status,category,city,created_at"),
      sb.from("waouh_transactions").select("amount,commission,status,created_at"),
      sb.from("waouh_users").select("id"),
    ]);

    const articles = arts.data ?? [];
    const transactions = txs.data ?? [];

    const total_articles = articles.length;
    const active_articles = articles.filter((a: any) => a.status === "active").length;
    const sold_articles = articles.filter((a: any) => a.status === "sold").length;
    const expired_articles = articles.filter((a: any) => a.status === "expired").length;
    const total_volume = transactions.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    const total_commission = transactions.reduce((s: number, t: any) => s + Number(t.commission || 0), 0);

    const catMap: Record<string, number> = {};
    articles.forEach((a: any) => { catMap[a.category] = (catMap[a.category] || 0) + 1; });
    const top_categories = Object.entries(catMap).map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count).slice(0, 5);

    const cityMap: Record<string, number> = {};
    articles.forEach((a: any) => { if (a.city) cityMap[a.city] = (cityMap[a.city] || 0) + 1; });
    const city_density = Object.entries(cityMap).map(([city, count]) => ({ city, count }));

    // Build 30 day series
    const days: Record<string, { date: string; published: number; sold: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      days[d] = { date: d.slice(5), published: 0, sold: 0 };
    }
    articles.forEach((a: any) => {
      const d = new Date(a.created_at).toISOString().slice(0, 10);
      if (days[d]) days[d].published++;
    });
    transactions.forEach((t: any) => {
      if (t.status === "completed") {
        const d = new Date(t.created_at).toISOString().slice(0, 10);
        if (days[d]) days[d].sold++;
      }
    });
    const growth_30d = Object.values(days);

    return new Response(JSON.stringify({
      total_articles, active_articles, sold_articles, expired_articles,
      total_volume, total_commission,
      unique_users: (users.data ?? []).length,
      top_categories, city_density, growth_30d,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
