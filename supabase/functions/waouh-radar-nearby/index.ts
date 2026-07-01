import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const earthRadiusKm = 6371;

type RadarType = "sell" | "buy" | "status";

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function number(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toDate(value: unknown) {
  const date = new Date(String(value || ""));
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

function radians(value: number) {
  return (value * Math.PI) / 180;
}

function degrees(value: number) {
  return (value * 180) / Math.PI;
}

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const dLat = radians(lat2 - lat1);
  const dLng = radians(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(a)));
}

function bearing(lat1: number, lng1: number, lat2: number, lng2: number) {
  const phi1 = radians(lat1);
  const phi2 = radians(lat2);
  const deltaLng = radians(lng2 - lng1);
  const y = Math.sin(deltaLng) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLng);
  return (degrees(Math.atan2(y, x)) + 360) % 360;
}

function ring(distance: number) {
  if (distance <= 1) return { id: 1, max_km: 1, label: "≤ 1 km", color_value: 0xffef4444 };
  if (distance <= 5) return { id: 2, max_km: 5, label: "1–5 km", color_value: 0xfff59e0b };
  if (distance <= 20) return { id: 3, max_km: 20, label: "5–20 km", color_value: 0xffeab308 };
  return { id: 4, max_km: 100, label: "20–100 km", color_value: 0xff22c55e };
}

function freshnessHours(date: Date) {
  return Math.max(0, (Date.now() - date.getTime()) / 3_600_000);
}

function score(quality: number, freshness: Date, distance: number) {
  const recency = 1 / (1 + freshnessHours(freshness) / 72);
  return (Math.max(0, Math.min(1, quality)) * recency) / (1 + distance);
}

function normalizeType(value: unknown): RadarType {
  const source = String(value || "").toLowerCase();
  return source === "buy" || source === "demand" || source === "search" ? "buy" : "sell";
}

function photoFrom(value: unknown) {
  if (Array.isArray(value)) {
    const photo = value.find((item) => typeof item === "string" && item.trim().length > 0);
    return typeof photo === "string" ? photo : null;
  }
  return null;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ ok: false, error: "Méthode non autorisée." }, 405);

  try {
    const authorization = request.headers.get("Authorization") || "";
    const caller = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const { data: authData, error: authError } = await caller.auth.getUser();
    if (authError || !authData.user) return json({ ok: false, error: "Connexion requise." }, 401);

    const body = await request.json().catch(() => ({}));
    const latitude = number(body.latitude, NaN);
    const longitude = number(body.longitude, NaN);
    const radiusKm = Math.max(1, Math.min(100, number(body.radius_km, 20)));
    const requestedTypes = Array.isArray(body.types) ? body.types.map((item: unknown) => String(item).toLowerCase()) : [];
    const category = String(body.category || "").trim();
    const photoOnly = body.photo_only === true;
    const verifiedOnly = body.verified_only === true;

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      return json({ ok: false, error: "Coordonnées Radar invalides." }, 422);
    }

    const dLat = radiusKm / 110.574;
    const dLng = radiusKm / (111.32 * Math.max(0.1, Math.cos(radians(latitude))));
    const minLat = latitude - dLat;
    const maxLat = latitude + dLat;
    const minLng = longitude - dLng;
    const maxLng = longitude + dLng;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    const catalogQuery = admin
      .from("waouh_unified_catalog")
      .select("id,type,titre,description,categorie,prix_min,prix_max,devise,ville,quartier,lat,lng,photos,vendeur_nom,vendeur_phone,vendeur_whatsapp,verified,last_seen_at,qualite_score")
      .eq("is_active", true)
      .gte("lat", minLat)
      .lte("lat", maxLat)
      .gte("lng", minLng)
      .lte("lng", maxLng)
      .order("last_seen_at", { ascending: false })
      .limit(120);

    const statusQuery = admin
      .from("waouh_statuses")
      .select("id,user_id,author_name,type,title,caption,price_fcfa,location,lat,lng,media_url,media_urls,article_id,expires_at,created_at")
      .gt("expires_at", new Date().toISOString())
      .gte("lat", minLat)
      .lte("lat", maxLat)
      .gte("lng", minLng)
      .lte("lng", maxLng)
      .order("created_at", { ascending: false })
      .limit(60);

    const [{ data: catalogRows, error: catalogError }, { data: statusRows, error: statusError }] = await Promise.all([catalogQuery, statusQuery]);
    const items: Record<string, unknown>[] = [];
    const now = new Date();

    for (const row of catalogRows || []) {
      const lat = number(row.lat, NaN);
      const lng = number(row.lng, NaN);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const type = normalizeType(row.type);
      if (requestedTypes.length > 0 && !requestedTypes.includes(type)) continue;
      if (category && String(row.categorie || "") !== category) continue;
      if (verifiedOnly && row.verified !== true) continue;
      const photo = photoFrom(row.photos);
      if (photoOnly && !photo) continue;
      const distance = distanceKm(latitude, longitude, lat, lng);
      if (distance > radiusKm) continue;
      const updated = toDate(row.last_seen_at);
      items.push({
        id: `cat:${row.id}`,
        source_id: String(row.id),
        source: "catalog",
        type,
        title: String(row.titre || "Annonce WAOUH"),
        description: row.description || null,
        photo_url: photo,
        price_min: row.prix_min ?? null,
        price_max: row.prix_max ?? null,
        currency: row.devise || "FCFA",
        city: row.ville || null,
        district: row.quartier || null,
        latitude: lat,
        longitude: lng,
        distance_km: distance,
        bearing: bearing(latitude, longitude, lat, lng),
        ring: ring(distance),
        freshness_ms: Math.max(0, now.getTime() - updated.getTime()),
        score: score(number(row.qualite_score, 0.5), updated, distance),
        seller_name: row.vendeur_nom || null,
        seller_phone: row.vendeur_whatsapp || row.vendeur_phone || null,
        article_id: String(row.id),
      });
    }

    for (const row of statusRows || []) {
      const lat = number(row.lat, NaN);
      const lng = number(row.lng, NaN);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      if (requestedTypes.length > 0 && !requestedTypes.includes("status")) continue;
      const mediaRows = Array.isArray(row.media_urls) ? row.media_urls : [];
      const photo = typeof row.media_url === "string" && row.media_url.trim() ? row.media_url : photoFrom(mediaRows);
      if (photoOnly && !photo) continue;
      const distance = distanceKm(latitude, longitude, lat, lng);
      if (distance > radiusKm) continue;
      const created = toDate(row.created_at);
      items.push({
        id: `st:${row.id}`,
        source_id: String(row.id),
        source: "status",
        type: "status",
        title: String(row.title || row.caption || "Statut WAOUH"),
        description: row.caption || null,
        photo_url: photo,
        price_min: row.price_fcfa ?? null,
        price_max: row.price_fcfa ?? null,
        currency: "FCFA",
        city: row.location || null,
        district: null,
        latitude: lat,
        longitude: lng,
        distance_km: distance,
        bearing: bearing(latitude, longitude, lat, lng),
        ring: ring(distance),
        freshness_ms: Math.max(0, now.getTime() - created.getTime()),
        score: score(0.6, created, distance),
        seller_name: row.author_name || null,
        seller_phone: null,
        article_id: row.article_id || null,
      });
    }

    items.sort((left, right) => number(right.score) - number(left.score));
    return json({
      ok: true,
      generated_at: now.toISOString(),
      coverage: { latitude, longitude, radius_km: radiusKm },
      sources: {
        catalog: { count: (catalogRows || []).length, error: catalogError?.message || null },
        statuses: { count: (statusRows || []).length, error: statusError?.message || null },
      },
      items: items.slice(0, 80),
    });
  } catch (error) {
    console.error("[waouh-radar-nearby]", error);
    return json({ ok: false, error: error instanceof Error ? error.message : "Radar indisponible." }, 500);
  }
});
