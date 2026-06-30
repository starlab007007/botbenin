import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  bboxAround,
  bearingDeg,
  haversineKm,
  RADAR_RINGS,
  ringForDistance,
} from "../utils/geo";

export type RadarItemType = "SELL" | "BUY" | "STATUS";

export interface RadarItem {
  id: string;
  source: "catalog" | "status";
  type: RadarItemType;
  title: string;
  description?: string | null;
  photo?: string | null;
  priceMin?: number | null;
  priceMax?: number | null;
  devise?: string | null;
  city?: string | null;
  district?: string | null;
  lat: number;
  lng: number;
  distanceKm: number;
  bearing: number;
  ringId: number;
  ringColor: string;
  freshnessMs: number; // age in ms
  score: number;
  sellerName?: string | null;
  sellerPhone?: string | null;
  raw?: any;
}

export interface RadarFilters {
  category?: string | null;
  priceMin?: number | null;
  priceMax?: number | null;
  types: RadarItemType[]; // empty = all
  verifiedOnly?: boolean;
  photoOnly?: boolean;
  urgent?: boolean;
}

export const DEFAULT_FILTERS: RadarFilters = {
  category: null,
  priceMin: null,
  priceMax: null,
  types: [],
  verifiedOnly: false,
  photoOnly: true,
  urgent: false,
};

const PAGE_SIZE = 60;

export function useRadarScan(
  lat: number | null,
  lng: number | null,
  filters: RadarFilters
) {
  const [items, setItems] = useState<RadarItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanAt, setScanAt] = useState<number>(0);
  const reqRef = useRef(0);

  const maxRadiusKm = useMemo(() => {
    if (filters.urgent) return 5;
    return RADAR_RINGS[RADAR_RINGS.length - 1].maxKm;
  }, [filters.urgent]);

  const scan = useCallback(async () => {
    if (lat == null || lng == null) return;
    const reqId = ++reqRef.current;
    setLoading(true);
    setError(null);
    try {
      const bbox = bboxAround(lat, lng, maxRadiusKm);
      const wantCatalog = filters.types.length === 0 || filters.types.some((t) => t === "SELL" || t === "BUY");
      const wantStatus = filters.types.length === 0 || filters.types.includes("STATUS");

      const catalogPromise = (async () => {
        if (!wantCatalog) return { data: [] as any[] };
        let q: any = supabase
          .from("waouh_unified_catalog")
          .select(
            "id,type,titre,description,categorie,prix_min,prix_max,devise,ville,quartier,lat,lng,photos,vendeur_nom,vendeur_phone,vendeur_whatsapp,verified,last_seen_at,qualite_score"
          )
          .eq("is_active", true)
          .not("lat", "is", null)
          .not("lng", "is", null)
          .gte("lat", bbox.minLat)
          .lte("lat", bbox.maxLat)
          .gte("lng", bbox.minLng)
          .lte("lng", bbox.maxLng)
          .order("last_seen_at", { ascending: false })
          .limit(PAGE_SIZE * 2);
        if (filters.category) q = q.eq("categorie", filters.category);
        if (filters.priceMin != null) q = q.gte("prix_min", filters.priceMin);
        if (filters.priceMax != null) q = q.lte("prix_max", filters.priceMax);
        if (filters.verifiedOnly) q = q.eq("verified", true);
        // Map UI types → catalog types ("SELL"→"offer", "BUY"→"demand")
        if (filters.types.length && !filters.types.includes("STATUS")) {
          const mapped = filters.types
            .map((t) => (t === "SELL" ? "offer" : t === "BUY" ? "demand" : null))
            .filter(Boolean) as ("demand" | "offer")[];
          if (mapped.length) q = q.in("type", mapped);
        }
        return await q;
      })();

      const statusPromise = (async () => {
        if (!wantStatus) return { data: [] as any[] };
        const nowIso = new Date().toISOString();
        return await supabase
          .from("waouh_statuses")
          .select(
            "id,user_id,author_name,type,title,caption,price_fcfa,location,lat,lng,media_url,media_urls,article_id,expires_at,created_at"
          )
          .gt("expires_at", nowIso)
          .not("lat", "is", null)
          .not("lng", "is", null)
          .gte("lat", bbox.minLat)
          .lte("lat", bbox.maxLat)
          .gte("lng", bbox.minLng)
          .lte("lng", bbox.maxLng)
          .order("created_at", { ascending: false })
          .limit(PAGE_SIZE);
      })();

      const [catRes, stRes]: any[] = await Promise.all([catalogPromise, statusPromise]);
      if (reqRef.current !== reqId) return;

      const now = Date.now();
      const out: RadarItem[] = [];

      for (const row of catRes?.data ?? []) {
        if (row.lat == null || row.lng == null) continue;
        const d = haversineKm(lat, lng, row.lat, row.lng);
        if (d > maxRadiusKm) continue;
        const ring = ringForDistance(d);
        if (!ring) continue;
        const photo = Array.isArray(row.photos) && row.photos.length ? row.photos[0] : null;
        if (filters.photoOnly && !photo) continue;
        const ageMs = row.last_seen_at ? now - new Date(row.last_seen_at).getTime() : 7 * 86400000;
        const freshScore = Math.exp(-ageMs / (1000 * 60 * 60 * 24 * 3)); // half-life ~3d
        const score = (Number(row.qualite_score ?? 0.5) * freshScore) / (1 + d);
        out.push({
          id: `cat:${row.id}`,
          source: "catalog",
          type: (row.type === "demand" || row.type === "BUY" ? "BUY" : "SELL"),
          title: row.titre || "(sans titre)",
          description: row.description,
          photo,
          priceMin: row.prix_min,
          priceMax: row.prix_max,
          devise: row.devise || "FCFA",
          city: row.ville,
          district: row.quartier,
          lat: row.lat,
          lng: row.lng,
          distanceKm: d,
          bearing: bearingDeg(lat, lng, row.lat, row.lng),
          ringId: ring.id,
          ringColor: ring.color,
          freshnessMs: ageMs,
          score,
          sellerName: row.vendeur_nom,
          sellerPhone: row.vendeur_whatsapp || row.vendeur_phone,
          raw: row,
        });
      }

      for (const row of stRes?.data ?? []) {
        if (row.lat == null || row.lng == null) continue;
        const d = haversineKm(lat, lng, row.lat, row.lng);
        if (d > maxRadiusKm) continue;
        const ring = ringForDistance(d);
        if (!ring) continue;
        const photo = row.media_url || (Array.isArray(row.media_urls) && row.media_urls[0]) || null;
        if (filters.photoOnly && !photo) continue;
        const created = row.created_at ? new Date(row.created_at).getTime() : now;
        const ageMs = now - created;
        const freshScore = Math.exp(-ageMs / (1000 * 60 * 60 * 12));
        const score = (0.6 * freshScore) / (1 + d);
        out.push({
          id: `st:${row.id}`,
          source: "status",
          type: "STATUS",
          title: row.title || row.caption || "Statut",
          description: row.caption,
          photo,
          priceMin: row.price_fcfa,
          priceMax: row.price_fcfa,
          devise: "FCFA",
          city: row.location,
          district: null,
          lat: row.lat,
          lng: row.lng,
          distanceKm: d,
          bearing: bearingDeg(lat, lng, row.lat, row.lng),
          ringId: ring.id,
          ringColor: ring.color,
          freshnessMs: ageMs,
          score,
          sellerName: row.author_name,
          sellerPhone: null,
          raw: row,
        });
      }

      // Sort: ring asc, score desc
      out.sort((a, b) => (a.ringId - b.ringId) || (b.score - a.score));
      setItems(out);
      setScanAt(Date.now());
    } catch (e: any) {
      setError(e?.message || "Erreur lors du scan radar");
    } finally {
      if (reqRef.current === reqId) setLoading(false);
    }
  }, [lat, lng, filters, maxRadiusKm]);

  useEffect(() => {
    scan();
  }, [scan]);

  return { items, loading, error, scan, scanAt, maxRadiusKm };
}
