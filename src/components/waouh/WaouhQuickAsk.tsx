import { useEffect, useState } from "react";
import { WaouhCityField } from "./WaouhCityField";
import { MapPin, Search, Sparkles, X } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BotLiveAvatar } from "@/components/waouh/bot/BotLiveAvatar";

export type QuickAskKind = "acheter" | "vendre" | "trouver" | "demander";

const COPY: Record<QuickAskKind, {
  title: string; line: string; field: string; chips: string[]; cta: string; budget: string | null; path: (p: URLSearchParams) => string;
}> = {
  acheter: {
    title: "Acheter",
    line: "Que cherchez-vous ?",
    field: "Ex. iPhone 13, moto, climatiseur…",
    chips: ["Samsung S25", "Moto d’occasion", "Climatiseur 1,5 CV"],
    cta: "Chercher pour moi",
    budget: "Budget max (FCFA)",
    path: (p) => `/app/avatar/acheter?${p}`,
  },
  vendre: {
    title: "Vendre",
    line: "Que vendez-vous ?",
    field: "Ex. mon téléphone, 10 tonnes de soja…",
    chips: ["Mon téléphone", "10 tonnes de soja", "Ma moto"],
    cta: "Trouver des acheteurs",
    budget: "Prix souhaité (FCFA)",
    path: (p) => `/app/avatar/vendre?${p}`,
  },
  trouver: {
    title: "Trouver",
    line: "Bot cherche partout pour vous.",
    field: "Produit, service, vendeur ou acheteur…",
    chips: ["Un S25 fiable à Cotonou", "Vendre 10 tonnes de soja", "Plombier à Porto-Novo"],
    cta: "Lancer la recherche",
    budget: "Budget (FCFA, facultatif)",
    path: (p) => `/app/nexus?${p}`,
  },
  demander: {
    title: "Demander",
    line: "Dites-le comme vous voulez.",
    field: "De quoi avez-vous besoin ?",
    chips: ["Un livreur fiable", "Traiteur pour 50 personnes", "Un plombier"],
    cta: "Demander à Bot",
    budget: null,
    path: (p) => `/app/avatar/demander?${p}`,
  },
};

/** Formulaire express (bottom-sheet) : 1 champ, ville/budget qui apparaissent quand utile. */
export function WaouhQuickAsk({
  kind, onClose, onSubmit,
}: {
  kind: QuickAskKind | null;
  onClose: () => void;
  onSubmit: (path: string) => void;
}) {
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [budget, setBudget] = useState("");
  useEffect(() => { if (kind) { setQ(""); setCity(""); setBudget(""); } }, [kind]);
  const c = kind ? COPY[kind] : null;

  const go = () => {
    if (!c || !q.trim()) return;
    const p = new URLSearchParams({ q: q.trim(), go: "1" });
    if (city.trim()) p.set("city", city.trim());
    if (budget) p.set("budget", budget);
    if (kind === "trouver") p.set("mode", "auto");
    onSubmit(c.path(p));
  };

  return (
    <Sheet open={!!kind} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="rounded-t-[28px] border-blue-100 bg-gradient-to-b from-white to-blue-50/60 px-4 pb-6 pt-4 [&>button]:hidden">
        {c && (
          <div className="mx-auto w-full max-w-lg space-y-3">
            <div className="flex items-center gap-3">
              <BotLiveAvatar size={56} state={q.trim() ? "talking" : "idle"} />
              <div className="min-w-0 flex-1">
                <SheetTitle className="text-xl font-black text-slate-950">{c.title}</SheetTitle>
                <SheetDescription className="mt-1 inline-block rounded-2xl rounded-tl-sm border border-blue-100 bg-white px-3 py-1 text-xs font-semibold text-blue-900">{c.line}</SheetDescription>
              </div>
              <button type="button" aria-label="Fermer" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full border border-blue-100 bg-white text-slate-500"><X className="h-4 w-4" /></button>
            </div>

            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && go()}
              aria-label={c.line}
              placeholder={c.field}
              className="h-12 rounded-2xl border-blue-100 bg-white"
            />

            {!q.trim() ? (
              <div className="flex flex-wrap gap-1.5">
                {c.chips.map((chip) => (
                  <button key={chip} type="button" onClick={() => setQ(chip)} className="rounded-full border border-blue-100 bg-white px-3 py-1.5 text-[11px] font-bold text-blue-700 shadow-sm active:scale-95">{chip}</button>
                ))}
              </div>
            ) : (
              <div className={`grid gap-2 ${c.budget ? "grid-cols-2" : "grid-cols-1"}`}>
                <WaouhCityField value={city} onChange={setCity} placeholder="Ville ou quartier" />
                {c.budget && (
                  <Input value={budget} onChange={(e) => setBudget(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder={c.budget} aria-label={c.budget} className="h-11 rounded-2xl border-blue-100 bg-white" />
                )}
              </div>
            )}

            <Button onClick={go} disabled={!q.trim()} className="h-12 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 font-black text-white shadow-lg shadow-blue-600/25">
              {kind === "demander" ? <Sparkles className="mr-2 h-4 w-4" /> : <Search className="mr-2 h-4 w-4" />}
              {c.cta}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default WaouhQuickAsk;
