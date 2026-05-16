import React from 'react';

const steps = [
  { n: '01', t: 'Cherchez', d: '« Je cherche un iPhone à Cotonou »', tag: 'RECHERCHE' },
  { n: '02', t: 'Négociez', d: 'Offre, contre-offre, accord. En toutes lettres.', tag: 'NÉGOCIATION' },
  { n: '03', t: 'Payez', d: 'Mobile Money. Escrow sécurisé. < 10 secondes.', tag: 'PAIEMENT' },
  { n: '04', t: 'Recevez & notez', d: 'Confirmation, libération escrow, ⭐⭐⭐⭐⭐', tag: 'CLÔTURE' },
];

export const WaouhHowItWorks: React.FC = () => (
  <section style={{ fontFamily: '"Space Grotesk", Inter, sans-serif' }}>
    <div className="mb-6 sm:mb-8">
      <div className="text-[11px] uppercase tracking-[0.25em] mb-2" style={{ color: 'hsl(var(--home-accent))' }}>
        Mode d’emploi
      </div>
      <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight" style={{ color: 'hsl(var(--home-text))' }}>
        En <span className="italic" style={{ color: 'hsl(var(--home-text-muted))' }}>4 messages.</span> Pas un de plus.
      </h2>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {steps.map((s, i) => (
        <div
          key={s.n}
          className="relative overflow-hidden rounded-2xl p-5 sm:p-6 transition"
          style={{
            background: 'hsl(var(--home-surface))',
            border: '1px solid hsl(var(--home-border))',
            boxShadow: '0 10px 30px -20px hsl(var(--home-accent) / 0.3)',
          }}
        >
          <div
            className="text-[48px] sm:text-[64px] leading-none font-bold text-transparent"
            style={{
              WebkitTextStroke: '1px hsl(var(--home-accent))',
              fontFamily: '"Space Grotesk", sans-serif',
            }}
          >
            {s.n}
          </div>
          <div
            className="mt-4 text-[10px] uppercase tracking-[0.2em] font-mono"
            style={{ fontFamily: '"JetBrains Mono", monospace', color: 'hsl(var(--home-text-muted))' }}
          >
            <span
              className="inline-block w-2 h-2 rounded-full mr-2 align-middle"
              style={{ background: 'hsl(var(--home-accent-warm))' }}
            />
            {s.tag}
          </div>
          <h3 className="mt-1.5 text-xl font-semibold" style={{ color: 'hsl(var(--home-text))' }}>{s.t}</h3>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: 'hsl(var(--home-text-muted))' }}>{s.d}</p>
          {i < steps.length - 1 && (
            <div className="hidden lg:block absolute top-1/2 -right-2" style={{ color: 'hsl(var(--home-accent))' }}>→</div>
          )}
        </div>
      ))}
    </div>
  </section>
);
