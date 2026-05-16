import React from 'react';

/**
 * Animated SVG radar showing signals captured from external sources
 * (Facebook, Jiji, WhatsApp groups, Marketplace, etc.) being pulled into WAOUH.
 * Sky Electric palette — light background, cyan sweep, yellow targets.
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
      className="relative overflow-hidden rounded-3xl p-6 sm:p-10 lg:p-14"
      style={{
        background:
          'radial-gradient(600px 300px at 20% 20%, hsl(var(--home-accent) / 0.12), transparent 60%),' +
          'hsl(var(--home-surface))',
        border: '1px solid hsl(var(--home-border))',
        boxShadow: '0 20px 40px -30px hsl(var(--home-accent) / 0.35)',
        fontFamily: '"Space Grotesk", Inter, sans-serif',
      }}
    >
      <div className="grid lg:grid-cols-[1fr_1.1fr] gap-10 items-center">
        {/* LEFT copy */}
        <div>
          <div
            className="text-[11px] uppercase tracking-[0.25em] mb-2"
            style={{ color: 'hsl(var(--home-accent))' }}
          >
            🛰️ Radar IA
          </div>
          <h2
            className="text-3xl sm:text-4xl font-bold leading-tight"
            style={{ color: 'hsl(var(--home-text))' }}
          >
            On voit ce que{' '}
            <span className="italic" style={{ color: 'hsl(var(--home-text-muted))' }}>vous</span> ne voyez pas.
          </h2>
          <p
            className="mt-5 leading-relaxed max-w-md"
            style={{ color: 'hsl(var(--home-text-muted))' }}
          >
            Notre IA scrute les annonces dispersées sur le web — Facebook, Jiji, groupes WhatsApp, Instagram —
            les nettoie, identifie les vrais contacts, et vous les apporte directement dans la conversation.
          </p>

          <ul className="mt-6 space-y-2.5 text-sm" style={{ color: 'hsl(var(--home-text))' }}>
            {[
              ['Détection automatique', 'vendeurs & acheteurs'],
              ['Vérification WhatsApp', 'numéros validés via WAHA'],
              ['Outreach intelligent', '1 msg / profil / 24h'],
              ['Anti-spam', 'cooldown & blacklist'],
            ].map(([k, v]) => (
              <li key={k} className="flex items-start gap-3">
                <span
                  className="mt-1.5 h-1.5 w-1.5 rounded-full"
                  style={{ background: 'hsl(var(--home-accent))' }}
                />
                <span>
                  <span className="font-medium" style={{ color: 'hsl(var(--home-text))' }}>{k}</span>{' '}
                  <span style={{ color: 'hsl(var(--home-text-muted))' }}>— {v}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* RIGHT radar */}
        <div className="relative mx-auto aspect-square w-full max-w-[440px]">
          <svg viewBox="0 0 360 360" className="h-full w-full">
            <defs>
              <radialGradient id="radarBgLight" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#00D4FF" stopOpacity="0.30" />
                <stop offset="60%" stopColor="#00D4FF" stopOpacity="0.06" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
              <linearGradient id="sweepLight" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00D4FF" stopOpacity="0" />
                <stop offset="100%" stopColor="#00D4FF" stopOpacity="0.65" />
              </linearGradient>
            </defs>

            <circle cx="180" cy="180" r="170" fill="url(#radarBgLight)" />
            {[40, 80, 120, 160].map((r) => (
              <circle key={r} cx="180" cy="180" r={r} fill="none" stroke="#00D4FF" strokeOpacity="0.28" />
            ))}
            <line x1="180" y1="10" x2="180" y2="350" stroke="#00D4FF" strokeOpacity="0.18" />
            <line x1="10" y1="180" x2="350" y2="180" stroke="#00D4FF" strokeOpacity="0.18" />

            {/* Sweep */}
            <g style={{ transformOrigin: '180px 180px', animation: 'radar-sweep 5s linear infinite' }}>
              <path d="M180,180 L180,10 A170,170 0 0,1 350,180 Z" fill="url(#sweepLight)" />
            </g>

            {/* Signal dots — yellow targets */}
            {dots.map((d, i) => (
              <g key={i} style={{ animation: `signal-pop 4s ${i * 0.6}s ease-in-out infinite` }}>
                <circle cx={d.x} cy={d.y} r="14" fill="#FFD23F" fillOpacity="0.25" />
                <circle cx={d.x} cy={d.y} r="4" fill="#FFB800" />
                <text
                  x={d.x + 10}
                  y={d.y - 8}
                  fill="#3E5C76"
                  fontSize="9"
                  fontFamily='"JetBrains Mono", monospace'
                >
                  {d.label}
                </text>
              </g>
            ))}

            {/* Center logo — light variant */}
            <g>
              <circle cx="180" cy="180" r="32" fill="#FFFFFF" stroke="#00D4FF" strokeWidth="2" />
              <text
                x="180"
                y="185"
                textAnchor="middle"
                fill="#0B2447"
                fontSize="12"
                fontWeight="700"
                fontFamily='"Space Grotesk", sans-serif'
              >
                WAOUH
              </text>
            </g>
          </svg>

          <style>{`
            @keyframes radar-sweep { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
            @keyframes signal-pop { 0%, 80%, 100% { opacity: 0.35 } 40% { opacity: 1 } }
          `}</style>
        </div>
      </div>
    </section>
  );
};
