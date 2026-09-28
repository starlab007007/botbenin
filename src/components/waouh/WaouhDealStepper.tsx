import { cn } from "@/lib/utils";
import { JOURNEY_STEPS, type JourneyStepKey } from "@/lib/waouh/commerceAction";

/**
 * Progression du parcours commerce en 7 étapes (parcours unifié v3).
 * Étape courante en couleur, étapes suivantes en gris ; aucun libellé technique.
 */
export function WaouhDealStepper({ stage, className }: { stage: JourneyStepKey | null; className?: string }) {
  if (!stage) return null;
  const current = JOURNEY_STEPS.findIndex((s) => s.key === stage);
  return (
    <ol
      aria-label="Progression de la vente"
      className={cn("flex w-full items-center gap-1 overflow-x-auto px-2 py-1.5 text-[10px] font-semibold", className)}
    >
      {JOURNEY_STEPS.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li
            key={step.key}
            aria-current={active ? "step" : undefined}
            className="flex min-w-0 flex-1 flex-col items-center gap-1"
          >
            <span
              className={cn(
                "h-1 w-full rounded-full",
                done ? "bg-emerald-500" : active ? "bg-emerald-600" : "bg-slate-200",
              )}
            />
            <span
              className={cn(
                "truncate",
                active ? "text-emerald-700" : done ? "text-slate-600" : "text-slate-400",
              )}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
