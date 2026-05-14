// WAOUH Radar Process — pour chaque signal extrait : update profile, match avec buyer_profiles, notify
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const { limit = 50 } = req.method === "POST" ? await req.json().catch(() => ({})) : {};

    const { data: signals } = await sb
      .from("waouh_radar_signals")
      .select("*")
      .eq("status", "extracted")
      .order("captured_at", { ascending: true })
      .limit(limit);

    if (!signals || signals.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let matched = 0, notified = 0;

    for (const sig of signals) {
      // 1) Upsert radar profile
      if (sig.contact_phone) {
        const { data: prof } = await sb.from("waouh_radar_profiles").select("*").eq("contact_phone", sig.contact_phone).maybeSingle();
        if (prof) {
          await sb.from("waouh_radar_profiles").update({
            signals_count: (prof.signals_count || 0) + 1,
            last_seen_at: new Date().toISOString(),
            categories: Array.from(new Set([...(prof.categories || []), sig.category].filter(Boolean))),
            cities: Array.from(new Set([...(prof.cities || []), sig.city].filter(Boolean))),
            role: prof.role === "unknown" ? (sig.intent === "SELL" ? "seller" : sig.intent === "BUY" ? "buyer" : "unknown") :
                  (prof.role === "seller" && sig.intent === "BUY") || (prof.role === "buyer" && sig.intent === "SELL") ? "both" : prof.role,
          }).eq("id", prof.id);
        } else {
          await sb.from("waouh_radar_profiles").insert({
            contact_phone: sig.contact_phone,
            contact_handle: sig.contact_handle,
            display_name: sig.contact_handle,
            role: sig.intent === "SELL" ? "seller" : sig.intent === "BUY" ? "buyer" : "unknown",
            categories: sig.category ? [sig.category] : [],
            cities: sig.city ? [sig.city] : [],
            signals_count: 1,
            last_seen_at: new Date().toISOString(),
          });
        }
      }

      // 2) Match with WAOUH buyer_profiles if SELL signal
      if (sig.intent === "SELL" && sig.category) {
        const { data: buyers } = await sb
          .from("waouh_buyer_profiles")
          .select("id, user_id, category, keywords, price_max, price_min, notified_article_ids")
          .eq("is_active", true);

        for (const b of buyers || []) {
          let score = 0;
          if (b.category && sig.category && b.category.toLowerCase() === String(sig.category).toLowerCase()) score += 0.5;
          const text = `${sig.product?.title || ""} ${sig.raw_text || ""}`.toLowerCase();
          if (b.keywords?.length) {
            const hits = b.keywords.filter((k: string) => text.includes(k.toLowerCase())).length;
            score += Math.min(0.4, hits * 0.15);
          }
          if (sig.price && b.price_max && Number(sig.price) <= Number(b.price_max)) score += 0.1;
          if (score < 0.5) continue;

          // Check not already notified
          const { data: existing } = await sb.from("waouh_radar_matches").select("id").eq("signal_id", sig.id).eq("target_buyer_profile_id", b.id).maybeSingle();
          if (existing) continue;

          const { data: m } = await sb.from("waouh_radar_matches").insert({
            signal_id: sig.id,
            target_user_id: b.user_id,
            target_buyer_profile_id: b.id,
            score,
            notification_channel: "in_app",
            notified_at: new Date().toISOString(),
          }).select().single();
          matched++;

          // Insert notification
          if (b.user_id) {
            await sb.from("waouh_notifications").insert({
              user_id: b.user_id,
              notification_type: "radar_match",
              title: `🎯 Annonce détectée : ${sig.product?.title || sig.category}`,
              body: `${sig.price ? Number(sig.price).toLocaleString("fr-FR") + " FCFA" : "Prix non précisé"} · ${sig.city || "?"} · source: ${sig.source_type}`,
              meta: { signal_id: sig.id, raw_url: sig.raw_url, match_id: m?.id },
            }).select();
            notified++;
          }
        }
      }

      await sb.from("waouh_radar_signals").update({ status: "notified" }).eq("id", sig.id);
    }

    return new Response(JSON.stringify({ ok: true, processed: signals.length, matched, notified }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[waouh-radar-process]", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
