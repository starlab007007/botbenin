import React from 'react';

const stats = [
  { v: '2 437', l: 'annonces actives' },
  { v: '97%',   l: 'paiements réussis' },
  { v: '< 3 min', l: 'temps moyen de match' },
  { v: '4.8★',  l: 'satisfaction acheteurs' },
];

export const WaouhProofStats: React.FC = () => (
  <section
    className="relative overflow-hidden rounded-3xl border border-[hsl(var(--waouh-primary)/0.25)] bg-gradient-to-br from-[#F5F0E8] to-[#EFE7D8] p-8 sm:p-12 lg:p-16"
    style={{ fontFamily: '"Space Grotesk", Inter, sans-serif' }}
  >
    <div className="text-[11px] uppercase tracking-[0.25em] text-[#0A0D1A]/50 mb-6">Mesuré, pas inventé</div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-10 gap-x-6">
      {stats.map((s) => (
        <div key={s.l} className="border-l-2 border-[#0A0D1A]/15 pl-5">
          <div className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#0A0D1A] leading-none tracking-tight">{s.v}</div>
          <div className="mt-3 text-sm text-[#0A0D1A]/60">{s.l}</div>
        </div>
      ))}
    </div>
  </section>
);
