import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// Curated Benin city/district list (mirrors src/data/beninLocations.ts) — used to
// normalize Nominatim's noisy outputs and snap free-text queries to canonical cities.
const BENIN_CITIES: Array<{ ville: string; quartiers: string[]; lat?: number; lng?: number }> = [
  { ville: "Cotonou", quartiers: ["Cadjèhoun", "Akpakpa", "Fidjrossè", "Gbégamey", "Sainte-Rita", "Ganhi", "Jéricho", "Cocotomey", "Vodjè", "Agla", "Houéyiho", "Zongo", "Dantokpa", "Missebo", "Sègbéya", "Mènontin", "Sikècodji", "Tokpa-Hoho", "Akogbato", "Vèdoko"], lat: 6.3703, lng: 2.3912 },
  { ville: "Abomey-Calavi", quartiers: ["Godomey", "Kpota", "Zogbadjè", "Tankpè", "Aïbatin", "Calavi-Centre", "Tokan", "Hêvié", "Akassato", "Cocotomey", "Womey", "Glo-Djigbé"], lat: 6.4485, lng: 2.3556 },
  { ville: "Porto-Novo", quartiers: ["Akron", "Djassin", "Houinmè", "Tokpota", "Ouando", "Avassa", "Dowa", "Kandèvié", "Catchi", "Foun-Foun"], lat: 6.4969, lng: 2.6283 },
  { ville: "Parakou", quartiers: ["Banikanni", "Titirou", "Zongo", "Wansirou", "Tourou", "Kpébié", "Ladji-Farani"], lat: 9.3372, lng: 2.6303 },
  { ville: "Djougou", quartiers: ["Centre"], lat: 9.7081, lng: 1.6661 },
  { ville: "Bohicon", quartiers: ["Centre"], lat: 7.1781, lng: 2.0667 },
  { ville: "Lokossa", quartiers: ["Centre"], lat: 6.6383, lng: 1.7167 },
  { ville: "Kandi", quartiers: ["Centre"], lat: 11.13, lng: 2.94 },
  { ville: "Natitingou", quartiers: ["Centre"], lat: 10.3, lng: 1.38 },
  { ville: "Ouidah", quartiers: ["Centre", "Pahou", "Avlékété"], lat: 6.3622, lng: 2.085 },
  { ville: "Abomey", quartiers: ["Centre"], lat: 7.1853, lng: 1.9912 },
  { ville: "Sèmè-Kpodji", quartiers: ["Sèmè", "Kpodji", "Ekpè", "Agblangandan"], lat: 6.3667, lng: 2.625 },
  { ville: "Allada", quartiers: ["Centre"], lat: 6.6653, lng: 2.1514 },
];

const stripDiacritics = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function normalizeCity(rawCity: string | null | undefined): { city: string; district: string | null; lat?: number; lng?: number } {
  if (!rawCity) return { city: "Cotonou", district: null };
  const cleaned = String(rawCity).split(",")[0].split("/")[0].trim();
  const stripped = stripDiacritics(cleaned);
  for (const c of BENIN_CITIES) {
    if (stripDiacritics(c.ville) === stripped || stripped.startsWith(stripDiacritics(c.ville))) {
      return { city: c.ville, district: null, lat: c.lat, lng: c.lng };
    }
  }
  // Try district matching → snap to parent city
  for (const c of BENIN_CITIES) {
    for (const q of c.quartiers) {
      if (stripDiacritics(q) === stripped) {
        return { city: c.ville, district: q, lat: c.lat, lng: c.lng };
      }
    }
  }
  // Unknown — keep the cleaned raw value
  return { city: cleaned || "Cotonou", district: null };
}

function nearestKnownCity(lat: number, lng: number) {
  let nearest = BENIN_CITIES[0];
  let best = Number.POSITIVE_INFINITY;
  for (const city of BENIN_CITIES) {
    if (city.lat == null || city.lng == null) continue;
    const score = (city.lat - lat) ** 2 + (city.lng - lng) ** 2;
    if (score < best) { best = score; nearest = city; }
  }
  return nearest;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { lat, lng, query } = body;

    let url = "";
    if (typeof lat === "number" && typeof lng === "number") {
      url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=fr&zoom=18&addressdetails=1`;
    } else if (typeof query === "string" && query.trim()) {
      // Bias towards Benin to avoid false matches in other countries.
      url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query + ", Bénin")}&accept-language=fr&limit=1&countrycodes=bj`;
    } else {
      return new Response(JSON.stringify({ error: "missing lat/lng or query" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let data: any = null;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6500);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "WAOUH/1.0 (contact@bot.bj)", "Accept": "application/json" },
      });
      clearTimeout(timeout);
      if (res.ok) data = await res.json();
    } catch (error) {
      console.warn("[waouh-geocode] nominatim fallback", String(error));
    }

    let rawCity = "Cotonou", country = "Bénin", display_name = "", outLat = lat, outLng = lng;
    let rawDistrict: string | null = null;

    if (Array.isArray(data) && data[0]) {
      const r = data[0];
      rawCity = r.address?.city || r.address?.town || r.address?.village || r.display_name?.split(",")[0] || query || rawCity;
      rawDistrict = r.address?.suburb || r.address?.neighbourhood || r.address?.quarter || null;
      country = r.address?.country || country;
      display_name = r.display_name || "";
      outLat = parseFloat(r.lat); outLng = parseFloat(r.lon);
    } else if (data?.address) {
      rawCity = data.address.city || data.address.town || data.address.village || data.address.municipality || data.address.county || rawCity;
      rawDistrict = data.address.suburb || data.address.neighbourhood || data.address.quarter || null;
      country = data.address.country || country;
      display_name = data.display_name || "";
    }

    if (!data && typeof lat === "number" && typeof lng === "number") {
      const nearest = nearestKnownCity(lat, lng);
      rawCity = nearest.ville;
      outLat = lat;
      outLng = lng;
    }

    // Normalize against curated Benin list
    const norm = normalizeCity(rawCity);
    const district = rawDistrict
      ? (normalizeCity(rawDistrict).district || rawDistrict)
      : norm.district;

    return new Response(JSON.stringify({
      ok: true,
      city: norm.city,
      ville: norm.city,
      district,
      quartier: district,
      country,
      display_name,
      lat: outLat ?? norm.lat,
      lng: outLng ?? norm.lng,
      normalized: norm.city !== rawCity,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
