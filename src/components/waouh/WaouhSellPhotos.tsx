import { useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { compressImage, uploadOptions } from "@/lib/imageOptimize";
import { getWaouhSessionId } from "@/app-mobile/hooks/useWaouhIdentity";
import { Textarea } from "@/components/ui/textarea";

export const SELL_MAX_PHOTOS = 4;

type PickerProps = {
  photos: string[];
  onPhotos: (next: string[]) => void;
  notes: string;
  onNotes: (next: string) => void;
};

/** Photos (max 4) + précisions de l'article à vendre. */
export function WaouhSellPhotos({ photos, onPhotos, notes, onNotes }: PickerProps) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = SELL_MAX_PHOTOS - photos.length;
    if (room <= 0) {
      toast({ title: "4 photos maximum", variant: "destructive" });
      return;
    }
    setBusy(true);
    const next = [...photos];
    try {
      const sessionId = getWaouhSessionId();
      for (const raw of Array.from(files).slice(0, room)) {
        const file = await compressImage(raw, { maxDimension: 1600, quality: 0.82 });
        const ext = (file.name.split(".").pop() || "webp").toLowerCase();
        const path = `web/${sessionId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("waouh-uploads").upload(path, file, uploadOptions(file.type));
        if (error) throw error;
        next.push(supabase.storage.from("waouh-uploads").getPublicUrl(path).data.publicUrl);
      }
    } catch {
      toast({ title: "Photo non ajoutée", description: "Réessayez avec une autre photo.", variant: "destructive" });
    } finally {
      onPhotos(next);
      setBusy(false);
      if (cameraRef.current) cameraRef.current.value = "";
      if (galleryRef.current) galleryRef.current.value = "";
    }
  };

  const full = photos.length >= SELL_MAX_PHOTOS;
  return (
    <div className="space-y-2 rounded-xl border border-violet-100 bg-white/70 p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Photos de l’article</span>
        <span className="text-xs text-muted-foreground">{photos.length}/{SELL_MAX_PHOTOS}</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {photos.map((url, i) => (
          <div key={url} className="relative aspect-square overflow-hidden rounded-lg border bg-muted">
            <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" loading="lazy" />
            <button type="button" aria-label="Retirer la photo" onClick={() => onPhotos(photos.filter(p => p !== url))}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {busy && <div className="flex aspect-square items-center justify-center rounded-lg border bg-muted"><Loader2 className="h-5 w-5 animate-spin" /></div>}
        {!full && !busy && (
          <>
            <button type="button" aria-label="Prendre une photo" onClick={() => cameraRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs text-violet-700">
              <Camera className="h-5 w-5" />Photo
            </button>
            <button type="button" aria-label="Choisir dans la galerie" onClick={() => galleryRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs text-violet-700">
              <ImagePlus className="h-5 w-5" />Galerie
            </button>
          </>
        )}
      </div>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => void add(e.target.files)} />
      <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={e => void add(e.target.files)} />
      <Textarea value={notes} onChange={e => onNotes(e.target.value.slice(0, 400))} rows={2}
        placeholder="Précisions : état, défauts, accessoires, garantie…" aria-label="Précisions sur l’article" />
    </div>
  );
}

type CardProps = { title: string; price?: number | null; floor?: number | null; city?: string; photos: string[]; notes: string };

/** Détails de l’article avec les photos jointes, affichés avec les résultats. */
export function WaouhMyArticleCard({ title, price, floor, city, photos, notes }: CardProps) {
  const [idx, setIdx] = useState(0);
  if (!title && !photos.length && !notes) return null;
  const shown = photos[Math.min(idx, photos.length - 1)];
  const fmt = (n: number) => `${n.toLocaleString("fr-FR")} FCFA`;
  return (
    <section className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm" aria-label="Mon article">
      {shown && (
        <div>
          <img src={shown} alt={title || "Mon article"} className="aspect-[16/10] w-full object-cover" />
          {photos.length > 1 && (
            <div className="flex gap-2 p-2">
              {photos.map((p, i) => (
                <button key={p} type="button" onClick={() => setIdx(i)} aria-label={`Photo ${i + 1}`}
                  className={`h-12 w-12 overflow-hidden rounded-md border-2 ${i === idx ? "border-violet-600" : "border-transparent"}`}>
                  <img src={p} alt="" className="h-full w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="space-y-1 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">Mon article</p>
        {title && <p className="text-base font-semibold">{title}</p>}
        <p className="text-sm text-muted-foreground">
          {[price ? fmt(price) : "", floor ? `minimum ${fmt(floor)}` : "", city].filter(Boolean).join(" · ")}
        </p>
        {notes && <p className="text-sm">{notes}</p>}
      </div>
    </section>
  );
}
