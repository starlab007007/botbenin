import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export const WaouhFinalCTA: React.FC = () => (
  <section
    className="relative overflow-hidden rounded-3xl p-10 sm:p-16 lg:p-20 text-center"
    style={{
      background: 'linear-gradient(135deg, hsl(var(--waouh-primary)) 0%, hsl(var(--waouh-ai)) 100%)',
      fontFamily: '"Space Grotesk", Inter, sans-serif',
    }}
  >
    <div className="absolute inset-0 opacity-20" style={{
      backgroundImage:
        'radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px)',
      backgroundSize: '60px 60px, 80px 80px',
    }} />
    <div className="relative">
      <div className="text-[11px] uppercase tracking-[0.3em] text-[#0A0D1A]/60 mb-4">Maintenant</div>
      <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#0A0D1A] leading-[1.05] max-w-3xl mx-auto">
        Votre prochain client <span className="italic">vous attend</span> sur WhatsApp.
      </h2>
      <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          to="/waouh-chat"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A0D1A] px-7 py-4 text-white font-semibold transition hover:bg-black"
        >
          Lancer WAOUH <ArrowRight className="h-4 w-4" />
        </Link>
        <a
          href="https://wa.me/22965653468?text=Salut%20WAOUH"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#0A0D1A]/30 bg-white/30 backdrop-blur px-7 py-4 text-[#0A0D1A] font-semibold transition hover:bg-white/50"
        >
          +229 65 65 34 68
        </a>
      </div>
    </div>
  </section>
);
