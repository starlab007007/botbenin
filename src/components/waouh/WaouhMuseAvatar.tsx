import { cn } from "@/lib/utils";
import { BotCharacter, type BotExpression } from "./bot/BotCharacter";

export type WaouhMuseMode = "buyer" | "seller" | "neutral";
export type WaouhMusePhase =
  | "idle"
  | "listening"
  | "searching"
  | "comparing"
  | "contacting"
  | "negotiating"
  | "success";

/** Phase de la mission → expression du personnage Bot. */
export const MUSE_PHASE_EXPRESSION: Record<WaouhMusePhase, BotExpression> = {
  idle: "idle",
  listening: "listen",
  searching: "think",
  comparing: "think",
  contacting: "work",
  negotiating: "work",
  success: "win",
};

const SIZE_PX = { sm: 36, md: 48, lg: 64 } as const;

/**
 * Avatar compact utilisé dans les barres et les en-têtes : c'est le même
 * personnage Bot, dont l'expression suit la phase de la mission.
 */
export function WaouhMuseAvatar({
  mode = "neutral",
  phase = "idle",
  size = "md",
  expression,
  animated = true,
  className,
}: {
  mode?: WaouhMuseMode;
  phase?: WaouhMusePhase;
  size?: "sm" | "md" | "lg";
  /** Force une expression précise (sinon elle suit la phase). */
  expression?: BotExpression;
  animated?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("relative inline-flex shrink-0", className)} data-mode={mode}>
      <BotCharacter size={SIZE_PX[size]} expression={expression ?? MUSE_PHASE_EXPRESSION[phase] ?? "idle"} animated={animated} />
    </span>
  );
}
