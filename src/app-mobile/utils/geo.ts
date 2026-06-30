// Geo helpers — haversine distance + bearing for the WAOUH Radar.

const R_KM = 6371;
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Bearing in degrees from point A → point B (0 = North, clockwise). */
export function bearingDeg(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lng2 - lng1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return (toDeg(θ) + 360) % 360;
}

/** Bounding-box pre-filter (degrees) around (lat, lng) with `km` radius. */
export function bboxAround(lat: number, lng: number, km: number) {
  const dLat = km / 110.574;
  const dLng = km / (111.32 * Math.cos(toRad(lat)) || 1);
  return {
    minLat: lat - dLat,
    maxLat: lat + dLat,
    minLng: lng - dLng,
    maxLng: lng + dLng,
  };
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

export const RADAR_RINGS = [
  { id: 1, maxKm: 1, label: "≤ 1 km", color: "#ef4444", emoji: "🔴" },
  { id: 2, maxKm: 5, label: "1–5 km", color: "#f59e0b", emoji: "🟠" },
  { id: 3, maxKm: 20, label: "5–20 km", color: "#eab308", emoji: "🟡" },
  { id: 4, maxKm: 100, label: "20–100 km", color: "#22c55e", emoji: "🟢" },
] as const;

export type RadarRing = (typeof RADAR_RINGS)[number];

export function ringForDistance(km: number): RadarRing | null {
  for (const r of RADAR_RINGS) if (km <= r.maxKm) return r;
  return null;
}
