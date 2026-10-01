import { BotCharacter, type BotExpression } from "./BotCharacter";

export type BotLiveState = "idle" | "talking" | "thinking";

const STATE_TO_EXPRESSION: Record<BotLiveState, BotExpression> = {
  idle: "idle",
  talking: "talk",
  thinking: "think",
};

/**
 * Bot, le visage de WAOUH. Garde l'ancienne API (`state`) et accepte
 * directement une `expression` du personnage.
 */
export function BotLiveAvatar({
  size = 120,
  state = "idle",
  expression,
  online = true,
  className,
}: {
  size?: number | string;
  state?: BotLiveState;
  expression?: BotExpression;
  online?: boolean;
  className?: string;
}) {
  return (
    <span className="relative inline-flex shrink-0">
      <BotCharacter size={size} expression={expression ?? STATE_TO_EXPRESSION[state]} className={className} />
      {online && (
        <span
          className="absolute bottom-[6%] left-[6%] h-[11%] w-[11%] min-h-2 min-w-2 rounded-full border-2 border-white bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.9)]"
          aria-hidden
        />
      )}
    </span>
  );
}

export default BotLiveAvatar;
