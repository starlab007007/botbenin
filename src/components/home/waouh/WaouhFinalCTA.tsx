import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export const WaouhFinalCTA: React.FC = () => (
  <section
    className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-6 sm:p-12 md:p-16 lg:p-20 text-center"
    style={{
      background: 'linear-gradient(135deg, hsl(var(--home-accent)) 0%, #6FE4FF 55%, hsl(var(--home-accent-warm)) 100%)',
      fontFamily: '"Space Grotesk", Inter, sans-serif',
    }}
  >
    <div
      className="absolute inset-0 opacity-25"
      style={{
        backgroundImage:
          'radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px)',
        backgroundSize: '60px 60px, 80px 80px',
      }}
    />
    <div className="relative">
      <div
        className="text-[11px] uppercase tracking-[0.3em] mb-3 sm:mb-4"
        style={{ color: 'hsl(var(--home-text) / 0.75)' }}
      >
        Maintenant
      </div>
      <h2
        className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.05] max-w-3xl mx-auto"
        style={{ color: 'hsl(var(--home-text))' }}
      >
        Votre prochain client <span className="italic">vous attend</span> sur WhatsApp.
      </h2>
      <div className="mt-7 sm:mt-10 flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          to="/waouh-chat"
          className="inline-flex items-center justify-center gap-2 rounded-xl px-7 py-4 font-semibold transition hover:brightness-110"
          style={{ background: 'hsl(var(--home-text))', color: 'hsl(var(--home-surface))' }}
        >
          Lancer WAOUH <ArrowRight className="h-4 w-4" />
        </Link>
        <a
          href="https://wa.me/22965653468?text=Salut%20WAOUH"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl px-7 py-4 font-semibold transition hover:bg-white"
          style={{
            background: 'hsl(var(--home-surface) / 0.6)',
            color: 'hsl(var(--home-text))',
            border: '1px solid hsl(var(--home-text) / 0.25)',
            backdropFilter: 'blur(6px)',
          }}
        >
          +229 65 65 34 68
        </a>
      </div>
    </div>
  </section>
);
