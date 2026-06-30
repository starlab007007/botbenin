import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { RadarFilters, RadarItemType } from "../../hooks/useRadarScan";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  value: RadarFilters;
  onChange: (next: RadarFilters) => void;
}

const TYPE_OPTIONS: { k: RadarItemType; label: string }[] = [
  { k: "SELL", label: "Ventes" },
  { k: "BUY", label: "Recherches" },
  { k: "STATUS", label: "Statuts" },
];

const CATEGORIES = ["Mode", "Téléphonie", "Beauté", "Maison", "Auto", "Alimentation", "Services"];

export function RadarFiltersSheet({ open, onOpenChange, value, onChange }: Props) {
  const toggleType = (t: RadarItemType) => {
    const has = value.types.includes(t);
    onChange({ ...value, types: has ? value.types.filter((x) => x !== t) : [...value.types, t] });
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Filtres du Radar</SheetTitle>
        </SheetHeader>
        <div className="space-y-5 py-4">
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Type</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {TYPE_OPTIONS.map((o) => {
                const active = value.types.includes(o.k);
                return (
                  <button
                    key={o.k}
                    onClick={() => toggleType(o.k)}
                    className={
                      "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors " +
                      (active
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-background border-border text-foreground")
                    }
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Aucun = tous</p>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Catégorie</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              <button
                onClick={() => onChange({ ...value, category: null })}
                className={
                  "px-3 py-1.5 rounded-full text-xs border " +
                  (!value.category
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-background border-border")
                }
              >
                Toutes
              </button>
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => onChange({ ...value, category: c })}
                  className={
                    "px-3 py-1.5 rounded-full text-xs border " +
                    (value.category === c
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-background border-border")
                  }
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="rmin" className="text-xs">Prix min (FCFA)</Label>
              <Input
                id="rmin"
                inputMode="numeric"
                value={value.priceMin ?? ""}
                onChange={(e) => onChange({ ...value, priceMin: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
            <div>
              <Label htmlFor="rmax" className="text-xs">Prix max (FCFA)</Label>
              <Input
                id="rmax"
                inputMode="numeric"
                value={value.priceMax ?? ""}
                onChange={(e) => onChange({ ...value, priceMax: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="rphoto" className="text-sm">Photo obligatoire</Label>
            <Switch
              id="rphoto"
              checked={!!value.photoOnly}
              onCheckedChange={(v) => onChange({ ...value, photoOnly: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="rverif" className="text-sm">Vendeurs vérifiés uniquement</Label>
            <Switch
              id="rverif"
              checked={!!value.verifiedOnly}
              onCheckedChange={(v) => onChange({ ...value, verifiedOnly: v })}
            />
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Auto-pause du radar</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {[
                { ms: 30_000, label: "30 s" },
                { ms: 90_000, label: "90 s" },
                { ms: 5 * 60_000, label: "5 min" },
                { ms: null as number | null, label: "Jamais" },
              ].map((o) => {
                const active = (value.autoPauseMs ?? 90_000) === o.ms;
                return (
                  <button
                    key={String(o.ms)}
                    onClick={() => onChange({ ...value, autoPauseMs: o.ms })}
                    className={
                      "px-3 py-1.5 rounded-full text-xs border " +
                      (active ? "bg-emerald-600 text-white border-emerald-600" : "bg-background border-border")
                    }
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Économise batterie et données. Mode Urgence force 30 s.</p>
          </div>

          <Button className="w-full" onClick={() => onOpenChange(false)}>
            Appliquer
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
