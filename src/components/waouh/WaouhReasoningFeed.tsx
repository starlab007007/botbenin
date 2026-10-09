import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ArrowRight, BellRing, Brain, BrainCircuit, CheckCircle2, MapPin, Phone, Radar, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BotLiveAvatar } from "@/components/waouh/bot/BotLiveAvatar";
import type { ReasonEvidence, ReasonStep, ReasonSummary, ReasonTone } from "@/lib/waouh/liveReasoning";

const STEP_DELAY_MS = 650;

/** File d'attente d'étapes révélées une à une (instantané si « réduire les animations »). */
export function useReasoningFeed() {
  const [shown, setShown] = useState<ReasonStep[]>([]);
  const [pending, setPending] = useState(0);
  const queue = useRef<ReasonStep[]>([]);
  const timer = useRef<number | null>(null);

  const stop = () => {
    if (timer.current !== null) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
  };

  const flush = useCallback(() => {
    stop();
    const rest = queue.current.splice(0);
    if (rest.length) setShown((prev) => [...prev, ...rest]);
    setPending(0);
  }, []);

  const push = useCallback((steps: ReasonStep[]) => {
    if (!steps.length) return;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    queue.current.push(...steps);
    if (reduce) {
      flush();
      return;
    }
    setPending(queue.current.length);
    if (timer.current !== null) return;
    timer.current = window.setInterval(() => {
      const next = queue.current.shift();
      if (next) setShown((prev) => [...prev, next]);
      setPending(queue.current.length);
      if (!queue.current.length) stop();
    }, STEP_DELAY_MS);
  }, [flush]);

  const reset = useCallback(() => {
    stop();
    queue.current = [];
    setShown([]);
    setPending(0);
  }, []);

  useEffect(() => stop, []);

  return { shown, pending, push, reset, skip: flush };
}

const TONE: Record<ReasonTone, { icon: typeof Brain; ring: string; label: string }> = {
  think: { label: "Analyse", icon: Brain, ring: "bg-violet-100 text-violet-700" },
  search: { label: "Recherche", icon: Radar, ring: "bg-blue-100 text-blue-700" },
  found: { label: "Trouvé", icon: CheckCircle2, ring: "bg-emerald-100 text-emerald-700" },
  zone: { label: "Zone", icon: MapPin, ring: "bg-sky-100 text-sky-700" },
  contact: { label: "Contact", icon: Phone, ring: "bg-indigo-100 text-indigo-700" },
  next: { label: "Bilan", icon: ArrowRight, ring: "bg-blue-600 text-white" },
  warn: { label: "Info", icon: AlertTriangle, ring: "bg-amber-100 text-amber-700" },
};

function EvidenceCard({ item }: { item: ReasonEvidence }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-xs font-bold text-slate-900">{item.title}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] font-semibold text-slate-500">
            {item.city && (
              <span className={item.inZone ? "text-emerald-700" : ""}>
                <MapPin className="mr-0.5 inline h-3 w-3" />
                {item.city}{item.inZone ? " · dans votre zone" : ""}
              </span>
            )}
            {item.note && <span>{item.note}</span>}
          </div>
        </div>
        {item.price && <div className="shrink-0 text-xs font-black text-slate-900">{item.price}</div>}
      </div>
      {item.phone && (
        <div className="mt-1.5 inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 font-mono text-[11px] font-bold tracking-wide text-slate-700">
          <Phone className="h-3 w-3 text-indigo-600" />
          {item.phone}
          {item.channel && <span className="ml-1 font-sans font-semibold text-slate-400">· {item.channel}</span>}
        </div>
      )}
    </div>
  );
}

export function WaouhReasoningFeed({
  steps,
  running,
  pending,
  summary,
  onSkip,
  onWatch,
  onAdvice,
  watching,
}: {
  steps: ReasonStep[];
  running: boolean;
  pending: number;
  summary: ReasonSummary | null;
  onSkip: () => void;
  onWatch?: () => void;
  onAdvice?: () => void;
  watching?: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const done = !running && pending === 0;

  useEffect(() => {
    if (!done) bottomRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [steps.length, done]);

  if (!steps.length) return null;

  return (
    <section
      aria-label="Raisonnement de l’Avatar"
      aria-live="polite"
      className="overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50/80 via-white to-violet-50/70 shadow-[0_18px_50px_-36px_rgba(37,99,235,.5)]"
    >
      <header className="flex items-center gap-3 px-4 pb-2 pt-3">
        <BotLiveAvatar size={40} state={done ? "talking" : "thinking"} />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-black text-slate-950">{done ? "Mon raisonnement" : "Bot réfléchit…"}</h3>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-blue-100" aria-hidden>
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500"
              animate={{ width: done ? "100%" : `${Math.min(92, 18 + steps.length * 14)}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>
        {!done && (
          <Button type="button" size="sm" variant="ghost" className="h-8 shrink-0 gap-1 rounded-xl text-[11px] font-bold text-blue-700" onClick={onSkip}>
            <SkipForward className="h-3.5 w-3.5" />Passer
          </Button>
        )}
      </header>

      <ol className="relative px-4 pb-3 pt-1">
        <span className="pointer-events-none absolute bottom-6 left-[29px] top-3 w-px bg-gradient-to-b from-blue-200 via-indigo-200 to-transparent" aria-hidden />
        <AnimatePresence initial={false}>
          {steps.map((step, index) => {
            const { icon: Icon, ring, label } = TONE[step.tone];
            const active = !done && index === steps.length - 1;
            return (
              <motion.li
                key={step.id}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="relative flex gap-3 py-1.5"
              >
                <span className={`relative z-10 mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ring-4 ring-white ${ring} ${active ? "shadow-[0_0_0_4px_rgba(99,102,241,.18)]" : ""}`}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className={`min-w-0 flex-1 rounded-2xl border px-3 py-2 ${step.tone === "next" ? "border-blue-200 bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/20" : "border-white/80 bg-white/90 shadow-sm"}`}>
                  <div className={`text-[9px] font-black uppercase tracking-[0.14em] ${step.tone === "next" ? "text-blue-100" : "text-slate-400"}`}>{label}</div>
                  <p className={`mt-0.5 text-[13px] font-bold leading-snug ${step.tone === "next" ? "text-white" : "text-slate-900"}`}>{step.text}</p>
                  {step.chips && step.chips.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {step.chips.map((chip) => (
                        <span key={chip} className="rounded-full border border-blue-100 bg-blue-50/80 px-2 py-0.5 text-[10.5px] font-bold text-blue-700">{chip}</span>
                      ))}
                    </div>
                  )}
                  {step.evidence && step.evidence.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {step.evidence.map((item) => <EvidenceCard key={item.key} item={item} />)}
                    </div>
                  )}
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
        {!done && (
          <li className="flex items-center gap-2 py-1 pl-9 text-[11px] font-semibold text-slate-400" aria-hidden>
            <span className="flex gap-1">
              {[0, 1, 2].map((n) => <span key={n} className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400" style={{ animationDelay: `${n * 120}ms` }} />)}
            </span>
            je continue…
          </li>
        )}
        <div ref={bottomRef} />
      </ol>

      {done && summary && (
        <footer className="space-y-3 border-t border-blue-100/70 bg-white/70 px-4 py-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ["Trouvés", String(summary.found)],
              ["Dans la zone", String(summary.inZone)],
              ["Joignables", String(summary.contactable)],
              ["Meilleur prix", summary.bestPrice ? new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(summary.bestPrice) : "—"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
                <div className="text-lg font-black leading-none text-slate-900">{value}</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
              </div>
            ))}
          </div>
          {summary.nextSteps.length > 0 && (
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Suite</div>
              <ul className="mt-1 space-y-1">
                {summary.nextSteps.map((text) => (
                  <li key={text} className="flex gap-1.5 text-xs font-semibold text-slate-700"><ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />{text}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {onWatch && (
              <Button type="button" size="sm" disabled={watching} className="min-h-[40px] rounded-xl" onClick={onWatch}>
                <BellRing className="mr-1.5 h-4 w-4" />Surveiller pour moi
              </Button>
            )}
            {onAdvice && (
              <Button type="button" size="sm" variant="outline" className="min-h-[40px] rounded-xl" onClick={onAdvice}>
                <BrainCircuit className="mr-1.5 h-4 w-4" />Conseil de Bot
              </Button>
            )}
          </div>
        </footer>
      )}
    </section>
  );
}

export default WaouhReasoningFeed;
