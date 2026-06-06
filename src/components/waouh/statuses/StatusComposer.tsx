import { useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Plus, Loader2, ArrowLeft, ArrowRight, Check, ShoppingBag, Search, Megaphone,
  MapPin, Camera, ImageIcon, X
} from "lucide-react";
import { toast } from "sonner";
import { useStatuses, type StatusType } from "@/hooks/useStatuses";
import { useWaouhGeolocation } from "@/hooks/useWaouhGeolocation";
import { BENIN_CITIES, getQuartiersForCity } from "@/data/beninLocations";
import { cn } from "@/lib/utils";

interface Props {
  trigger?: React.ReactNode;
  defaultType?: StatusType;
}

type Step = "type" | "what" | "where" | "media";

const TYPE_OPTIONS: { value: StatusType; label: string; sub: string; Icon: any; tint: string }[] = [
  { value: "sell",     label: "Je vends",   sub: "Urgence vente",      Icon: ShoppingBag, tint: "from-red-500 to-red-700" },
  { value: "buy",      label: "Je cherche", sub: "Recherche urgente",  Icon: Search,      tint: "from-emerald-500 to-emerald-700" },
  { value: "announce", label: "J'annonce",  sub: "Promo · info",       Icon: Megaphone,   tint: "from-amber-500 to-amber-700" },
];

const ALL_CITY_NAMES = BENIN_CITIES.map((c) => c.ville);
const MAX_PHOTOS = 2;

export function StatusComposer({ trigger, defaultType = "sell" }: Props) {
  const { publishStatus } = useStatuses();
  const { geo, loading: geoLoading } = useWaouhGeolocation();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<Step>("type");
  const [type, setType] = useState<StatusType>(defaultType);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [usingGps, setUsingGps] = useState(false);
  const [caption, setCaption] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [zoomedIndex, setZoomedIndex] = useState<number | null>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  // Suggestions intelligentes : villes + quartiers, filtrées par saisie
  const suggestions = useMemo(() => {
    const q = location.trim().toLowerCase();
    const pool: string[] = [];
    for (const c of BENIN_CITIES) {
      pool.push(c.ville);
      for (const qt of c.quartiers) pool.push(`${qt}, ${c.ville}`);
    }
    const filtered = q
      ? pool.filter((p) => p.toLowerCase().includes(q)).slice(0, 8)
      : ALL_CITY_NAMES.slice(0, 6);
    return Array.from(new Set(filtered));
  }, [location]);

  const reset = () => {
    setStep("type"); setTitle(""); setPrice(""); setLocation(""); setCaption("");
    setFiles([]); setPreviews([]); setUsingGps(false);
  };

  const close = (v: boolean) => {
    setOpen(v);
    if (!v) {
      previews.forEach((u) => URL.revokeObjectURL(u));
      reset();
    }
  };

  const useGpsLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Géolocalisation indisponible sur cet appareil");
      return;
    }
    setUsingGps(true);
    const label = geo.district ? `${geo.district}, ${geo.city}` : geo.city;
    setLocation(label);
    toast.success(`Position : ${label}`);
  };

  const addFiles = (incoming: FileList | null) => {
    if (!incoming || incoming.length === 0) return;
    const remaining = MAX_PHOTOS - files.length;
    if (remaining <= 0) { toast.error(`Maximum ${MAX_PHOTOS} photos`); return; }
    const next = Array.from(incoming).slice(0, remaining).filter((f) => f.type.startsWith("image/"));
    if (next.length === 0) { toast.error("Seules les photos sont acceptées"); return; }
    setFiles((prev) => [...prev, ...next]);
    next.forEach((f) => {
      const reader = new FileReader();
      reader.onload = () => {
        const url = String(reader.result || "");
        if (url) setPreviews((prev) => [...prev, url]);
      };
      reader.readAsDataURL(f);
    });
  };

  const removeFile = (i: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
    setPreviews((prev) => prev.filter((_, idx) => idx !== i));
  };

  const submit = async () => {
    if (!title.trim()) { toast.error("Décrivez en quelques mots"); setStep("what"); return; }
    setBusy(true);
    try {
      await publishStatus({
        type,
        title: title.trim(),
        caption: caption.trim() || undefined,
        price_fcfa: price ? parseInt(price.replace(/\D/g, ""), 10) : undefined,
        location: location.trim() || undefined,
        lat: usingGps ? geo.lat : undefined,
        lng: usingGps ? geo.lng : undefined,
        media_files: files,
      });
      toast.success("Statut publié — visible 24h");
      close(false);
    } catch (err: any) {
      toast.error(err.message ?? "Impossible de publier");
    } finally {
      setBusy(false);
    }
  };

  const next = () => {
    if (step === "type") setStep("what");
    else if (step === "what") {
      if (!title.trim()) { toast.error("Donnez un titre court"); return; }
      setStep("where");
    } else if (step === "where") setStep("media");
  };
  const prev = () => {
    if (step === "what") setStep("type");
    else if (step === "where") setStep("what");
    else if (step === "media") setStep("where");
  };

  const stepIndex = ["type", "what", "where", "media"].indexOf(step);
  const priceLabel = type === "buy" ? "Budget max" : type === "sell" ? "Prix" : "Montant (optionnel)";
  const placeholderTitle =
    type === "sell" ? "Ex : iPhone 13 256Go neuf"
    : type === "buy" ? "Ex : Frigo d'occasion en bon état"
    : "Ex : Promo flash sur tissus wax";

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="w-4 h-4 mr-1" /> Publier · 24h
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[92vw] max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Publier un statut · 24h</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-1.5 mb-1">
          {[0,1,2,3].map((i) => (
            <span key={i} className={cn("h-1 rounded-full flex-1", i <= stepIndex ? "bg-emerald-600" : "bg-muted")} />
          ))}
        </div>

        {step === "type" && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Que voulez-vous publier ?</p>
            {TYPE_OPTIONS.map(({ value, label, sub, Icon, tint }) => (
              <button
                key={value}
                onClick={() => { setType(value); setStep("what"); }}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left active:scale-[0.99]",
                  type === value ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30" : "border-border bg-card hover:bg-muted"
                )}
              >
                <span className={cn("w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center text-white shrink-0", tint)}>
                  <Icon className="w-5 h-5" />
                </span>
                <span className="flex-1">
                  <span className="block font-semibold text-foreground">{label}</span>
                  <span className="block text-xs text-muted-foreground">{sub}</span>
                </span>
                {type === value && <Check className="w-5 h-5 text-emerald-600" />}
              </button>
            ))}
          </div>
        )}

        {step === "what" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">En quelques mots, c'est quoi ?</p>
            <div>
              <Label htmlFor="title">Titre court *</Label>
              <Input id="title" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder={placeholderTitle} maxLength={80} />
            </div>
            <div>
              <Label htmlFor="price">{priceLabel} (FCFA)</Label>
              <Input id="price" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="300000" />
              {price && (
                <p className="text-xs text-muted-foreground mt-1">
                  ≈ {parseInt(price.replace(/\D/g, ""), 10).toLocaleString("fr-FR")} FCFA
                </p>
              )}
            </div>
          </div>
        )}

        {step === "where" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Où êtes-vous ?</p>

            {/* GPS auto */}
            <button
              type="button"
              onClick={useGpsLocation}
              disabled={geoLoading}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                usingGps ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30" : "border-border bg-card hover:bg-muted"
              )}
            >
              <span className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shrink-0">
                {geoLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-semibold text-foreground text-sm">Utiliser ma position GPS</span>
                <span className="block text-xs text-muted-foreground truncate">
                  {geo.district ? `${geo.district}, ${geo.city}` : geo.city}
                  {geo.accuracy ? ` · ±${Math.round(geo.accuracy)}m` : ""}
                </span>
              </span>
              {usingGps && <Check className="w-5 h-5 text-emerald-600" />}
            </button>

            <div className="flex items-center gap-2">
              <div className="h-px bg-border flex-1" />
              <span className="text-xs text-muted-foreground">ou saisir manuellement</span>
              <div className="h-px bg-border flex-1" />
            </div>

            <div>
              <Label htmlFor="loc">Ville ou quartier</Label>
              <Input
                id="loc"
                value={location}
                onChange={(e) => { setLocation(e.target.value); setUsingGps(false); }}
                placeholder="Ex: Cadjèhoun, Cotonou"
                autoComplete="off"
              />
            </div>

            {/* Suggestions intelligentes */}
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { setLocation(s); setUsingGps(false); }}
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-full border transition-colors",
                      location === s
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-card text-foreground border-border hover:border-emerald-400"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === "media" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Ajoutez jusqu'à {MAX_PHOTOS} photos (optionnel)
            </p>

            <div>
              <Label htmlFor="caption">Détail (optionnel)</Label>
              <Textarea id="caption" value={caption} onChange={(e) => setCaption(e.target.value)} rows={2} maxLength={240} placeholder="Précisions, état, Mobile Money…" />
            </div>

            {/* Boutons capture / galerie */}
            <div className="grid grid-cols-2 gap-2">
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                hidden
                onChange={(e) => { addFiles(e.target.files); e.currentTarget.value = ""; }}
              />
              <input
                ref={galleryRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => { addFiles(e.target.files); e.currentTarget.value = ""; }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => cameraRef.current?.click()}
                disabled={files.length >= MAX_PHOTOS}
                className="h-20 flex-col gap-1"
              >
                <Camera className="w-5 h-5" />
                <span className="text-xs">Prendre photo</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => galleryRef.current?.click()}
                disabled={files.length >= MAX_PHOTOS}
                className="h-20 flex-col gap-1"
              >
                <ImageIcon className="w-5 h-5" />
                <span className="text-xs">Depuis galerie</span>
              </Button>
            </div>

            {/* Prévisualisation */}
            {previews.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {previews.map((url, i) => (
                  <div key={i} className="relative aspect-square w-full rounded-lg overflow-hidden border border-border bg-muted">
                    <img
                      src={url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      onClick={() => setZoomedIndex(i)}
                      className="absolute inset-0 w-full h-full object-cover cursor-zoom-in"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute top-1 right-1 z-10 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black"
                      aria-label="Supprimer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {files.length} / {MAX_PHOTOS} photo{files.length > 1 ? "s" : ""}
            </p>

            {/* Aperçu message */}
            <div className="rounded-lg bg-muted/50 border border-border p-2 text-xs text-foreground">
              <span className="font-semibold">Aperçu : </span>
              {TYPE_OPTIONS.find((t) => t.value === type)?.label} — <strong>{title || "…"}</strong>
              {price && ` à ${parseInt(price.replace(/\D/g, ""), 10).toLocaleString("fr-FR")} FCFA`}
              {location && ` · ${location}`}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-2">
          {step !== "type" ? (
            <Button variant="ghost" onClick={prev} disabled={busy}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Retour
            </Button>
          ) : <span />}
          {step !== "media" ? (
            <Button onClick={next} className="bg-emerald-600 hover:bg-emerald-700 ml-auto">
              Suivant <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={submit} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700 ml-auto">
              {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
              Publier · 24h
            </Button>
          )}
        </div>

        {zoomedIndex !== null && previews[zoomedIndex] && (
          <div
            onClick={() => setZoomedIndex(null)}
            className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          >
            <img
              src={previews[zoomedIndex]}
              alt=""
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setZoomedIndex(null); }}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
