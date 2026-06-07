import React, { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Camera, Image as ImageIcon, X, MapPin, Pencil, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type Att = { url: string; type: string };
export type SellLocation = { lat: number | null; lng: number | null; city: string };

const MAX_PHOTOS = 2;

export const WaouhSellWizard: React.FC<{
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sessionId: string;
  defaultCity?: string;
  onSubmit: (text: string, attachments: Att[], location?: SellLocation) => Promise<void> | void;
}> = ({ open, onOpenChange, sessionId, defaultCity, onSubmit }) => {
  const [what, setWhat] = useState("");
  const [price, setPrice] = useState("");
  const [city, setCity] = useState(defaultCity ?? "");
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const [cityLocked, setCityLocked] = useState(true);
  const [geoLoading, setGeoLoading] = useState(false);
  const [photos, setPhotos] = useState<Att[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const detectLocation = React.useCallback(async () => {
    if (!navigator.geolocation) {
      toast({ title: "Géolocalisation indisponible", description: "Indiquez la ville manuellement.", variant: "destructive" });
      setCityLocked(false);
      return;
    }
    setGeoLoading(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true, timeout: 10000, maximumAge: 0,
        });
      });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setCoords({ lat, lng });
      const { data } = await supabase.functions.invoke("waouh-geocode", { body: { lat, lng } });
      const detectedCity = (data as any)?.city
        || ((data as any)?.district ? `${(data as any).district}` : "")
        || (defaultCity ?? "");
      if (detectedCity) setCity(detectedCity);
    } catch (e: any) {
      toast({ title: "Position non détectée", description: e?.message || "Activez la géolocalisation, ou saisissez la ville.", variant: "destructive" });
      setCityLocked(false);
    } finally {
      setGeoLoading(false);
    }
  }, [defaultCity, toast]);

  React.useEffect(() => {
    if (open) {
      setWhat(""); setPrice(""); setCity(defaultCity ?? ""); setPhotos([]);
      setCoords({ lat: null, lng: null }); setCityLocked(true);
      // Auto-detect at open — overrides any stale cached city.
      detectLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      toast({ title: "Limite atteinte", description: `Maximum ${MAX_PHOTOS} photos.`, variant: "destructive" });
      return;
    }
    const list = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      for (const file of list) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `web/${sessionId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("waouh-uploads").upload(path, file, { contentType: file.type });
        if (error) throw error;
        const { data: pub } = supabase.storage.from("waouh-uploads").getPublicUrl(path);
        setPhotos((p) => [...p, { url: pub.publicUrl, type: file.type }]);
      }
    } catch (e: any) {
      toast({ title: "Upload échoué", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (cameraRef.current) cameraRef.current.value = "";
      if (galleryRef.current) galleryRef.current.value = "";
    }
  };

  const canSubmit = what.trim().length > 1 && price.trim().length > 0 && !submitting && !uploading && !geoLoading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      let finalCoords = coords;
      // If user edited city manually, forward-geocode to keep lat/lng consistent.
      if (!cityLocked && city.trim()) {
        try {
          const { data } = await supabase.functions.invoke("waouh-geocode", { body: { query: city.trim() } });
          if (typeof (data as any)?.lat === "number" && typeof (data as any)?.lng === "number") {
            finalCoords = { lat: (data as any).lat, lng: (data as any).lng };
          }
        } catch { /* keep current coords */ }
      }
      const text =
        `Je vends : ${what.trim()}\n` +
        `Prix : ${price.trim()} FCFA` +
        (city.trim() ? `\nVille : ${city.trim()}` : "") +
        (photos.length ? `\n📸 ${photos.length} photo${photos.length > 1 ? "s" : ""} jointe${photos.length > 1 ? "s" : ""}` : "");
      await onSubmit(text, photos, { lat: finalCoords.lat, lng: finalCoords.lng, city: city.trim() });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[92vw] max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Publier une annonce</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="what">Quoi vendre ?</Label>
            <Input id="what" value={what} onChange={(e) => setWhat(e.target.value)} placeholder="Ex. iPhone 14 Pro 256Go" />
          </div>
          <div>
            <Label htmlFor="price">Prix (FCFA)</Label>
            <Input id="price" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ""))} placeholder="650000" />
          </div>
          <div>
            <Label htmlFor="city" className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5" />
              Ville (détection automatique)
            </Label>
            <div className="flex gap-2">
              <Input
                id="city"
                value={city}
                disabled={cityLocked || geoLoading}
                onChange={(e) => setCity(e.target.value)}
                placeholder={geoLoading ? "Détection en cours…" : "Cotonou"}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => setCityLocked((v) => !v)} disabled={geoLoading}>
                {cityLocked ? <Pencil className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={detectLocation} disabled={geoLoading}>
                {geoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
              </Button>
            </div>
            {coords.lat != null && coords.lng != null && (
              <p className="text-[11px] text-muted-foreground mt-1">
                📍 {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
              </p>
            )}
          </div>

          <div>
            <Label>Photos (max {MAX_PHOTOS})</Label>
            <div className="flex gap-2 mt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => cameraRef.current?.click()} disabled={uploading || photos.length >= MAX_PHOTOS}>
                {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Camera className="w-4 h-4 mr-1" />}
                Prendre photo
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => galleryRef.current?.click()} disabled={uploading || photos.length >= MAX_PHOTOS}>
                <ImageIcon className="w-4 h-4 mr-1" />
                Galerie
              </Button>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => upload(e.target.files)} />
              <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
            </div>
            {photos.length > 0 && (
              <div className="flex gap-2 mt-2">
                {photos.map((p, i) => (
                  <div key={i} className="relative">
                    <img src={p.url} alt="" className="w-16 h-16 rounded-md object-cover border" />
                    <button type="button" onClick={() => setPhotos((arr) => arr.filter((_, j) => j !== i))} className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {submitting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
            Publier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WaouhSellWizard;
