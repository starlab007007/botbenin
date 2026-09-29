// WAOUH — Points d'avancement et synthèse de l'avatar dans la Deal Room (offres vers vendeurs externes).
import React from "react";
import { cn } from "@/lib/utils";
import {
  STANCE_LABEL, followUpLabel, offerGauge, parseAvatarProgress, parseAvatarSynthesis,
} from "@/lib/waouh/avatarNotes";

const fmt = (n: number) => `${new Intl.NumberFormat("fr-FR").format(Math.round(n))} FCFA`;

export function WaouhAvatarProgress({ progress }: { progress: unknown }) {
  const steps = parseAvatarProgress(progress);
  if (!steps) return null;
  const done = steps.filter((s) => s.state === "done").length;
  return (
    <div className="mt-2 rounded-xl border border-emerald-200/70 bg-emerald-50/60 px-2.5 py-2" role="group" aria-label="Points d'avancement de l'avatar" data-testid="avatar-progress">
      <ol className="flex items-start gap-0">
        {steps.map((step, i) => (
          <li key={`${step.key}-${i}`} className="relative flex min-w-0 flex-1 flex-col items-center text-center" aria-current={step.state === "current" ? "step" : undefined}>
            {i > 0 && (
              <span aria-hidden className={cn("absolute right-1/2 top-[7px] h-[2px] w-full -translate-y-1/2", steps[i - 1].state === "done" ? "bg-emerald-500" : "bg-emerald-200")} />
            )}
            <span
              aria-hidden
              className={cn(
                "relative z-10 h-3.5 w-3.5 rounded-full border-2",
                step.state === "done" && "border-emerald-600 bg-emerald-600",
                step.state === "current" && "animate-pulse border-emerald-600 bg-white ring-2 ring-emerald-300",
                step.state === "todo" && "border-emerald-200 bg-white",
              )}
            />
            <span className={cn("mt-1 line-clamp-2 text-[9px] leading-tight", step.state === "todo" ? "text-muted-foreground" : "font-semibold text-emerald-900")}>
              {step.label}
            </span>
            <span className="sr-only">{step.state === "done" ? " terminé" : step.state === "current" ? " en cours" : " à venir"}</span>
          </li>
        ))}
      </ol>
      <p className="mt-1.5 text-center text-[10px] font-medium text-emerald-800">
        Avatar · {done}/{steps.length} points notés
      </p>
    </div>
  );
}

export function WaouhAvatarSynthesis({ synthesis }: { synthesis: unknown }) {
  const s = parseAvatarSynthesis(synthesis);
  if (!s) return null;
  const gauge = offerGauge(s);
  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" data-testid="avatar-synthesis">
      <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-1.5 text-white">
        <span className="text-[11px] font-black uppercase tracking-wide">Synthèse de l'avatar</span>
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold">{STANCE_LABEL[s.stance]}</span>
      </div>
      <div className="space-y-2 px-3 py-2.5">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[10px] uppercase text-muted-foreground">Votre offre</div>
            <div className="text-base font-black text-slate-900">{s.offer != null ? fmt(s.offer) : "—"}</div>
          </div>
          {s.listPrice != null && (
            <div className="text-right">
              <div className="text-[10px] uppercase text-muted-foreground">Prix affiché</div>
              <div className="text-sm font-semibold text-slate-600">{fmt(s.listPrice)}</div>
            </div>
          )}
        </div>
        {gauge != null && (
          <div>
            <div className="h-1.5 w-full rounded-full bg-slate-100" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={gauge} aria-label="Offre par rapport au prix affiché">
              <div className={cn("h-1.5 rounded-full", s.stance === "ambitious" ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${gauge}%` }} />
            </div>
            {s.gapPct != null && <div className="mt-0.5 text-right text-[10px] text-muted-foreground">{s.gapPct > 0 ? "+" : ""}{s.gapPct} % du prix affiché</div>}
          </div>
        )}
        {s.suggested != null && (
          <p className="rounded-lg bg-amber-50 px-2 py-1 text-[11px] text-amber-900">Conseil : autour de {fmt(s.suggested)} pour une réponse plus probable.</p>
        )}
        <p className="text-[11px] text-slate-700">
          Suivi actif · prochain point {followUpLabel(s.nextFollowUpAt)}
          {s.etaHours ? ` · réponse en général sous ${s.etaHours} h` : ""}
        </p>
      </div>
    </div>
  );
}
