// WAOUH — Carte « point de l'avatar » : accueil, activités, veilles, contacts, prochaines étapes, aide.
// Le texte (2 à 3 phrases) et les boutons viennent du serveur ; ce composant ne fait que les mettre en scène.
import React from "react";
import { cn } from "@/lib/utils";
import type { AvatarBriefing, BriefingAction, BriefingItem } from "@/lib/waouh/avatarGuide";

export function WaouhAvatarOrb({ size = 32, active = true, className }: { size?: number; active?: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("relative inline-flex shrink-0 items-center justify-center rounded-full", className)}
      style={{ width: size, height: size }}
    >
      {active && <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/30 [animation-duration:2.4s]" />}
      <span className="relative h-full w-full rounded-full bg-[radial-gradient(circle_at_30%_30%,#a7f3d0,#10b981_45%,#0f766e)] shadow-[0_0_14px_rgba(16,185,129,.55)]" />
      <span className="absolute h-1/3 w-1/3 -translate-x-[18%] -translate-y-[22%] rounded-full bg-white/70 blur-[1px]" />
    </span>
  );
}

const KIND_LABEL: Record<AvatarBriefing["kind"], string> = {
  first: "Bienvenue",
  welcome: "Bon retour",
  point: "Point de l'avatar",
  digest: "Point régulier",
};

const TONE_DOT: Record<BriefingItem["tone"], string> = {
  ok: "bg-emerald-500",
  warn: "bg-amber-500",
  info: "bg-sky-500",
};

const timeLabel = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
};

export function WaouhAvatarBriefingCard({
  briefing,
  collapsed = false,
  busy = false,
  onAction,
}: {
  briefing: AvatarBriefing;
  /** Points plus anciens : une seule ligne, pour ne pas encombrer le fil. */
  collapsed?: boolean;
  busy?: boolean;
  onAction?: (action: BriefingAction) => void;
}) {
  if (collapsed) {
    return (
      <div className="flex items-start gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/50 px-3 py-2 text-xs text-slate-600" data-testid="avatar-briefing-collapsed">
        <WaouhAvatarOrb size={16} active={false} className="mt-0.5" />
        <span className="min-w-0">
          <span className="font-semibold text-emerald-900">{KIND_LABEL[briefing.kind]}</span>
          <span className="text-slate-400"> · {timeLabel(briefing.generatedAt)} · </span>
          <span className="line-clamp-2">{briefing.sentences.slice(1).join(" ")}</span>
        </span>
      </div>
    );
  }

  const [greeting, ...rest] = briefing.sentences;
  return (
    <section
      className="not-prose w-full max-w-[560px] overflow-hidden rounded-3xl border border-emerald-200/70 bg-white shadow-[0_10px_30px_-12px_rgba(16,185,129,.35)]"
      aria-label="Point de votre avatar"
      data-testid="avatar-briefing"
    >
      <header className="flex items-center gap-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-4 py-2.5 text-white">
        <WaouhAvatarOrb size={30} />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-black leading-tight">Votre avatar</div>
          <div className="text-[10px] font-medium text-white/80">{KIND_LABEL[briefing.kind]} · {timeLabel(briefing.generatedAt)}</div>
        </div>
      </header>

      <div className="space-y-2 px-4 pb-1 pt-3">
        <p className="text-[15px] font-bold leading-snug text-slate-900">{greeting}</p>
        {rest.map((s, i) => (
          <p key={i} className={cn("text-[13px] leading-relaxed", i === rest.length - 1 ? "text-slate-700" : "font-medium text-slate-800")}>{s}</p>
        ))}
      </div>

      {briefing.sections.length > 0 && (
        <div className="space-y-1.5 px-3 pb-2 pt-1">
          {briefing.sections.map((section) => (
            <details
              key={section.key}
              open={section.key === "next"}
              className="group rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-1.5 open:bg-white open:shadow-sm"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] font-black uppercase tracking-wide text-slate-600">
                <span>{section.title}</span>
                <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-800">{section.items.length}</span>
              </summary>
              <ul className="mt-1.5 space-y-1 pb-1">
                {section.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px]">
                    <span aria-hidden className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", TONE_DOT[item.tone])} />
                    <span className="min-w-0">
                      <span className="font-semibold text-slate-800">{item.label}</span>
                      {item.detail && <span className="text-slate-500"> · {item.detail}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      )}

      {briefing.actions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-3 pt-1">
          {briefing.actions.map((action, i) => (
            <button
              key={`${action.id}-${i}`}
              type="button"
              disabled={busy || !onAction}
              onClick={() => onAction?.(action)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-bold transition active:scale-95 disabled:opacity-50",
                i === 0
                  ? "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
                  : "border border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50",
              )}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {briefing.tip && (
        <footer className="border-t border-emerald-100 bg-emerald-50/60 px-4 py-2 text-[11px] leading-snug text-emerald-900">
          <span className="font-black">Je peux aussi : </span>{briefing.tip}
        </footer>
      )}
    </section>
  );
}
