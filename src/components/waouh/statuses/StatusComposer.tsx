import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, ArrowLeft, ArrowRight, Check, ShoppingBag, Search, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { useStatuses, type StatusType } from "@/hooks/useStatuses";
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

const QUICK_CITIES = ["Cotonou", "Calavi", "Porto-Novo", "Parakou", "Bohicon", "Abomey"];

export function StatusComposer({ trigger, defaultType = "sell" }: Props) {
  const { publishStatus } = useStatuses();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<Step>("type");
  const [type, setType] = useState<StatusType>(defaultType);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const reset = () => {
    setStep("type"); setTitle(""); setPrice(""); setLocation(""); setCaption(""); setFile(null);
  };

  const close = (v: boolean) => {
    setOpen(v);
    if (!v) reset();
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
        media_file: file,
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

        {/* progress dots */}
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
            <div>
              <Label htmlFor="loc">Ville</Label>
              <Input id="loc" autoFocus value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Cotonou" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_CITIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setLocation(c)}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-full border",
                    location === c
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-card text-foreground border-border"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "media" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Ajoutez une photo (optionnel)</p>
            <div>
              <Label htmlFor="caption">Détail (optionnel)</Label>
              <Textarea id="caption" value={caption} onChange={(e) => setCaption(e.target.value)} rows={2} maxLength={240} placeholder="Précisions, état, Mobile Money…" />
            </div>
            <div>
              <Label htmlFor="media">Photo ou vidéo</Label>
              <Input id="media" type="file" accept="image/*,video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              {file && <p className="text-xs text-muted-foreground mt-1">{file.name}</p>}
            </div>

            {/* preview message */}
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
      </DialogContent>
    </Dialog>
  );
}
