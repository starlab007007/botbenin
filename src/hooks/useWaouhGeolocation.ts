import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const CACHE_KEY = "waouh_geo_v1";
const DEFAULT = { lat: 6.36, lng: 2.42, city: "Cotonou", country: "Bénin", district: null as string | null, accuracy: null as number | null };

export type GeoState = {
  lat: number;
  lng: number;
  city: string;
  country: string;
  district?: string | null;
  accuracy?: number | null; // meters
};

export function useWaouhGeolocation() {
  const [geo, setGeo] = useState<GeoState>(() => {
    try {
      const c = localStorage.getItem(CACHE_KEY);
      if (c) return JSON.parse(c);
    } catch {}
    return DEFAULT;
  });
  const [loading, setLoading] = useState(false);

  const reverseGeocode = useCallback(async (lat: number, lng: number, accuracy: number | null = null) => {
    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke("waouh-geocode", { body: { lat, lng } });
      const next: GeoState = {
        lat: typeof data?.lat === "number" ? data.lat : lat,
        lng: typeof data?.lng === "number" ? data.lng : lng,
        city: data?.city || DEFAULT.city,
        country: data?.country || DEFAULT.country,
        district: data?.district ?? null,
        accuracy,
      };
      setGeo(next);
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ...next, at: Date.now() }));
    } catch (e) {
      console.warn("reverseGeocode failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const setCity = useCallback(async (city: string) => {
    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke("waouh-geocode", { body: { query: city } });
      const next: GeoState = {
        lat: data?.lat ?? geo.lat,
        lng: data?.lng ?? geo.lng,
        city: data?.city || city,
        country: data?.country || geo.country,
        district: data?.district ?? null,
        accuracy: null,
      };
      setGeo(next);
      localStorage.setItem(CACHE_KEY, JSON.stringify(next));
    } finally {
      setLoading(false);
    }
  }, [geo.lat, geo.lng, geo.country]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    let lastGeocodeAt = 0;
    let lastLat: number | null = null;
    let lastLng: number | null = null;
    let cacheStale = true;
    try {
      const c = localStorage.getItem(CACHE_KEY);
      if (c) cacheStale = (Date.now() - (JSON.parse(c)?.at || 0)) > 5 * 60 * 1000;
    } catch {}
    if (cacheStale) {
      navigator.geolocation.getCurrentPosition(
        (pos) => reverseGeocode(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy ?? null),
        () => {},
        { timeout: 8000, enableHighAccuracy: true }
      );
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        const now = Date.now();
        const moved = lastLat == null || Math.hypot(lat - lastLat, lng - lastLng!) > 0.002;
        const stale = now - lastGeocodeAt > 2 * 60 * 1000;
        setGeo((g) => ({ ...g, lat, lng, accuracy: accuracy ?? g.accuracy ?? null }));
        if (moved && stale) {
          lastGeocodeAt = now;
          lastLat = lat;
          lastLng = lng;
          reverseGeocode(lat, lng, accuracy ?? null);
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 }
    );
    return () => { navigator.geolocation.clearWatch(watchId); };
  }, [reverseGeocode]);

  const refresh = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => reverseGeocode(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy ?? null),
      () => {},
      { timeout: 8000, enableHighAccuracy: true }
    );
  }, [reverseGeocode]);

  return { geo, loading, setCity, refresh };
}
