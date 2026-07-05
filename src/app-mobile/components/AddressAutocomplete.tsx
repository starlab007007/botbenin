import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Locate, MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Suggestion {
  display_name: string;
  lat: string;
  lon: string;
}

interface Props {
  address: string;
  onAddressChange: (value: string) => void;
  onPositionChange: (lat: number, lng: number) => void;
  lat: number | null;
  lng: number | null;
  countryCode?: string; // ISO 3166-1 alpha-2, e.g. "bj"
}

export function AddressAutocomplete({ address, onAddressChange, onPositionChange, lat, lng, countryCode = "bj" }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const debounceRef = useRef<any>(null);

  useEffect(() => {
    if (!address || address.length < 3) { setSuggestions([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=${countryCode}&q=${encodeURIComponent(address)}`;
        const r = await fetch(url, { headers: { "Accept-Language": "fr" } });
        const j = await r.json();
        setSuggestions(Array.isArray(j) ? j : []);
      } catch { setSuggestions([]); }
      finally { setLoading(false); }
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [address, countryCode]);

  const useMyLocation = () => {
    if (!navigator.geolocation) return toast.error("Géolocalisation indisponible");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        onPositionChange(p.coords.latitude, p.coords.longitude);
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${p.coords.latitude}&lon=${p.coords.longitude}`, { headers: { "Accept-Language": "fr" } });
          const j = await r.json();
          if (j?.display_name) onAddressChange(j.display_name);
        } catch {}
        setLocating(false);
        toast.success("Position captée");
      },
      () => { setLocating(false); toast.error("Position refusée"); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const pick = (s: Suggestion) => {
    onAddressChange(s.display_name);
    onPositionChange(Number(s.lat), Number(s.lon));
    setSuggestions([]);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input value={address} onChange={(e) => onAddressChange(e.target.value)} placeholder="Tapez une adresse (ex: Calavi, Cotonou…)" />
        {loading && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />}
        {suggestions.length > 0 && (
          <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg max-h-56 overflow-y-auto">
            {suggestions.map((s, i) => (
              <button key={i} type="button" onClick={() => pick(s)} className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-start gap-2 border-b last:border-0">
                <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                <span className="line-clamp-2">{s.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <Button type="button" variant="outline" className="w-full" onClick={useMyLocation} disabled={locating}>
        {locating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Locate className="mr-2 h-4 w-4" />}
        {lat != null && lng != null ? `📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}` : "Utiliser ma position actuelle"}
      </Button>
      {lat != null && lng != null && (
        <p className="text-xs text-green-600">✓ Position enregistrée</p>
      )}
    </div>
  );
}
