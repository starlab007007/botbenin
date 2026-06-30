import { useEffect, useState } from "react";
import { RADAR_RINGS } from "../../utils/geo";
import type { RadarItem } from "../../hooks/useRadarScan";

interface Props {
  items: RadarItem[];
  maxRadiusKm: number;
  scanning: boolean;
  onPick: (item: RadarItem) => void;
}

/**
 * Visuel sonar : 4 anneaux concentriques + ligne de balayage rotative.
 * Les vignettes-photos sont positionnées à leur (distance, bearing) réel.
 */
export function RadarCanvas({ items, maxRadiusKm, scanning, onPick }: Props) {
  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const Rmax = size / 2 - 8;
  const [sweep, setSweep] = useState(0);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      const dt = t - last;
      last = t;
      setSweep((s) => (s + dt * 0.18) % 360);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Map distance(km) → radius(px) — log-ish so close items get more room.
  const distToR = (km: number) => {
    const ratio = Math.log10(1 + km) / Math.log10(1 + maxRadiusKm);
    return Math.min(1, ratio) * Rmax;
  };

  // Place items, avoid extreme center overlap
  const placed = items.slice(0, 28).map((it) => {
    const r = Math.max(28, distToR(it.distanceKm));
    const θ = ((it.bearing - 90) * Math.PI) / 180; // 0° = North → up
    return { it, x: cx + r * Math.cos(θ), y: cy + r * Math.sin(θ) };
  });

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0">
        <defs>
          <radialGradient id="radarBg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(165 91% 18% / 0.25)" />
            <stop offset="100%" stopColor="hsl(165 91% 8% / 0.05)" />
          </radialGradient>
          <linearGradient id="sweepGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(165 91% 45% / 0)" />
            <stop offset="100%" stopColor="hsl(165 91% 45% / 0.55)" />
          </linearGradient>
        </defs>
        <circle cx={cx} cy={cy} r={Rmax} fill="url(#radarBg)" />
        {RADAR_RINGS.map((ring) => {
          const r = distToR(ring.maxKm);
          if (r <= 0) return null;
          return (
            <g key={ring.id}>
              <circle cx={cx} cy={cy} r={r} fill="none" stroke={ring.color} strokeOpacity={0.35} strokeDasharray="3 4" />
              <text
                x={cx + r - 4}
                y={cy - 4}
                textAnchor="end"
                fontSize="9"
                fill={ring.color}
                fontWeight="600"
              >
                {ring.label}
              </text>
            </g>
          );
        })}
        {/* Cross */}
        <line x1={cx} y1={4} x2={cx} y2={size - 4} stroke="currentColor" strokeOpacity={0.08} />
        <line x1={4} y1={cy} x2={size - 4} y2={cy} stroke="currentColor" strokeOpacity={0.08} />
        {/* Sweep wedge */}
        {scanning && (
          <g transform={`rotate(${sweep} ${cx} ${cy})`}>
            <path
              d={`M ${cx} ${cy} L ${cx + Rmax} ${cy} A ${Rmax} ${Rmax} 0 0 1 ${cx + Rmax * Math.cos((Math.PI / 4))} ${cy + Rmax * Math.sin((Math.PI / 4))} Z`}
              fill="url(#sweepGrad)"
            />
          </g>
        )}
        {/* Center pin */}
        <circle cx={cx} cy={cy} r={6} fill="hsl(165 91% 35%)" />
        <circle cx={cx} cy={cy} r={12} fill="none" stroke="hsl(165 91% 35%)" strokeOpacity={0.5}>
          <animate attributeName="r" from="6" to="20" dur="1.6s" repeatCount="indefinite" />
          <animate attributeName="stroke-opacity" from="0.6" to="0" dur="1.6s" repeatCount="indefinite" />
        </circle>
      </svg>

      {/* Photos as absolutely-positioned tappable nodes */}
      {placed.map(({ it, x, y }) => (
        <button
          key={it.id}
          onClick={() => onPick(it)}
          className="absolute -translate-x-1/2 -translate-y-1/2 group"
          style={{ left: x, top: y }}
          aria-label={it.title}
        >
          <div
            className="h-10 w-10 rounded-full overflow-hidden border-2 shadow-lg bg-muted ring-2 ring-background hover:scale-110 transition-transform"
            style={{ borderColor: it.ringColor }}
          >
            {it.photo ? (
              <img src={it.photo} alt="" className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-emerald-400 to-teal-600" />
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
