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
      className="relative overflow-hidden rounded-2xl"
      style={{
        background: 'hsl(var(--home-surface))',
        border: '1px solid hsl(var(--home-border))',
        fontFamily: '"JetBrains Mono", monospace',
        boxShadow: '0 10px 30px -20px hsl(var(--home-accent) / 0.35)',
      }}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-16 z-10"
        style={{ background: 'linear-gradient(to right, hsl(var(--home-surface)), transparent)' }}
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-16 z-10"
        style={{ background: 'linear-gradient(to left, hsl(var(--home-surface)), transparent)' }}
      />
      <div className="flex gap-10 py-3 whitespace-nowrap animate-[ticker_40s_linear_infinite]">
        {row.map((t, i) => (
          <span key={i} className="text-[12px]" style={{ color: 'hsl(var(--home-text-muted))' }}>
            <span style={{ color: 'hsl(var(--home-accent))' }}>●</span>&nbsp;&nbsp;{t}
            <span className="mx-4" style={{ color: 'hsl(var(--home-accent-warm))' }}>◆</span>
          </span>
        ))}
      </div>
      <style>{`@keyframes ticker { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
    </div>
  );
};
