import { Link } from "react-router-dom";
import { Activity, ArrowRight, BrainCircuit, Network, Radar, ShieldCheck, Sparkles, Target, Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WaouhWorkspaceAgentState, WaouhWorkspaceDealState } from "@/lib/waouh/workspaceState";
import { WaouhMuseAvatar } from "./WaouhMuseAvatar";
import { WaouhContactabilityBadge, contactabilityPresentation } from "./WaouhCommerceAgentBar";

const PHASE_LABEL: Record<WaouhWorkspaceAgentState["phase"], string> = {
  idle: "Prêt",
  listening: "Objectif compris",
  searching: "NEXUS cherche",
  comparing: "Signal Fabric compare",
  contacting: "Contact sécurisé",
  negotiating: "Deal Room active",
  success: "Objectif atteint",
};

function Layer({
  icon: Icon,
  title,
  subtitle,
  active,
  children,
}: {
  icon: typeof Sparkles;
  title: string;
  subtitle: string;
  active?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn(
      "rounded-2xl border p-3 transition",
      active
        ? "border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-cyan-50/55 shadow-sm"
        : "border-slate-200/80 bg-white/75"
    )}>
      <div className="flex items-start gap-2.5">
        <div className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border",
          active ? "border-emerald-200 bg-white text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500"
        )}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="text-xs font-black text-slate-900">{title}</div>
            {active && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,.75)]" />}
          </div>
          <div className="mt-0.5 text-[10px] leading-relaxed text-slate-500">{subtitle}</div>
        </div>
      </div>
      {children && <div className="mt-2.5">{children}</div>}
    </div>
  );
}

export function WaouhUnifiedIntelligenceDock({
  state,
  deal,
  compact = false,
  onNewGoal,
}: {
  state: WaouhWorkspaceAgentState;
  deal?: WaouhWorkspaceDealState | null;
  compact?: boolean;
  onNewGoal?: () => void;
}) {
  const contact = contactabilityPresentation(deal?.contactLevel || state.contactLevel);
  const sources = [...new Set(state.sources.filter(Boolean))].slice(0, 6);
  const modeLabel = state.mode === "buyer" ? "Acheteur" : state.mode === "seller" ? "Vendeur" : "Commerce";
  const dealActive = !!deal?.active;

  return (
    <aside className={cn(
      "flex h-full min-h-0 flex-col overflow-hidden bg-gradient-to-b from-white via-slate-50/70 to-emerald-50/35",
      !compact && "border-l border-slate-200/80"
    )}>
      <div className={cn("shrink-0 border-b border-slate-200/80", compact ? "p-3" : "p-4")}>
        <div className="flex items-center gap-3">
          <WaouhMuseAvatar
            mode={dealActive ? (deal?.role === "seller" ? "seller" : "buyer") : state.mode}
            phase={dealActive ? (deal?.closed ? "success" : "negotiating") : state.phase}
            size={compact ? "md" : "lg"}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-black text-slate-950">WAOUH One</span>
              <Badge className="h-5 border-emerald-200 bg-emerald-50 px-1.5 text-[9px] text-emerald-800" variant="outline">
                <Sparkles className="mr-1 h-2.5 w-2.5" />
                {PHASE_LABEL[dealActive ? (deal?.closed ? "success" : "negotiating") : state.phase]}
              </Badge>
            </div>
            <div className="mt-0.5 text-[10px] font-semibold text-slate-500">
              Un seul assistant · Muse + NEXUS + Signal + Contact
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-slate-200 bg-white/85 p-3 shadow-sm">
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-slate-500">
            <Target className="h-3.5 w-3.5" /> Objectif actuel
          </div>
          <div className="text-xs font-bold leading-relaxed text-slate-900 line-clamp-3">
            {dealActive
              ? deal?.title || "Négociation en cours"
              : state.goal?.trim() || "Dites simplement ce que vous voulez acheter ou vendre."}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="h-5 text-[9px]">{dealActive ? "Deal Room" : modeLabel}</Badge>
            {state.resultCount > 0 && <Badge variant="secondary" className="h-5 text-[9px]">{state.resultCount} résultat{state.resultCount > 1 ? "s" : ""}</Badge>}
            {(deal?.contactLevel || state.contactLevel) && <WaouhContactabilityBadge level={deal?.contactLevel || state.contactLevel} />}
          </div>
        </div>
      </div>

      <div className={cn("flex-1 min-h-0 overflow-y-auto space-y-2.5", compact ? "p-3" : "p-4")}>
        <Layer
          icon={BrainCircuit}
          title="Muse"
          subtitle="Comprend l’objectif, prépare les actions et garde le fil de la mission."
          active={state.phase !== "idle" || dealActive}
        >
          <div className="text-[10px] font-semibold text-slate-700">
            {dealActive
              ? deal?.closed ? "Mission conclue." : "Muse accompagne la négociation sans décider à votre place."
              : state.phase === "idle" ? "En attente de votre objectif." : PHASE_LABEL[state.phase]}
          </div>
          <Button asChild size="sm" variant="outline" className="mt-2 h-8 w-full rounded-xl text-[10px] font-black">
            <Link to="/waouh/muse">
              <BrainCircuit className="mr-1.5 h-3.5 w-3.5" />
              Ouvrir Muse complet
              <ArrowRight className="ml-auto h-3.5 w-3.5" />
            </Link>
          </Button>
        </Layer>

        <Layer
          icon={Radar}
          title="NEXUS"
          subtitle="Découvre vendeurs, acheteurs et signaux utiles sur les sources autorisées."
          active={["searching", "comparing", "contacting"].includes(state.phase) || state.resultCount > 0}
        >
          <div className="flex flex-wrap gap-1.5">
            {sources.length ? sources.map((source) => (
              <span key={source} className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[9px] font-bold text-slate-600">
                {source.replace(/_/g, " ")}
              </span>
            )) : (
              <span className="text-[10px] text-slate-500">Les sources apparaissent dès que NEXUS lance une recherche.</span>
            )}
          </div>
        </Layer>

        <Layer
          icon={Network}
          title="Signal Fabric"
          subtitle="Fusionne, déduplique et classe les signaux pour produire les meilleurs choix."
          active={state.phase === "comparing" || state.resultCount > 0}
        >
          <div className="grid grid-cols-3 gap-1.5">
            {["Pertinence", "Confiance", "Prix", "Proximité", "Fraîcheur", "Contact"].map((item) => (
              <div key={item} className="rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-center text-[9px] font-bold text-slate-600">
                {item}
              </div>
            ))}
          </div>
        </Layer>

        <Layer
          icon={ShieldCheck}
          title="Contact Layer"
          subtitle="Applique C0–C5 avant toute révélation ou action de contact."
          active={state.phase === "contacting" || !!state.contactLevel || !!deal?.contactLevel}
        >
          <div className="flex items-start gap-2">
            <WaouhContactabilityBadge level={deal?.contactLevel || state.contactLevel} showCode />
            <div className="flex-1 text-[10px] leading-relaxed text-slate-600">{contact.detail}</div>
          </div>
        </Layer>

        <Layer
          icon={Workflow}
          title="Deal Room"
          subtitle="Une négociation = un article × un interlocuteur, dans le même espace WAOUH."
          active={dealActive}
        >
          {dealActive ? (
            <div className="space-y-1 text-[10px] text-slate-700">
              <div className="font-black">{deal?.title}</div>
              <div className="flex flex-wrap gap-x-2 gap-y-1 text-slate-500">
                {deal?.price ? <span>{Number(deal.price).toLocaleString("fr-FR")} FCFA</span> : null}
                {deal?.city ? <span>{deal.city}</span> : null}
                {deal?.intent ? <span>{deal.intent.replace(/_/g, " ")}</span> : null}
              </div>
            </div>
          ) : (
            <div className="text-[10px] leading-relaxed text-slate-500">
              La Deal Room s’ouvre ici automatiquement quand vous choisissez un vendeur ou un acheteur.
            </div>
          )}
        </Layer>
      </div>

      {onNewGoal && (
        <div className={cn("shrink-0 border-t border-slate-200/80 bg-white/80", compact ? "p-3" : "p-4")}>
          <Button onClick={onNewGoal} className="w-full rounded-xl bg-slate-950 text-white hover:bg-slate-800">
            <Activity className="mr-2 h-4 w-4" />
            Nouvel objectif
            <ArrowRight className="ml-auto h-4 w-4" />
          </Button>
        </div>
      )}
    </aside>
  );
}
