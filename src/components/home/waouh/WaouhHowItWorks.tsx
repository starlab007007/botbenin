import React from 'react';

const steps = [
  { n: '01', t: 'Cherchez', d: '« Je cherche un iPhone à Cotonou »', tag: 'RECHERCHE' },
  { n: '02', t: 'Négociez', d: 'Offre, contre-offre, accord. En toutes lettres.', tag: 'NÉGOCIATION' },
  { n: '03', t: 'Payez', d: 'Mobile Money. Escrow sécurisé. < 10 secondes.', tag: 'PAIEMENT' },
  { n: '04', t: 'Recevez & notez', d: 'Confirmation, libération escrow, ⭐⭐⭐⭐⭐', tag: 'CLÔTURE' },
];

export const WaouhHowItWorks: React.FC = () => (
  <section style={{ fontFamily: '"Space Grotesk", Inter, sans-serif' }}>
    <div className="mb-8">
      <div className="text-[11px] uppercase tracking-[0.25em] text-[hsl(var(--waouh-primary))] mb-2">Mode d’emploi</div>
      <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
        En <span className="italic text-white/40">4 messages.</span> Pas un de plus.
      </h2>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {steps.map((s, i) => (
        <div
          key={s.n}
          className="relative overflow-hidden rounded-2xl border border-[hsl(var(--waouh-border))] bg-[hsl(var(--waouh-bg))] p-6 hover:border-[hsl(var(--waouh-primary)/0.5)] transition"
        >
          <div
            className="text-[64px] leading-none font-bold text-transparent"
            style={{ WebkitTextStroke: '1px hsl(var(--waouh-primary) / 0.5)', fontFamily: '"Space Grotesk", sans-serif' }}
          >
            {s.n}
          </div>
          <div className="mt-4 text-[10px] uppercase tracking-[0.2em] text-white/40 font-mono" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
            {s.tag}
          </div>
          <h3 className="mt-1.5 text-xl font-semibold text-white">{s.t}</h3>
          <p className="mt-2 text-sm text-white/55 leading-relaxed">{s.d}</p>
          {i < steps.length - 1 && (
            <div className="hidden lg:block absolute top-1/2 -right-2 text-[hsl(var(--waouh-primary)/0.4)]">→</div>
          )}
        </div>
      ))}
    </div>
  </section>
);
