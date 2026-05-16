import React from 'react';

/**
 * Animated SVG radar showing signals captured from external sources
 * (Facebook, Jiji, WhatsApp groups, Marketplace, etc.) being pulled into WAOUH.
 */
export const WaouhRadarLive: React.FC = () => {
  const dots = [
    { x: 110, y:  60, label: 'Jiji' },
    { x: 260, y:  90, label: 'FB Marketplace' },
    { x:  70, y: 170, label: 'Groupe WhatsApp' },
    { x: 250, y: 200, label: 'Coin Afrique' },
    { x: 140, y: 250, label: 'Annonces Cotonou' },
    { x: 300, y: 160, label: 'Instagram' },
  ];

  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-[hsl(var(--waouh-border))] bg-[hsl(var(--waouh-bg))] p-6 sm:p-10 lg:p-14"
      style={{ fontFamily: '"Space Grotesk", Inter, sans-serif' }}
    >
      <div className="grid lg:grid-cols-[1fr_1.1fr] gap-10 items-center">
        {/* LEFT copy */}
        <div>
          <div className="text-[11px] uppercase tracking-[0.25em] text-[hsl(var(--waouh-primary))] mb-2">🛰️ Radar IA</div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
            On voit ce que <span className="italic text-white/40">vous</span> ne voyez pas.
          </h2>
          <p className="mt-5 text-white/65 leading-relaxed max-w-md">
            Notre IA scrute les annonces dispersées sur le web — Facebook, Jiji, groupes WhatsApp, Instagram — les nettoie,
            identifie les vrais contacts, et vous les apporte directement dans la conversation.
          </p>

          <ul className="mt-6 space-y-2.5 text-sm text-white/75">
            {[
              ['Détection automatique', 'vendeurs & acheteurs'],
              ['Vérification WhatsApp', 'numéros validés via WAHA'],
              ['Outreach intelligent', '1 msg / profil / 24h'],
              ['Anti-spam', 'cooldown & blacklist'],
            ].map(([k, v]) => (
              <li key={k} className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[hsl(var(--waouh-primary))]" />
                <span><span className="text-white font-medium">{k}</span> <span className="text-white/40">— {v}</span></span>
              </li>
            ))}
          </ul>
        </div>

        {/* RIGHT radar */}
        <div className="relative mx-auto aspect-square w-full max-w-[440px]">
          <svg viewBox="0 0 360 360" className="h-full w-full">
            <defs>
              <radialGradient id="radarBg" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="hsl(var(--waouh-primary))" stopOpacity="0.25" />
                <stop offset="60%" stopColor="hsl(var(--waouh-primary))" stopOpacity="0.04" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
              <linearGradient id="sweep" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(var(--waouh-primary))" stopOpacity="0" />
                <stop offset="100%" stopColor="hsl(var(--waouh-primary))" stopOpacity="0.55" />
              </linearGradient>
            </defs>

            <circle cx="180" cy="180" r="170" fill="url(#radarBg)" />
            {[40, 80, 120, 160].map((r) => (
              <circle key={r} cx="180" cy="180" r={r} fill="none" stroke="hsl(var(--waouh-primary))" strokeOpacity="0.18" />
            ))}
            <line x1="180" y1="10" x2="180" y2="350" stroke="hsl(var(--waouh-primary))" strokeOpacity="0.12" />
            <line x1="10" y1="180" x2="350" y2="180" stroke="hsl(var(--waouh-primary))" strokeOpacity="0.12" />

            {/* Sweep */}
            <g style={{ transformOrigin: '180px 180px', animation: 'radar-sweep 5s linear infinite' }}>
              <path d="M180,180 L180,10 A170,170 0 0,1 350,180 Z" fill="url(#sweep)" />
            </g>

            {/* Signal dots */}
            {dots.map((d, i) => (
              <g key={i} style={{ animation: `signal-pop 4s ${i * 0.6}s ease-in-out infinite` }}>
                <circle cx={d.x} cy={d.y} r="14" fill="hsl(var(--waouh-primary))" fillOpacity="0.12" />
                <circle cx={d.x} cy={d.y} r="4" fill="hsl(var(--waouh-primary))" />
                <text
                  x={d.x + 10}
                  y={d.y - 8}
                  fill="rgba(255,255,255,0.6)"
                  fontSize="9"
                  fontFamily='"JetBrains Mono", monospace'
                >
                  {d.label}
                </text>
              </g>
            ))}

            {/* Center logo */}
            <g>
              <circle cx="180" cy="180" r="32" fill="#0A0D1A" stroke="hsl(var(--waouh-primary))" strokeWidth="1.5" />
              <text x="180" y="185" textAnchor="middle" fill="hsl(var(--waouh-primary))" fontSize="12" fontWeight="700" fontFamily='"Space Grotesk", sans-serif'>WAOUH</text>
            </g>
          </svg>

          <style>{`
            @keyframes radar-sweep { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
            @keyframes signal-pop { 0%, 80%, 100% { opacity: 0.3 } 40% { opacity: 1 } }
          `}</style>
        </div>
      </div>
    </section>
  );
};
