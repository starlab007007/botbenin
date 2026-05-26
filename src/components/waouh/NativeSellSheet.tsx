import React, { useEffect, useMemo, useRef, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Loader2, Camera, Image as ImageIcon, X, ChevronLeft, MapPin, Tag, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BENIN_CITIES } from "@/data/beninLocations";
import { cn } from "@/lib/utils";

export type Att = { url: string; type: string };

const MAX_PHOTOS = 2;
const SUGGESTED_ITEMS = [
  "iPhone", "Samsung Galaxy", "Ordinateur portable", "Télévision",
  "Frigo", "Climatiseur", "Voiture", "Moto", "Terrain", "Maison",
];

function formatFCFA(v: string) {
  const digits = v.replace(/\D/g, "");
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export const NativeSellSheet: React.FC<{
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sessionId: string;
  defaultCity?: string;
  onSubmit: (text: string, attachments: Att[]) => Promise<void> | void;
}> = ({ open, onOpenChange, sessionId, defaultCity, onSubmit }) => {
  const [what, setWhat] = useState("");
  const [price, setPrice] = useState("");
  const [city, setCity] = useState(defaultCity ?? "");
  const [cityOpen, setCityOpen] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const [photos, setPhotos] = useState<Att[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setWhat(""); setPrice(""); setCity(defaultCity ?? ""); setPhotos([]); setCityOpen(false); setCitySearch("");
    }
  }, [open, defaultCity]);

  const filteredCities = useMemo(() => {
    const q = citySearch.trim().toLowerCase();
    const list = BENIN_CITIES.map(c => c.ville);
    return q ? list.filter(v => v.toLowerCase().includes(q)) : list;
  }, [citySearch]);

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

  const canSubmit = what.trim().length > 1 && price.trim().length > 0 && !submitting && !uploading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const cleanPrice = price.replace(/\s/g, "");
      const text =
        `Je vends : ${what.trim()}\n` +
        `Prix : ${cleanPrice} FCFA` +
        (city.trim() ? `\nVille : ${city.trim()}` : "") +
        (photos.length ? `\n📸 ${photos.length} photo${photos.length > 1 ? "s" : ""} jointe${photos.length > 1 ? "s" : ""}` : "");
      await onSubmit(text, photos);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="p-0 h-[100dvh] max-h-[100dvh] rounded-t-none w-full sm:max-w-full border-0 flex flex-col bg-background"
        style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Native header */}
        <header className="flex items-center gap-2 px-2 py-3 bg-[hsl(165_91%_18%)] text-white shrink-0">
          <button onClick={() => onOpenChange(false)} className="p-2 -ml-1 rounded-full active:bg-white/15" aria-label="Fermer">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-base leading-tight">Publier une annonce</div>
            <div className="text-[11px] text-white/70 leading-tight">Vendre un produit ou service</div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-semibold transition",
              canSubmit ? "bg-white text-[hsl(165_91%_18%)] active:scale-95" : "bg-white/20 text-white/50"
            )}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Publier"}
          </button>
        </header>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {/* Quoi vendre */}
          <div>
            <label className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-2">
              <Tag className="w-4 h-4 text-[hsl(165_91%_25%)]" /> Quoi vendre ?
            </label>
            <input
              type="text"
              value={what}
              onChange={(e) => setWhat(e.target.value)}
              placeholder="Ex. iPhone 14 Pro 256Go"
              maxLength={120}
              className="w-full h-12 px-4 rounded-xl border border-border bg-card text-base focus:outline-none focus:ring-2 focus:ring-[hsl(165_91%_25%)] focus:border-transparent"
              autoFocus
            />
            <div className="flex gap-1.5 mt-2 overflow-x-auto scrollbar-none -mx-1 px-1 pb-1">
              {SUGGESTED_ITEMS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setWhat(s)}
                  className="shrink-0 px-3 py-1 rounded-full bg-muted text-foreground text-xs border border-border active:scale-95"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Prix */}
          <div>
            <label className="text-sm font-semibold text-foreground mb-2 block">Prix</label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={formatFCFA(price)}
                onChange={(e) => setPrice(e.target.value.replace(/\D/g, "").slice(0, 12))}
                placeholder="0"
                className="w-full h-14 pl-4 pr-20 rounded-xl border border-border bg-card text-2xl font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-[hsl(165_91%_25%)] focus:border-transparent"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">FCFA</span>
            </div>
          </div>

          {/* Ville */}
          <div>
            <label className="text-sm font-semibold text-foreground mb-2 block">Ville</label>
            <button
              type="button"
              onClick={() => setCityOpen(true)}
              className="w-full h-12 px-4 rounded-xl border border-border bg-card text-left flex items-center gap-2 active:bg-muted"
            >
              <MapPin className="w-5 h-5 text-[hsl(165_91%_25%)] shrink-0" />
              <span className={city ? "text-foreground" : "text-muted-foreground"}>
                {city || "Choisir une ville"}
              </span>
            </button>
          </div>

          {/* Photos */}
          <div>
            <label className="text-sm font-semibold text-foreground mb-2 block">Photos (max {MAX_PHOTOS})</label>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((p, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-border">
                  <img src={p.url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotos((arr) => arr.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center active:scale-95"
                    aria-label="Retirer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <>
                  <button
                    type="button"
                    onClick={() => cameraRef.current?.click()}
                    disabled={uploading}
                    className="aspect-square rounded-xl border-2 border-dashed border-border bg-muted/40 flex flex-col items-center justify-center gap-1 active:scale-95 active:bg-muted"
                  >
                    {uploading
                      ? <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      : <Camera className="w-6 h-6 text-[hsl(165_91%_25%)]" />}
                    <span className="text-[11px] font-medium text-muted-foreground">Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => galleryRef.current?.click()}
                    disabled={uploading}
                    className="aspect-square rounded-xl border-2 border-dashed border-border bg-muted/40 flex flex-col items-center justify-center gap-1 active:scale-95 active:bg-muted"
                  >
                    <ImageIcon className="w-6 h-6 text-[hsl(165_91%_25%)]" />
                    <span className="text-[11px] font-medium text-muted-foreground">Galerie</span>
                  </button>
                </>
              )}
            </div>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => upload(e.target.files)} />
            <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
          </div>

          {/* Aperçu */}
          {(what || price) && (
            <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">Aperçu du message</div>
              <p className="whitespace-pre-wrap text-foreground">
                {`Je vends : ${what || "…"}\nPrix : ${formatFCFA(price) || "0"} FCFA${city ? `\nVille : ${city}` : ""}`}
              </p>
            </div>
          )}
        </div>

        {/* Sticky bottom CTA */}
        <div className="border-t bg-background p-3 shrink-0">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full h-12 rounded-xl bg-[hsl(165_91%_25%)] hover:bg-[hsl(165_91%_18%)] text-white text-base font-semibold"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            Publier l'annonce
          </Button>
        </div>

        {/* City picker bottom sheet */}
        <Sheet open={cityOpen} onOpenChange={setCityOpen}>
          <SheetContent side="bottom" className="p-0 h-[80dvh] rounded-t-2xl flex flex-col">
            <div className="px-4 pt-4 pb-2 border-b">
              <div className="mx-auto w-10 h-1 rounded-full bg-muted mb-3" />
              <div className="font-semibold text-base mb-2">Choisir une ville</div>
              <input
                autoFocus
                value={citySearch}
                onChange={(e) => setCitySearch(e.target.value)}
                placeholder="Rechercher…"
                className="w-full h-11 px-4 rounded-xl border border-border bg-muted/40 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(165_91%_25%)]"
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredCities.map((v) => (
                <button
                  key={v}
                  onClick={() => { setCity(v); setCityOpen(false); setCitySearch(""); }}
                  className="w-full px-4 py-3 text-left flex items-center justify-between border-b border-border/50 active:bg-muted"
                >
                  <span className="text-base">{v}</span>
                  {v === city && <Check className="w-5 h-5 text-[hsl(165_91%_25%)]" />}
                </button>
              ))}
              {filteredCities.length === 0 && (
                <div className="p-6 text-center text-sm text-muted-foreground">Aucune ville trouvée</div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </SheetContent>
    </Sheet>
  );
};

export default NativeSellSheet;
