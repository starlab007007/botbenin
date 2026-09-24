import { ArrowRight, Handshake, MapPin, Search, ShoppingBag, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WaouhMuseMode, WaouhMusePhase } from "./WaouhMuseAvatar";

type Prompt = { label: string; value: string; icon: typeof Sparkles };

function prompts(mode: WaouhMuseMode, phase: WaouhMusePhase, resultCount: number): Prompt[] {
  if (phase === "searching") {
    return [
      { label: "Recherche en cours", value: "", icon: Sparkles },
      { label: "Préciser ma zone", value: "Prends en compte ma zone pour mieux classer les résultats.", icon: MapPin },
    ];
  }
  if (phase === "negotiating") {
    return [
      { label: "Résumer la négociation", value: "Résume-moi la négociation en cours et l'écart restant.", icon: Handshake },
      { label: "Comparer au marché", value: "Compare cette négociation avec le prix du marché avant que je décide.", icon: Search },
      { label: "Mes options", value: "Quelles sont mes options maintenant, sans prendre de décision à ma place ?", icon: Sparkles },
    ];
  }
  if (resultCount > 0 && mode === "seller") {
    return [
      { label: "Meilleurs acheteurs", value: "Montre-moi les acheteurs les plus compatibles et explique pourquoi.", icon: Search },
      { label: "Préparer une offre", value: "Prépare une proposition commerciale pour le meilleur acheteur, sans l'envoyer.", icon: Handshake },
      { label: "Continuer à chercher", value: "Continue à chercher d'autres acheteurs fiables pour cette offre.", icon: Sparkles },
    ];
  }
  if (resultCount > 0 && mode === "buyer") {
    return [
      { label: "Comparer les 3 meilleurs", value: "Compare les trois meilleures options sur prix, confiance, distance et contact.", icon: Search },
      { label: "Préparer une négociation", value: "Prépare une stratégie de négociation pour la meilleure offre, sans envoyer de message.", icon: Handshake },
      { label: "Continuer à chercher", value: "Continue à chercher de meilleures offres pour ce besoin.", icon: Sparkles },
    ];
  }
  if (mode === "seller") {
    return [
      { label: "Trouver des acheteurs", value: "Trouve des acheteurs fiables pour ce que je veux vendre.", icon: Search },
      { label: "Optimiser mon annonce", value: "Aide-moi à améliorer mon offre pour attirer plus d'acheteurs.", icon: Sparkles },
    ];
  }
  if (mode === "buyer") {
    return [
      { label: "Trouver autour de moi", value: "Trouve les meilleures offres autour de moi pour ce besoin.", icon: MapPin },
      { label: "Comparer le marché", value: "Compare les prix du marché pour ce que je cherche.", icon: Search },
    ];
  }
  return [
    { label: "Acheter", value: "Je cherche ", icon: Search },
    { label: "Vendre", value: "__SELL__", icon: ShoppingBag },
    { label: "Autour de moi", value: "Trouve-moi les meilleures offres autour de moi pour ", icon: MapPin },
  ];
}

export function WaouhSmartComposerBar({
  mode,
  phase,
  resultCount,
  disabled,
  onPrompt,
  onSell,
  className,
}: {
  mode: WaouhMuseMode;
  phase: WaouhMusePhase;
  resultCount: number;
  disabled?: boolean;
  onPrompt: (value: string) => void;
  onSell: () => void;
  className?: string;
}) {
  const items = prompts(mode, phase, resultCount).slice(0, 3);
  return (
    <div className={cn("flex gap-1.5 overflow-x-auto border-t bg-background/95 px-2 py-1.5", className)} aria-label="Suggestions WAOUH">
      {items.map(({ label, value, icon: Icon }) => {
        const inert = !value;
        return (
          <button
            key={label}
            type="button"
            disabled={disabled || inert}
            onClick={() => value === "__SELL__" ? onSell() : onPrompt(value)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition",
              inert
                ? "border-cyan-100 bg-cyan-50 text-cyan-700"
                : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800",
              (disabled || inert) && "cursor-default opacity-70"
            )}
          >
            <Icon className={cn("h-3.5 w-3.5", phase === "searching" && label === "Recherche en cours" && "animate-pulse")} />
            {label}
            {!inert && <ArrowRight className="h-3 w-3 opacity-50" />}
          </button>
        );
      })}
    </div>
  );
}
