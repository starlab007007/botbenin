import React, { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Camera, Image as ImageIcon, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type Att = { url: string; type: string };

const MAX_PHOTOS = 2;

export const WaouhSellWizard: React.FC<{
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sessionId: string;
  defaultCity?: string;
  onSubmit: (text: string, attachments: Att[]) => Promise<void> | void;
}> = ({ open, onOpenChange, sessionId, defaultCity, onSubmit }) => {
  const [what, setWhat] = useState("");
  const [price, setPrice] = useState("");
  const [city, setCity] = useState(defaultCity ?? "");
  const [photos, setPhotos] = useState<Att[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    if (open) {
      setWhat(""); setPrice(""); setCity(defaultCity ?? ""); setPhotos([]);
    }
  }, [open, defaultCity]);

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
      const text =
        `Je vends : ${what.trim()}\n` +
        `Prix : ${price.trim()} FCFA` +
        (city.trim() ? `\nVille : ${city.trim()}` : "") +
        (photos.length ? `\n📸 ${photos.length} photo${photos.length > 1 ? "s" : ""} jointe${photos.length > 1 ? "s" : ""}` : "");
      await onSubmit(text, photos);
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
            <Label htmlFor="city">Ville</Label>
            <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Cotonou" />
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
