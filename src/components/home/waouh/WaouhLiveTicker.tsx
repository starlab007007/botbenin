import React from 'react';

const ITEMS = [
  '🛰️  2 437 annonces actives',
  '💬  184 transactions aujourd’hui',
  '💸  12.4M FCFA échangés cette semaine',
  '📍  Cotonou · Porto-Novo · Parakou · Calavi',
  '🇧🇯  Français · Fon · Yoruba',
  '⭐  4.8/5 satisfaction',
  '🔒  Paiements sécurisés Mobile Money',
  '⚡  Match moyen en < 3 min',
];

export const WaouhLiveTicker: React.FC = () => {
  const row = [...ITEMS, ...ITEMS];
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-[hsl(var(--waouh-border))] bg-[#0A0D1A]"
      style={{ fontFamily: '"JetBrains Mono", monospace' }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-r from-[#0A0D1A] to-transparent" />
      <div className="absolute right-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-l from-[#0A0D1A] to-transparent" />
      <div className="flex gap-10 py-3 whitespace-nowrap animate-[ticker_40s_linear_infinite]">
        {row.map((t, i) => (
          <span key={i} className="text-[12px] text-white/70">
            <span className="text-[hsl(var(--waouh-primary))]">●</span>&nbsp;&nbsp;{t}
          </span>
        ))}
      </div>
      <style>{`@keyframes ticker { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
    </div>
  );
};
