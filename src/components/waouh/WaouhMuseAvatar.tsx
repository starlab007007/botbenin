import { Bot, Search, ShoppingBag, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type WaouhMuseMode = "buyer" | "seller" | "neutral";
export type WaouhMusePhase =
  | "idle"
  | "listening"
  | "searching"
  | "comparing"
  | "contacting"
  | "negotiating"
  | "success";

export function WaouhMuseAvatar({
  mode = "neutral",
  phase = "idle",
  size = "md",
  className,
}: {
  mode?: WaouhMuseMode;
  phase?: WaouhMusePhase;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const box = size === "sm" ? "h-9 w-9" : size === "lg" ? "h-16 w-16" : "h-12 w-12";
  const icon = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-7 w-7" : "h-5 w-5";
  const active = ["searching", "comparing", "contacting", "negotiating"].includes(phase);
  const ModeIcon = mode === "buyer" ? Search : mode === "seller" ? ShoppingBag : Sparkles;

  return (
    <div className={cn("relative shrink-0", box, className)} aria-label="Avatar WAOUH Muse">
      {active && (
        <>
          <span className="absolute inset-0 rounded-[36%] bg-cyan-400/25 motion-safe:animate-ping" />
          <span className="absolute -inset-1 rounded-[40%] border border-emerald-400/35 motion-safe:animate-pulse" />
        </>
      )}
      <div
        className={cn(
          "relative z-10 flex h-full w-full items-center justify-center overflow-hidden rounded-[36%] border shadow-sm",
          mode === "seller"
            ? "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-emerald-50 text-amber-700"
            : mode === "buyer"
              ? "border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-emerald-50 text-cyan-700"
              : "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 text-emerald-700"
        )}
      >
        <Bot className={cn(icon, active && "motion-safe:animate-pulse")} />
        <span className="absolute bottom-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-white bg-white shadow-sm">
          <ModeIcon className="h-2.5 w-2.5" />
        </span>
        <span className="absolute left-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_7px_rgba(52,211,153,.8)]" />
      </div>
    </div>
  );
}
