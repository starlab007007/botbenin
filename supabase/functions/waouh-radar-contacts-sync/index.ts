// Aggregates waouh_radar_signals + waouh_external_listings into waouh_radar_contacts
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { normalizeBeninPhone } from "../_shared/waouhContact.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Agg = {
  phone: string;
  display_name?: string | null;
  source?: string | null;
  first_seen_at: string;
  last_seen_at: string;
  signal_count: number;
  categories: Set<string>;
  cities: Set<string>;
  intent_buy_count: number;
  intent_sell_count: number;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
  const map = new Map<string, Agg>();

  try {
    // 1) signals
    const { data: signals } = await sb
      .from("waouh_radar_signals")
      .select("contact_phone, contact_handle, source_type, intent, category, city, captured_at")
      .not("contact_phone", "is", null)
      .order("captured_at", { ascending: false })
      .limit(5000);

    for (const s of signals || []) {
      const phone = normalizeBeninPhone(s.contact_phone);
      if (!phone) continue;
      const agg = map.get(phone) || {
        phone,
        display_name: s.contact_handle || null,
        source: s.source_type || null,
        first_seen_at: s.captured_at,
        last_seen_at: s.captured_at,
        signal_count: 0,
        categories: new Set<string>(),
        cities: new Set<string>(),
        intent_buy_count: 0,
        intent_sell_count: 0,
      };
      agg.signal_count++;
      if (s.captured_at < agg.first_seen_at) agg.first_seen_at = s.captured_at;
      if (s.captured_at > agg.last_seen_at) agg.last_seen_at = s.captured_at;
      if (s.category) agg.categories.add(s.category);
      if (s.city) agg.cities.add(s.city);
      if (s.intent === "BUY") agg.intent_buy_count++;
      if (s.intent === "SELL") agg.intent_sell_count++;
      if (!agg.display_name && s.contact_handle) agg.display_name = s.contact_handle;
      map.set(phone, agg);
    }

    // 2) external listings
    const { data: listings } = await sb
      .from("waouh_external_listings")
      .select("seller_phone, source, category, city, created_at, title")
      .not("seller_phone", "is", null)
      .limit(5000);

    for (const l of listings || []) {
      const phone = normalizeBeninPhone(l.seller_phone);
      if (!phone) continue;
      const ts = l.created_at || new Date().toISOString();
      const agg = map.get(phone) || {
        phone,
        display_name: null,
        source: l.source || "serpapi",
        first_seen_at: ts,
        last_seen_at: ts,
        signal_count: 0,
        categories: new Set<string>(),
        cities: new Set<string>(),
        intent_buy_count: 0,
        intent_sell_count: 0,
      };
      agg.signal_count++;
      agg.intent_sell_count++;
      if (l.category) agg.categories.add(l.category);
      if (l.city) agg.cities.add(l.city);
      if (ts < agg.first_seen_at) agg.first_seen_at = ts;
      if (ts > agg.last_seen_at) agg.last_seen_at = ts;
      map.set(phone, agg);
    }

    // 3) Upsert
    let upserted = 0;
    for (const a of map.values()) {
      const { data: existing } = await sb.from("waouh_radar_contacts").select("id, status, auto_notify, notes, tags, display_name").eq("phone_e164", a.phone).maybeSingle();
      const payload: any = {
        phone_e164: a.phone,
        display_name: existing?.display_name || a.display_name,
        source: a.source,
        first_seen_at: a.first_seen_at,
        last_seen_at: a.last_seen_at,
        signal_count: a.signal_count,
        categories: Array.from(a.categories),
        cities: Array.from(a.cities),
        intent_buy_count: a.intent_buy_count,
        intent_sell_count: a.intent_sell_count,
      };
      if (!existing) {
        payload.status = "new";
        await sb.from("waouh_radar_contacts").insert(payload);
      } else {
        await sb.from("waouh_radar_contacts").update(payload).eq("id", existing.id);
      }
      upserted++;
    }

    return new Response(JSON.stringify({ ok: true, contacts: map.size, upserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[waouh-radar-contacts-sync]", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
