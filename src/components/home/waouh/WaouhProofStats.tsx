import React from 'react';

const stats = [
  { v: '2 437', l: 'annonces actives' },
  { v: '97%',   l: 'paiements réussis' },
  { v: '< 3 min', l: 'temps moyen de match' },
  { v: '4.8★',  l: 'satisfaction acheteurs' },
];

export const WaouhProofStats: React.FC = () => (
  <section
    className="relative overflow-hidden rounded-3xl p-8 sm:p-12 lg:p-16"
    style={{
      background: 'linear-gradient(135deg, hsl(var(--home-accent)) 0%, #6FE4FF 60%, hsl(var(--home-accent-warm)) 100%)',
      fontFamily: '"Space Grotesk", Inter, sans-serif',
    }}
  >
    <div className="text-[11px] uppercase tracking-[0.25em] mb-6" style={{ color: 'hsl(var(--home-text) / 0.65)' }}>
      Mesuré, pas inventé
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-10 gap-x-6">
      {stats.map((s) => (
        <div
          key={s.l}
          className="pl-5"
          style={{ borderLeft: '2px solid hsl(var(--home-text) / 0.25)' }}
        >
          <div
            className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-none tracking-tight"
            style={{ color: 'hsl(var(--home-text))' }}
          >
            {s.v}
          </div>
          <div className="mt-3 text-sm" style={{ color: 'hsl(var(--home-text) / 0.75)' }}>{s.l}</div>
        </div>
      ))}
    </div>
  </section>
);
