import { Check, ChevronRight, Network, Radar, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { WaouhMuseAvatar, type WaouhMuseMode, type WaouhMusePhase } from "./WaouhMuseAvatar";

export type ContactabilityLevel = "C0" | "C1" | "C2" | "C3" | "C4" | "C5";

export function contactabilityPresentation(level?: string | null) {
  const normalized = String(level || "").toUpperCase() as ContactabilityLevel;
  switch (normalized) {
    case "C4":
      return { level: normalized, label: "Agent connecté", detail: "Votre Avatar peut poursuivre dans WAOUH.", tone: "emerald" as const };
    case "C3":
      return { level: normalized, label: "Contact autorisé", detail: "Contact possible avec consentement.", tone: "emerald" as const };
    case "C2":
      return { level: normalized, label: "Contact privé protégé", detail: "WAOUH transmet sans révéler les coordonnées.", tone: "amber" as const };
    case "C1":
      return { level: normalized, label: "Contact professionnel public", detail: "Coordonnées professionnelles publiques.", tone: "sky" as const };
    default:
      return { level: "C0" as ContactabilityLevel, label: "Découverte uniquement", detail: "Aucun contact privé n’est révélé.", tone: "slate" as const };
  }
}

export function WaouhContactabilityBadge({
  level,
  showCode = false,
  className,
}: {
  level?: string | null;
  showCode?: boolean;
  className?: string;
}) {
  const p = contactabilityPresentation(level);
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 text-[10px] font-semibold",
        p.tone === "emerald" && "border-emerald-200 bg-emerald-50 text-emerald-800",
        p.tone === "amber" && "border-amber-200 bg-amber-50 text-amber-800",
        p.tone === "sky" && "border-sky-200 bg-sky-50 text-sky-800",
        p.tone === "slate" && "border-slate-200 bg-slate-50 text-slate-700",
        className
      )}
      title={p.detail}
    >
      <ShieldCheck className="h-3 w-3" />
      {showCode ? `${p.level} · ${p.label}` : p.label}
    </Badge>
  );
}

const PHASE_LABEL: Record<WaouhMusePhase, string> = {
  idle: "Prêt",
  listening: "Comprend votre objectif",
  searching: "NEXUS cherche",
  comparing: "Signal Fabric compare",
  contacting: "Prépare le contact",
  negotiating: "Votre Avatar négocie",
  success: "Objectif atteint",
};

const PHASE_DETAIL: Record<WaouhMusePhase, string> = {
  idle: "Dites simplement ce que vous voulez acheter ou vendre.",
  listening: "WAOUH transforme votre demande en objectif commercial.",
  searching: "WAOUH explore les sources utiles sans exposer vos données privées.",
  comparing: "Les signaux sont classés par pertinence, confiance, prix, proximité et fraîcheur.",
  contacting: "Le Contact Layer applique les permissions C0–C5 avant toute action.",
  negotiating: "Une seule négociation active est suivie avec votre contrôle.",
  success: "Votre Avatar peut conserver la veille si vous souhaitez continuer à surveiller le marché.",
};

const STEP_ORDER: WaouhMusePhase[] = ["listening", "searching", "comparing", "contacting"];

function stepState(phase: WaouhMusePhase, step: WaouhMusePhase) {
  const current = STEP_ORDER.indexOf(phase);
  const target = STEP_ORDER.indexOf(step);
  if (phase === "negotiating" || phase === "success") return "done";
  if (current < 0) return target === 0 && phase === "idle" ? "next" : "next";
  if (target < current) return "done";
  if (target === current) return "active";
  return "next";
}

export function WaouhCommerceAgentBar({
  goal,
  mode = "neutral",
  phase = "idle",
  resultCount = 0,
  sources = [],
  contactLevel,
  compact = false,
  className,
}: {
  goal?: string | null;
  mode?: WaouhMuseMode;
  phase?: WaouhMusePhase;
  resultCount?: number;
  sources?: string[];
  contactLevel?: string | null;
  compact?: boolean;
  className?: string;
}) {
  const uniqueSources = [...new Set(sources.filter(Boolean))].slice(0, 5);
  const roleLabel = mode === "buyer" ? "Muse acheteur" : mode === "seller" ? "Muse vendeur" : "Muse commerce";

  return (
    <section
      className={cn(
        "shrink-0 border-b border-emerald-100/80 bg-gradient-to-r from-white via-emerald-50/45 to-cyan-50/55",
        compact ? "px-3 py-2" : "px-3 py-2.5 sm:px-4",
        className
      )}
      aria-label="État de WAOUH Muse"
    >
      <div className="flex items-center gap-2.5">
        <WaouhMuseAvatar mode={mode} phase={phase} size={compact ? "sm" : "md"} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-black text-emerald-950">{roleLabel}</span>
            <Badge variant="outline" className="h-5 border-cyan-200 bg-white/80 px-1.5 text-[9px] text-cyan-800">
              <Sparkles className="mr-1 h-2.5 w-2.5" />
              {PHASE_LABEL[phase]}
            </Badge>
            {resultCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[9px]">
                {resultCount} correspondance{resultCount > 1 ? "s" : ""}
              </Badge>
            )}
            {contactLevel && <WaouhContactabilityBadge level={contactLevel} />}
          </div>
          <div className="mt-0.5 truncate text-[11px] font-medium text-slate-700">
            {goal?.trim() ? goal.trim() : PHASE_DETAIL[phase]}
          </div>
          {!compact && (
            <div className="mt-1 text-[10px] text-muted-foreground line-clamp-1">
              {PHASE_DETAIL[phase]}
            </div>
          )}
        </div>
        <div className="hidden items-center gap-1 sm:flex">
          {uniqueSources.length > 0 ? (
            uniqueSources.map((source) => (
              <span key={source} className="rounded-full border bg-white/80 px-2 py-1 text-[9px] font-semibold text-slate-600">
                {source.replace(/_/g, " ")}
              </span>
            ))
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border bg-white/80 px-2 py-1 text-[9px] text-slate-500">
              <Radar className="h-3 w-3" />
              NEXUS
            </span>
          )}
        </div>
      </div>

      {!compact && (
        <div className="mt-2 flex items-center gap-1 overflow-hidden">
          {[
            ["listening", "Compris"],
            ["searching", "NEXUS"],
            ["comparing", "Compare"],
            ["contacting", "Contact"],
          ].map(([step, label], index) => {
            const state = stepState(phase, step as WaouhMusePhase);
            return (
              <div key={step} className="flex min-w-0 flex-1 items-center">
                <div
                  className={cn(
                    "flex min-w-0 flex-1 items-center justify-center gap-1 rounded-full border px-2 py-1 text-[9px] font-bold",
                    state === "done" && "border-emerald-200 bg-emerald-50 text-emerald-700",
                    state === "active" && "border-cyan-300 bg-cyan-50 text-cyan-800 shadow-sm",
                    state === "next" && "border-slate-200 bg-white/70 text-slate-400"
                  )}
                >
                  {state === "done" ? <Check className="h-3 w-3" /> : step === "comparing" ? <Network className="h-3 w-3" /> : null}
                  <span className="truncate">{label}</span>
                </div>
                {index < 3 && <ChevronRight className="mx-0.5 h-3 w-3 shrink-0 text-slate-300" />}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
