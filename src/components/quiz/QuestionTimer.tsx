import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  seconds: number;
  paused?: boolean;
  resetKey: string | number;
  onExpire: () => void;
  className?: string;
}

export const QuestionTimer: React.FC<Props> = ({ seconds, paused, resetKey, onExpire, className }) => {
  const [remaining, setRemaining] = useState(seconds);
  const expired = useRef(false);

  useEffect(() => {
    setRemaining(seconds);
    expired.current = false;
  }, [resetKey, seconds]);

  useEffect(() => {
    if (paused || expired.current) return;
    if (remaining <= 0) {
      if (!expired.current) {
        expired.current = true;
        onExpire();
      }
      return;
    }
    const id = setTimeout(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearTimeout(id);
  }, [remaining, paused, onExpire]);

  const ratio = Math.max(0, remaining) / seconds;
  const colorClass =
    remaining <= 5
      ? 'text-rose-600 stroke-rose-500'
      : remaining <= 10
      ? 'text-amber-600 stroke-amber-500'
      : 'text-emerald-600 stroke-emerald-500';

  const radius = 18;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - ratio);
  const mm = Math.floor(remaining / 60).toString().padStart(2, '0');
  const ss = (remaining % 60).toString().padStart(2, '0');

  return (
    <div
      className={cn('inline-flex items-center gap-2', colorClass, className)}
      role="timer"
      aria-live="polite"
      aria-label={`Temps restant ${mm}:${ss}`}
    >
      <svg width="44" height="44" viewBox="0 0 44 44" className="shrink-0">
        <circle cx="22" cy="22" r={radius} fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="3" />
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 22 22)"
          className="transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>
      <span className="font-mono text-sm font-semibold tabular-nums">
        {mm}:{ss}
      </span>
    </div>
  );
};

export default QuestionTimer;
