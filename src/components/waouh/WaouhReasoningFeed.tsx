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

const TONE: Record<ReasonTone, { icon: typeof Brain; ring: string }> = {
  think: { icon: Brain, ring: "bg-violet-100 text-violet-700" },
  search: { icon: Radar, ring: "bg-blue-100 text-blue-700" },
  found: { icon: CheckCircle2, ring: "bg-emerald-100 text-emerald-700" },
  zone: { icon: MapPin, ring: "bg-sky-100 text-sky-700" },
  contact: { icon: Phone, ring: "bg-indigo-100 text-indigo-700" },
  next: { icon: ArrowRight, ring: "bg-blue-600 text-white" },
  warn: { icon: AlertTriangle, ring: "bg-amber-100 text-amber-700" },
};

function EvidenceCard({ item }: { item: ReasonEvidence }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-xs font-bold text-slate-900">{item.title}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] font-semibold text-slate-500">
            <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-blue-700">{item.source}</span>
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
      <header className="flex items-center gap-3 border-b border-blue-100/70 px-4 py-3">
        <BotLiveAvatar size={40} state={done ? "talking" : "thinking"} />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-black text-slate-900">{done ? "Voici ce que j’ai fait" : "Bot travaille pour vous"}</h3>
          <p className="text-[11px] font-medium text-slate-500">
            {done ? "Mon raisonnement, étape par étape." : "Je vous explique chaque étape en direct."}
          </p>
        </div>
        {!done && (
          <Button type="button" size="sm" variant="ghost" className="h-8 shrink-0 gap-1 rounded-xl text-[11px] font-bold text-blue-700" onClick={onSkip}>
            <SkipForward className="h-3.5 w-3.5" />Passer
          </Button>
        )}
      </header>

      <ol className="space-y-3 px-4 py-3">
        <AnimatePresence initial={false}>
          {steps.map((step) => {
            const { icon: Icon, ring } = TONE[step.tone];
            return (
              <motion.li
                key={step.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28 }}
                className="flex gap-2.5"
              >
                <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ${ring}`}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className={`text-[13px] leading-snug ${step.tone === "next" ? "font-black text-slate-950" : "font-semibold text-slate-800"}`}>{step.text}</p>
                  {step.chips && step.chips.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {step.chips.map((chip) => (
                        <span key={chip} className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10.5px] font-bold text-slate-600">{chip}</span>
                      ))}
                    </div>
                  )}
                  {step.evidence && step.evidence.length > 0 && (
                    <div className="space-y-1.5">
                      {step.evidence.map((item) => <EvidenceCard key={item.key} item={item} />)}
                    </div>
                  )}
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
        {!done && (
          <li className="flex items-center gap-2 pl-1 text-[11px] font-semibold text-slate-400" aria-hidden>
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
              ["Sources", String(summary.sources.length)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
                <div className="text-lg font-black leading-none text-slate-900">{value}</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
              </div>
            ))}
          </div>
          {summary.nextSteps.length > 0 && (
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Prochaines étapes</div>
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
