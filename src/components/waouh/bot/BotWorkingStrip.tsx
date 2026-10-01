import { useEffect, useState } from "react";
import { Radar, ShieldCheck, Sparkles, Handshake } from "lucide-react";
import { cn } from "@/lib/utils";
import "./bot-live.css";

/**
 * « Bot travaille pour vous » : ce que le système fait en continu, rendu visible.
 * Les libellés décrivent des capacités réelles de WAOUH (NEXUS, Signal Fabric,
 * Contact protégé) ; le seul chiffre affiché est le nombre réel de Deal Rooms.
 */
export function BotWorkingStrip({ activeDeals, className }: { activeDeals?: number; className?: string }) {
  const signals = [
    { Icon: Radar, text: "NEXUS explore les annonces près de vous" },
    { Icon: Sparkles, text: "Signal Fabric classe les meilleures offres" },
    { Icon: ShieldCheck, text: "Contact protégé : vos numéros restent privés" },
    ...(activeDeals && activeDeals > 0
      ? [{ Icon: Handshake, text: `${activeDeals} Deal Room${activeDeals > 1 ? "s" : ""} suivie${activeDeals > 1 ? "s" : ""} en direct` }]
      : []),
  ];
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % signals.length), 3200);
    return () => window.clearInterval(timer);
  }, [signals.length]);
  const current = signals[index % signals.length];

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-2xl border border-emerald-100 bg-white/80 px-3 py-2 shadow-sm backdrop-blur",
        className,
      )}
      aria-live="off"
    >
      <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden>
        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 motion-safe:animate-ping" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
      </span>
      <span className="shrink-0 text-[clamp(10.5px,2.8vw,12px)] font-black uppercase tracking-[.08em] text-emerald-700">
        Bot travaille
      </span>
      <span key={index} className="bot-signal flex min-w-0 items-center gap-1.5 text-[clamp(12px,3.1vw,13.5px)] font-semibold text-slate-600">
        <current.Icon className="h-4 w-4 shrink-0 text-cyan-600" />
        <span className="truncate">{current.text}</span>
      </span>
    </div>
  );
}

export default BotWorkingStrip;
