import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EARTH_RADIUS_KM = 6371;

type RadarType = "sell" | "buy" | "status";
type Coordinates = { lat: number; lng: number; precision: "exact" | "city" };

const CITY_CENTERS: Record<string, { lat: number; lng: number }> = {
  cotonou: { lat: 6.3654, lng: 2.4183 },
  godomey: { lat: 6.3744, lng: 2.3506 },
  abomeycalavi: { lat: 6.4485, lng: 2.3557 },
  calavi: { lat: 6.4485, lng: 2.3557 },
  portonovo: { lat: 6.4969, lng: 2.6289 },
  ouidah: { lat: 6.3631, lng: 2.0850 },
  allada: { lat: 6.6654, lng: 2.1514 },
  bohicon: { lat: 7.1783, lng: 2.0667 },
  abomey: { lat: 7.1826, lng: 1.9912 },
  parakou: { lat: 9.3372, lng: 2.6273 },
  natitingou: { lat: 10.3042, lng: 1.3796 },
};

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

function validCoordinate(lat: number, lng: number) {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

function normalizeCity(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function cityCoordinates(value: unknown): Coordinates | null {
  const normalized = normalizeCity(value);
  for (const [key, point] of Object.entries(CITY_CENTERS)) {
    if (normalized.includes(key)) return { lat: point.lat, lng: point.lng, precision: "city" };
  }
  return null;
}

function coordinates(row: Record<string, unknown>, city: unknown): Coordinates | null {
  const lat = number(row.lat, NaN);
  const lng = number(row.lng, NaN);
  if (validCoordinate(lat, lng)) return { lat, lng, precision: "exact" };
  return cityCoordinates(city);
}

function toDate(value: unknown) {
  const date = new Date(String(value || ""));
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

function radians(value: number) { return (value * Math.PI) / 180; }
function degrees(value: number) { return (value * 180) / Math.PI; }

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const dLat = radians(lat2 - lat1);
  const dLng = radians(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
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

function score(quality: number, freshness: Date, distance: number, precision: Coordinates["precision"]) {
  const normalizedQuality = quality > 1 ? quality / 100 : quality;
  const freshnessHours = Math.max(0, (Date.now() - freshness.getTime()) / 3600000);
  const recency = 1 / (1 + freshnessHours / 72);
  return (Math.max(0, Math.min(1, normalizedQuality)) * recency * (precision === "exact" ? 1 : .72)) / (1 + distance);
}

function normalizeType(value: unknown): RadarType {
  const raw = String(value ?? "").toLowerCase();
  return raw === "buy" || raw === "demand" || raw === "search" ? "buy" : "sell";
}

function photoFrom(value: unknown) {
  if (!Array.isArray(value)) return null;
  const first = value.find((item) => typeof item === "string" && item.trim().length > 0);
  return typeof first === "string" ? first : null;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ ok: false, error: "Méthode non autorisée." }, 405);

  try {
    const authorization = request.headers.get("Authorization") ?? "";
    const caller = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
    const { data: auth, error: authError } = await caller.auth.getUser();
    if (authError || !auth.user) return json({ ok: false, error: "Connexion requise." }, 401);

    const body = await request.json().catch(() => ({}));
    const latitude = number(body.latitude, NaN);
    const longitude = number(body.longitude, NaN);
    const radiusKm = Math.max(1, Math.min(100, number(body.radius_km, 100)));
    const requestedTypes = Array.isArray(body.types) ? body.types.map((item: unknown) => String(item).toLowerCase()) : [];
    const category = String(body.category ?? "").trim().toLowerCase();
    const photoOnly = body.photo_only === true;
    const verifiedOnly = body.verified_only === true;
    if (!validCoordinate(latitude, longitude)) return json({ ok: false, error: "Coordonnées Radar invalides." }, 422);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const now = new Date();

    // Legacy rows often have only city, not lat/lng. Fetch first, resolve exact
    // coordinates where available, then use a clearly lower-ranked city estimate.
    const [catalogRes, statusRes, externalRes] = await Promise.all([
      admin.from("waouh_unified_catalog").select("id,source,type,titre,description,categorie,prix_min,prix_max,devise,ville,quartier,lat,lng,photos,vendeur_nom,verified,last_seen_at,qualite_score").eq("is_active", true).order("last_seen_at", { ascending: false }).limit(300),
      admin.from("waouh_statuses").select("id,author_name,title,caption,price_fcfa,location,lat,lng,media_url,media_urls,article_id,expires_at,created_at").gt("expires_at", now.toISOString()).order("created_at", { ascending: false }).limit(100),
      admin.from("waouh_external_listings").select("id,title,description,category,price,currency,city,seller_name,image_url,scraped_at,status").neq("status", "ignored").order("scraped_at", { ascending: false }).limit(160),
    ]);

    const diagnostics = {
      catalog_rows: (catalogRes.data || []).length,
      status_rows: (statusRes.data || []).length,
      external_rows: (externalRes.data || []).length,
      exact_locations: 0,
      city_estimates: 0,
      discarded_without_location: 0,
      catalog_error: catalogRes.error?.message || null,
      status_error: statusRes.error?.message || null,
      external_error: externalRes.error?.message || null,
    };
    const output: Record<string, unknown>[] = [];
    const seen = new Set<string>();

    function add(input: {
      id: string; sourceId: string; source: string; type: RadarType; title: string; description: unknown; photoUrl: string | null; priceMin: unknown; priceMax: unknown; currency: unknown; city: unknown; district: unknown; row: Record<string, unknown>; freshness: Date; quality: number; verified: boolean; articleId: unknown; sellerName: unknown;
    }) {
      if (requestedTypes.length && !requestedTypes.includes(input.type)) return;
      if (category && !String(input.row.categorie ?? input.row.category ?? "").toLowerCase().includes(category)) return;
      if (verifiedOnly && !input.verified) return;
      if (photoOnly && !input.photoUrl) return;
      const point = coordinates(input.row, input.city);
      if (!point) { diagnostics.discarded_without_location++; return; }
      const distance = distanceKm(latitude, longitude, point.lat, point.lng);
      if (distance > radiusKm) return;
      const dedupe = `${input.title.toLowerCase()}|${String(input.city ?? "").toLowerCase()}|${String(input.priceMin ?? input.priceMax ?? "")}`;
      if (seen.has(dedupe)) return;
      seen.add(dedupe);
      point.precision === "exact" ? diagnostics.exact_locations++ : diagnostics.city_estimates++;
      output.push({
        id: input.id,
        source_id: input.sourceId,
        source: input.source,
        type: input.type,
        title: input.title || "Annonce WAOUH",
        description: input.description || null,
        photo_url: input.photoUrl,
        price_min: input.priceMin ?? null,
        price_max: input.priceMax ?? null,
        currency: input.currency || "XOF",
        city: input.city || null,
        district: input.district || null,
        latitude: point.lat,
        longitude: point.lng,
        location_precision: point.precision,
        distance_km: distance,
        bearing: bearing(latitude, longitude, point.lat, point.lng),
        ring: ring(distance),
        freshness_ms: Math.max(0, now.getTime() - input.freshness.getTime()),
        score: score(input.quality, input.freshness, distance, point.precision),
        seller_name: input.sellerName || null,
        article_id: input.articleId || null,
      });
    }

    for (const row of catalogRes.data || []) {
      const record = row as Record<string, unknown>;
      add({ id: `cat:${record.id}`, sourceId: String(record.id), source: String(record.source || "catalog"), type: normalizeType(record.type), title: String(record.titre || "Annonce WAOUH"), description: record.description, photoUrl: photoFrom(record.photos), priceMin: record.prix_min, priceMax: record.prix_max, currency: record.devise, city: record.ville, district: record.quartier, row: record, freshness: toDate(record.last_seen_at), quality: number(record.qualite_score, 50), verified: record.verified === true, articleId: record.id, sellerName: record.vendeur_nom });
    }
    for (const row of statusRes.data || []) {
      const record = row as Record<string, unknown>;
      add({ id: `st:${record.id}`, sourceId: String(record.id), source: "status", type: "status", title: String(record.title || record.caption || "Statut WAOUH"), description: record.caption, photoUrl: typeof record.media_url === "string" && record.media_url.trim() ? record.media_url : photoFrom(record.media_urls), priceMin: record.price_fcfa, priceMax: record.price_fcfa, currency: "XOF", city: record.location, district: null, row: record, freshness: toDate(record.created_at), quality: 60, verified: false, articleId: record.article_id, sellerName: record.author_name });
    }
    for (const row of externalRes.data || []) {
      const record = row as Record<string, unknown>;
      add({ id: `ext:${record.id}`, sourceId: String(record.id), source: "external", type: "sell", title: String(record.title || "Annonce trouvée"), description: record.description, photoUrl: typeof record.image_url === "string" && record.image_url.trim() ? record.image_url : null, priceMin: record.price, priceMax: record.price, currency: record.currency, city: record.city, district: null, row: record, freshness: toDate(record.scraped_at), quality: 50, verified: false, articleId: null, sellerName: record.seller_name });
    }

    output.sort((a, b) => number(b.score) - number(a.score));
    const errors = [catalogRes.error?.message, statusRes.error?.message, externalRes.error?.message].filter((value): value is string => typeof value === "string" && value.trim().length > 0);
    return json({
      ok: true,
      generated_at: now.toISOString(),
      coverage: { latitude, longitude, radius_km: radiusKm },
      sources: {
        catalog: { count: (catalogRes.data || []).length, error: catalogRes.error?.message || null },
        statuses: { count: (statusRes.data || []).length, error: statusRes.error?.message || null },
        external: { count: (externalRes.data || []).length, error: externalRes.error?.message || null },
      },
      diagnostics,
      warning: errors.length ? errors.join(" · ") : null,
      items: output.slice(0, 60),
    });
  } catch (error) {
    console.error("[waouh-radar-nearby]", error);
    return json({ ok: false, error: error instanceof Error ? error.message : "Radar indisponible." }, 500);
  }
});
