import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { BotExpression } from "./BotCharacter";
import "./bot-live.css";

/** Trois messages courts d'accueil, prononcés l'un après l'autre. */
export function botGreetingLines(firstName?: string | null, thirdLine?: string | null): string[] {
  const name = String(firstName || "").trim().split(/\s+/)[0];
  return [
    name && name.toLowerCase() !== "waouhapp" ? `Bonjour ${name}, je suis Bot.` : "Bonjour, je suis Bot.",
    "Je cherche, compare et négocie pour vous.",
    thirdLine?.trim() || "Dites-moi ce qu'il vous faut, je m'occupe du reste.",
  ];
}

/** Message d'accueil n°3 selon l'activité réelle (missions ou Deal Rooms suivies). */
export function botActivityLine(count: number, noun: "mission" | "Deal Room" = "mission"): string | null {
  if (!Number.isFinite(count) || count <= 0) return null;
  const plural = count > 1 ? "s" : "";
  return noun === "mission"
    ? `J'ai ${count} mission${plural} en cours pour vous.`
    : `Je suis ${count} Deal Room${plural} pour vous.`;
}

export type BotChoice = { label: string; onSelect: () => void };

const SESSION_KEY = "waouh_bot_greeting_played_v4";
const TYPING_MS = 750;
const BETWEEN_MS = 650;

function prefersReducedMotion() {
  try {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  } catch {
    return false;
  }
}

function alreadyPlayed() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Accueil animé : « … » puis message, trois fois, puis une question avec des
 * réponses en un geste. Joué une fois par session ; ensuite (ou si les
 * animations sont réduites) tout s'affiche directement.
 * `onExpressionChange` fait vivre l'avatar : salut, parole, question, repos.
 */
export function BotGreeting({
  firstName,
  thirdLine,
  compact = false,
  question = "On commence par quoi ?",
  choices,
  onExpressionChange,
  onTalkingChange,
  className,
}: {
  compact?: boolean;
  firstName?: string | null;
  thirdLine?: string | null;
  question?: string | null;
  choices?: BotChoice[];
  onExpressionChange?: (expression: BotExpression) => void;
  onTalkingChange?: (talking: boolean) => void;
  className?: string;
}) {
  const lines = useMemo(() => compact ? [botGreetingLines(firstName)[0], ...(thirdLine ? [thirdLine] : [])] : botGreetingLines(firstName, thirdLine), [firstName, thirdLine, compact]);
  const displayedQuestion = compact ? null : question;
  const steps = displayedQuestion ? lines.length + 1 : lines.length;
  const instant = compact || typeof window === "undefined" || prefersReducedMotion() || alreadyPlayed();
  const [shown, setShown] = useState(instant ? steps : 0);
  const [typing, setTyping] = useState(!instant);

  useEffect(() => {
    if (instant) {
      setShown(steps);
      return;
    }
    const timers: number[] = [];
    let at = 350;
    for (let index = 0; index < steps; index += 1) {
      timers.push(window.setTimeout(() => setTyping(true), at));
      at += TYPING_MS;
      timers.push(window.setTimeout(() => {
        setTyping(false);
        setShown(index + 1);
      }, at));
      at += BETWEEN_MS;
    }
    timers.push(window.setTimeout(() => {
      try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* navigation privée */ }
    }, at));
    return () => timers.forEach((t) => window.clearTimeout(t));
    // On ne rejoue pas l'accueil quand le prénom arrive après coup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const done = shown >= steps;
  const expression: BotExpression = instant
    ? "idle"
    : shown === 0
      ? "hello"
      : !done
        ? shown >= lines.length ? "ask" : "talk"
        : question ? "ask" : "idle";
  const talking = !instant && !done;

  useEffect(() => { onExpressionChange?.(expression); }, [expression, onExpressionChange]);
  useEffect(() => { onTalkingChange?.(talking); }, [talking, onTalkingChange]);

  return (
    <div className={cn("flex flex-col items-start gap-1.5", !compact && "min-h-[clamp(96px,26vw,118px)]", className)} aria-live="polite">
      {lines.slice(0, Math.min(shown, lines.length)).map((line, index) => (
        <p
          key={line}
          className={cn(
            compact ? "max-w-full text-xs font-medium leading-relaxed" : "bot-msg-in max-w-full rounded-2xl rounded-tl-md border bg-white/90 px-3 py-1.5 text-[clamp(12.5px,3.3vw,15px)] font-semibold leading-snug shadow-sm",
            index === 0 ? "border-teal-200 text-slate-900" : "border-slate-200/80 text-slate-700",
          )}
        >
          {line}
        </p>
      ))}
      {displayedQuestion && shown > lines.length && (
        <p className="bot-msg-in max-w-full rounded-2xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-[clamp(13px,3.4vw,15.5px)] font-bold leading-snug text-slate-900 shadow-sm">
          {displayedQuestion}
        </p>
      )}
      {typing && shown < steps && (
        <span className="bot-typing rounded-2xl rounded-tl-md border border-slate-200/80 bg-white/90 px-3 py-2 text-teal-600 shadow-sm" aria-label="Bot écrit">
          <span /><span /><span />
        </span>
      )}
      {done && choices && choices.length > 0 && (
        <div className="bot-msg-in mt-0.5 flex flex-wrap gap-1.5">
          {choices.map((choice) => (
            <button
              key={choice.label}
              type="button"
              onClick={choice.onSelect}
              className="min-h-[44px] rounded-full border-[1.5px] border-teal-700 bg-white px-3 text-xs font-semibold text-teal-800 shadow-sm transition hover:bg-teal-50 active:scale-[.97]"
            >
              {choice.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default BotGreeting;
