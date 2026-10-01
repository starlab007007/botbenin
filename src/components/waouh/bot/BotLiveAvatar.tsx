import { useId } from "react";
import { cn } from "@/lib/utils";
import "./bot-live.css";

export type BotLiveState = "idle" | "talking" | "thinking";

/**
 * Bot, le visage de WAOUH : personnage original en SVG (tête ronde, écran-visage,
 * antenne lumineuse). Il respire, cligne des yeux, parle pendant l'accueil et
 * « réfléchit » pendant une recherche. Purement visuel : aucune donnée.
 */
export function BotLiveAvatar({
  size = 120,
  state = "idle",
  online = true,
  className,
}: {
  size?: number | string;
  state?: BotLiveState;
  online?: boolean;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const dimension = typeof size === "number" ? `${size}px` : size;
  return (
    <div
      className={cn("bot-live shrink-0", state === "thinking" && "bot-live__thinking", className)}
      data-talking={state === "talking"}
      style={{ width: dimension, height: dimension }}
      role="img"
      aria-label={state === "talking" ? "Bot vous parle" : "Bot, votre Avatar IA"}
    >
      <span className="bot-live__halo" aria-hidden />
      <span className="bot-live__ring" aria-hidden />
      {online && <span className="bot-live__pulse" aria-hidden />}
      <svg className="bot-live__body" viewBox="0 0 120 120" aria-hidden>
        <defs>
          <radialGradient id={`face-${uid}`} cx="40%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="55%" stopColor="#ecfeff" />
            <stop offset="100%" stopColor="#cffafe" />
          </radialGradient>
          <linearGradient id={`screen-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#134e4a" />
          </linearGradient>
          <linearGradient id={`ear-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#0d9488" />
          </linearGradient>
        </defs>
        {/* antenne */}
        <line x1="60" y1="20" x2="60" y2="9" stroke="#0e7490" strokeWidth="3" strokeLinecap="round" />
        <circle className="bot-live__antenna" cx="60" cy="8" r="5" fill="#34d399" />
        {/* oreilles */}
        <rect x="9" y="50" width="11" height="24" rx="5.5" fill={`url(#ear-${uid})`} />
        <rect x="100" y="50" width="11" height="24" rx="5.5" fill={`url(#ear-${uid})`} />
        {/* tête */}
        <rect x="17" y="20" width="86" height="84" rx="38" fill={`url(#face-${uid})`} stroke="#a5f3fc" strokeWidth="2" />
        {/* écran-visage */}
        <rect x="29" y="38" width="62" height="46" rx="21" fill={`url(#screen-${uid})`} />
        <g fill="#5eead4">
          <ellipse className="bot-live__eye" cx="47" cy="58" rx="5.5" ry="7" />
          <ellipse className="bot-live__eye" cx="73" cy="58" rx="5.5" ry="7" />
        </g>
        <rect className="bot-live__mouth" x="51" y="70" width="18" height="4.5" rx="2.25" fill="#5eead4" />
        {/* joues */}
        <circle cx="36" cy="72" r="3.2" fill="#f472b6" opacity=".35" />
        <circle cx="84" cy="72" r="3.2" fill="#f472b6" opacity=".35" />
        {/* reflet */}
        <path d="M34 30 Q48 24 62 26" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity=".9" />
      </svg>
      {online && (
        <span
          className="absolute bottom-[8%] right-[8%] h-[13%] w-[13%] min-h-2.5 min-w-2.5 rounded-full border-2 border-white bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.9)]"
          aria-hidden
        />
      )}
    </div>
  );
}

export default BotLiveAvatar;
