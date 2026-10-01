import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import "./bot-live.css";

/** Trois messages courts d'accueil, prononcés l'un après l'autre. */
function botGreetingLines(firstName?: string | null): string[] {
  const name = String(firstName || "").trim().split(/\s+/)[0];
  return [
    name && name.toLowerCase() !== "waouhapp" ? `Bonjour ${name}, je suis Bot.` : "Bonjour, je suis Bot.",
    "Je cherche, compare et négocie pour vous.",
    "Dites-moi ce qu'il vous faut, je m'occupe du reste.",
  ];
}

const SESSION_KEY = "waouh_bot_greeting_played_v3";
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
 * Accueil animé : « … » puis message, trois fois. Joué une fois par session ;
 * ensuite (ou si les animations sont réduites) les trois messages s'affichent
 * directement. `onTalkingChange` anime la bouche de l'avatar pendant ce temps.
 */
export function BotGreeting({
  firstName,
  onTalkingChange,
  className,
}: {
  firstName?: string | null;
  onTalkingChange?: (talking: boolean) => void;
  className?: string;
}) {
  const lines = useMemo(() => botGreetingLines(firstName), [firstName]);
  const instant = typeof window === "undefined" || prefersReducedMotion() || alreadyPlayed();
  const [shown, setShown] = useState(instant ? lines.length : 0);
  const [typing, setTyping] = useState(!instant);

  useEffect(() => {
    if (instant) {
      setShown(lines.length);
      return;
    }
    const timers: number[] = [];
    let at = 350;
    lines.forEach((_, index) => {
      timers.push(window.setTimeout(() => setTyping(true), at));
      at += TYPING_MS;
      timers.push(window.setTimeout(() => {
        setTyping(false);
        setShown(index + 1);
      }, at));
      at += BETWEEN_MS;
    });
    timers.push(window.setTimeout(() => {
      try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* navigation privée */ }
    }, at));
    return () => timers.forEach((t) => window.clearTimeout(t));
    // Les lignes ne changent qu'avec le prénom ; on ne rejoue pas pour autant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const talking = typing || (shown > 0 && shown < lines.length);
  useEffect(() => { onTalkingChange?.(talking && !instant); }, [talking, instant, onTalkingChange]);

  return (
    <div className={cn("flex min-h-[clamp(96px,26vw,118px)] flex-col items-start gap-1.5", className)} aria-live="polite">
      {lines.slice(0, shown).map((line, index) => (
        <p
          key={line}
          className={cn(
            "bot-msg-in max-w-full rounded-2xl rounded-tl-md border bg-white/90 px-3 py-1.5 text-[clamp(12.5px,3.3vw,15px)] font-semibold leading-snug shadow-sm",
            index === lines.length - 1 ? "border-teal-200 text-teal-900" : "border-slate-200/80 text-slate-700",
          )}
        >
          {line}
        </p>
      ))}
      {typing && shown < lines.length && (
        <span className="bot-typing rounded-2xl rounded-tl-md border border-slate-200/80 bg-white/90 px-3 py-2 text-teal-600 shadow-sm" aria-label="Bot écrit">
          <span /><span /><span />
        </span>
      )}
    </div>
  );
}

export default BotGreeting;
