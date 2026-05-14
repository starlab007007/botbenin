import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { lat, lng, query } = body;

    let url = "";
    if (typeof lat === "number" && typeof lng === "number") {
      url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=fr&zoom=12`;
    } else if (typeof query === "string" && query.trim()) {
      url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&accept-language=fr&limit=1`;
    } else {
      return new Response(JSON.stringify({ error: "missing lat/lng or query" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch(url, {
      headers: { "User-Agent": "WAOUH/1.0 (bot.bj)", "Accept": "application/json" },
    });
    const data: any = await res.json();

    let city = "Cotonou", country = "Bénin", display_name = "", outLat = lat, outLng = lng;
    if (Array.isArray(data) && data[0]) {
      const r = data[0];
      city = r.address?.city || r.address?.town || r.address?.village || r.display_name?.split(",")[0] || query || city;
      country = r.address?.country || country;
      display_name = r.display_name || "";
      outLat = parseFloat(r.lat); outLng = parseFloat(r.lon);
    } else if (data?.address) {
      city = data.address.city || data.address.town || data.address.village || data.address.municipality || data.address.county || city;
      country = data.address.country || country;
      display_name = data.display_name || "";
    }

    return new Response(JSON.stringify({ city, country, display_name, lat: outLat, lng: outLng }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
