import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import botAvatarUrl from "@/assets/waouh-bot-avatar.webp";
import "./bot-character.css";

/** Ce que Bot exprime. Chaque expression correspond à un moment réel de WAOUH. */
export type BotExpression = "idle" | "hello" | "listen" | "talk" | "think" | "work" | "ask" | "win";

type Pose = {
  /** Couleur du halo : elle dit ce que fait Bot. */
  halo: string;
  /** Inclinaison de la tête, en degrés. */
  tilt: number;
  label: string;
};

export const BOT_POSES: Record<BotExpression, Pose> = {
  idle: { halo: "#14B8A6", tilt: 0, label: "Bot, votre Avatar IA" },
  hello: { halo: "#34D399", tilt: -6, label: "Bot vous salue" },
  listen: { halo: "#22D3EE", tilt: 6, label: "Bot vous écoute" },
  talk: { halo: "#14B8A6", tilt: 0, label: "Bot vous parle" },
  think: { halo: "#8B5CF6", tilt: -7, label: "Bot réfléchit" },
  work: { halo: "#3B82F6", tilt: 0, label: "Bot travaille pour vous" },
  ask: { halo: "#F59E0B", tilt: 8, label: "Bot vous pose une question" },
  win: { halo: "#FBBF24", tilt: 0, label: "Bot célèbre un accord" },
};

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
);

const CONFETTI = [
  { left: "6%", color: "#F59E0B", cls: "a-c1" },
  { left: "30%", color: "#14B8A6", cls: "a-c2" },
  { left: "58%", color: "#8B5CF6", cls: "a-c3" },
  { left: "84%", color: "#F472B6", cls: "a-c4" },
];

/**
 * Bot, le cœur de WAOUH : portrait animé (flotte, respire, incline la tête),
 * halo d'état et badge d'action selon ce qu'il fait. Purement visuel.
 */
export function BotCharacter({
  expression = "idle",
  size = 120,
  animated = true,
  className,
  title,
}: {
  expression?: BotExpression;
  size?: number | string;
  animated?: boolean;
  className?: string;
  title?: string;
}) {
  const pose = BOT_POSES[expression] ?? BOT_POSES.idle;
  const width = typeof size === "number" ? `${size}px` : size;
  const style = { width, "--halo": pose.halo } as CSSProperties;
  const ringSpin = expression === "work" || expression === "think" ? "a-spin" : "a-spin-slow";
  const faceMotion = expression === "talk" || expression === "hello" ? "a-talk" : "a-breath";

  return (
    <span
      className={cn("botc", className)}
      data-still={!animated}
      data-expression={expression}
      style={style}
      role="img"
      aria-label={title ?? pose.label}
    >
      <span className="a-float absolute inset-0">
        <span className="botc__glow a-glow" aria-hidden />
        {expression === "listen" && (
          <>
            <span className="botc__ripple a-ripple" aria-hidden />
            <span className="botc__ripple a-ripple2" aria-hidden />
          </>
        )}
        <span className={cn("botc__ring", ringSpin)} aria-hidden />
        <span className="botc__body" style={{ transform: `rotate(${pose.tilt}deg)` }}>
          <span className="botc__face">
            <img className={faceMotion} src={botAvatarUrl} alt="" draggable={false} />
          </span>
        </span>

        {expression === "talk" && (
          <span className="botc__badge botc__badge--br" style={{ background: pose.halo }} aria-hidden>
            <span className="botc__bars"><i className="a-bar1" /><i className="a-bar2" /><i className="a-bar3" /></span>
          </span>
        )}
        {expression === "think" && (
          <span className="botc__badge botc__badge--tr" style={{ background: pose.halo }} aria-hidden>
            <span className="botc__dots"><i className="a-dot1" /><i className="a-dot2" /><i className="a-dot3" /></span>
          </span>
        )}
        {expression === "work" && (
          <span className="botc__badge botc__badge--br a-pop" style={{ background: pose.halo }} aria-hidden>
            <Icon d="M13 2 4 14h7l-1 8 9-12h-7z" />
          </span>
        )}
        {expression === "ask" && (
          <span className="botc__badge botc__badge--tr a-q" style={{ background: pose.halo }} aria-hidden>
            <Icon d="M9.2 9a3 3 0 0 1 5.6 1.3c0 2-2.8 2.4-2.8 4.2M12 18h.01" />
          </span>
        )}
        {expression === "hello" && (
          <span className="botc__badge botc__badge--tr a-wiggle" style={{ background: pose.halo }} aria-hidden>
            <Icon d="M7 11V6.5a1.5 1.5 0 0 1 3 0V11m0-1V4.5a1.5 1.5 0 0 1 3 0V11m0-.5V6a1.5 1.5 0 0 1 3 0v7a7 7 0 0 1-12.6 4.2L4 15.5a1.6 1.6 0 0 1 2.6-1.9L7 14" />
          </span>
        )}
        {expression === "listen" && (
          <span className="botc__badge botc__badge--br" style={{ background: pose.halo }} aria-hidden>
            <Icon d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3" />
          </span>
        )}
        {expression === "win" && (
          <>
            {CONFETTI.map((piece) => (
              <span key={piece.left} className={cn("botc__confetti", piece.cls)} style={{ left: piece.left, background: piece.color }} aria-hidden />
            ))}
            <span className="botc__badge botc__badge--tr a-pop" style={{ background: pose.halo }} aria-hidden>
              <Icon d="m12 3 2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6-4.5-4.1 6-.7z" />
            </span>
          </>
        )}
      </span>
    </span>
  );
}

export default BotCharacter;
