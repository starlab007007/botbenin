import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useStatuses, type StatusType } from "@/hooks/useStatuses";
import { cn } from "@/lib/utils";

const TYPES: { value: StatusType; label: string; tint: string }[] = [
  { value: "sell", label: "🔴 Urgence vente", tint: "data-[active=true]:bg-red-600 data-[active=true]:text-white" },
  { value: "buy", label: "🟢 Recherche urgente", tint: "data-[active=true]:bg-emerald-600 data-[active=true]:text-white" },
  { value: "announce", label: "🟡 Annonce / Promo", tint: "data-[active=true]:bg-amber-600 data-[active=true]:text-white" },
];

interface Props {
  trigger?: React.ReactNode;
  defaultType?: StatusType;
}

export function StatusComposer({ trigger, defaultType = "sell" }: Props) {
  const { publishStatus } = useStatuses();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [type, setType] = useState<StatusType>(defaultType);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Le titre est requis");
      return;
    }
    setBusy(true);
    try {
      await publishStatus({
        type,
        title: title.trim(),
        caption: caption.trim() || undefined,
        price_fcfa: price ? parseInt(price.replace(/\D/g, ""), 10) : undefined,
        location: location.trim() || undefined,
        media_file: file,
      });
      toast.success("Statut publié — visible 24h");
      setOpen(false);
      setTitle(""); setCaption(""); setPrice(""); setLocation(""); setFile(null);
    } catch (err: any) {
      toast.error(err.message ?? "Impossible de publier");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="w-4 h-4 mr-1" /> Publier un statut · 24h
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[92vw] max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau statut · expire dans 24h</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="flex gap-1.5 flex-wrap">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                data-active={type === t.value}
                onClick={() => setType(t.value)}
                className={cn(
                  "text-xs px-2.5 py-1.5 rounded-full border border-border bg-card text-foreground",
                  t.tint
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div>
            <Label htmlFor="title">Titre *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex : iPhone 13 256Go en super état" maxLength={80} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="price">Prix (FCFA)</Label>
              <Input id="price" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="300000" />
            </div>
            <div>
              <Label htmlFor="loc">Ville</Label>
              <Input id="loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Cotonou" />
            </div>
          </div>

          <div>
            <Label htmlFor="caption">Détail (optionnel)</Label>
            <Textarea id="caption" value={caption} onChange={(e) => setCaption(e.target.value)} rows={2} maxLength={240} />
          </div>

          <div>
            <Label htmlFor="media">Photo ou vidéo (optionnel)</Label>
            <Input
              id="media"
              type="file"
              accept="image/*,video/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <Button type="submit" disabled={busy} className="w-full bg-emerald-600 hover:bg-emerald-700">
            {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            Publier · 24h
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
