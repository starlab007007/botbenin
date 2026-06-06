import { useEffect, useState } from "react";

interface Props {
  expiresAt: string;
  totalMs?: number;
  size?: number;
  stroke?: number;
}

/** Circular countdown ring with the remaining hours/minutes in the center. */
export function StatusCountdown({ expiresAt, totalMs = 24 * 3600 * 1000, size = 36, stroke = 3 }: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(i);
  }, []);

  const remaining = Math.max(0, new Date(expiresAt).getTime() - now);
  const ratio = Math.max(0, Math.min(1, remaining / totalMs));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - ratio);

  const h = Math.floor(remaining / 3_600_000);
  const m = Math.floor((remaining % 3_600_000) / 60_000);
  const label = remaining <= 0 ? "0" : h >= 1 ? `${h}h` : `${m}m`;

  // Color: green > 6h, amber > 1h, red below
  const color = remaining <= 0
    ? "hsl(0 0% 60%)"
    : h >= 6
      ? "hsl(150 70% 60%)"
      : h >= 1
        ? "hsl(40 90% 60%)"
        : "hsl(0 80% 65%)";

  return (
    <span className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }} aria-label={`Expire dans ${label}`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.18)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s linear, stroke 0.6s" }}
        />
      </svg>
      <span className="absolute text-[10px] font-bold text-white leading-none">{label}</span>
    </span>
  );
}
