import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MessageCircle, Sparkles, MapPin } from 'lucide-react';

/**
 * WAOUH Live Hero — split 55/45
 * Left: monumental headline + CTAs
 * Right: looped iPhone-frame chat demo replaying a real WAOUH negotiation
 */

type Bubble = {
  side: 'in' | 'out' | 'sys';
  text: string;
  delay: number;
};

const SCRIPT: Bubble[] = [
  { side: 'in',  text: 'Je cherche un iPhone 11 à Cotonou, max 150 000 FCFA', delay: 0 },
  { side: 'out', text: '🛰️ Trouvé : iPhone 11 — 145 000 FCFA — Akpakpa (Kossi, ⭐ 4.9)\nRépondez « intéressé n°1 »', delay: 1200 },
  { side: 'in',  text: 'intéressé n°1', delay: 2600 },
  { side: 'out', text: 'Faites votre offre.', delay: 3400 },
  { side: 'in',  text: 'je propose 130 000', delay: 4100 },
  { side: 'out', text: 'Vendeur contre-propose : 140 000 FCFA', delay: 5300 },
  { side: 'in',  text: 'OUI', delay: 6400 },
  { side: 'sys', text: '✓ Accord conclu — Payez en sécurité', delay: 7200 },
  { side: 'in',  text: 'payer 0165653468', delay: 8200 },
  { side: 'out', text: '✅ Paiement reçu — Contact vendeur : +229 97 12 34 56\nLivraison Akpakpa, créneau 16h ?', delay: 9300 },
  { side: 'in',  text: 'j’ai reçu 🎉', delay: 10600 },
  { side: 'out', text: '🎉 Transaction terminée. Notez Kossi : ⭐⭐⭐⭐⭐', delay: 11500 },
];

const LOOP = 14000;

const Typing: React.FC = () => (
  <div className="flex gap-1 px-3 py-2">
    <span className="waouh-typing-dot h-1.5 w-1.5 rounded-full bg-white/60" />
    <span className="waouh-typing-dot h-1.5 w-1.5 rounded-full bg-white/60" />
    <span className="waouh-typing-dot h-1.5 w-1.5 rounded-full bg-white/60" />
  </div>
);

const ChatBubble: React.FC<{ b: Bubble }> = ({ b }) => {
  if (b.side === 'sys') {
    return (
      <div className="mx-auto rounded-full bg-[hsl(var(--waouh-success)/0.15)] border border-[hsl(var(--waouh-success)/0.3)] px-3 py-1 text-[10.5px] text-[hsl(var(--waouh-success))] font-medium animate-fade-in">
        {b.text}
      </div>
    );
  }
  const isIn = b.side === 'in';
  return (
    <div className={`flex ${isIn ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      <div
        className={`max-w-[78%] whitespace-pre-line px-3 py-2 text-[12.5px] leading-snug rounded-2xl ${
          isIn
            ? 'bg-[#005C4B] text-white rounded-br-sm'
            : 'bg-[#202C33] text-white/95 rounded-bl-sm border border-white/5'
        }`}
      >
        {b.text}
      </div>
    </div>
  );
};

export const WaouhLiveHero: React.FC = () => {
  const [tick, setTick] = useState(0);
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () => {
      const d = new Date();
      setTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} GMT`);
    };
    update();
    const i = setInterval(update, 30_000);
    const loop = setInterval(() => setTick((t) => t + 1), LOOP);
    return () => { clearInterval(i); clearInterval(loop); };
  }, []);

  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-[hsl(var(--waouh-border))]"
      style={{
        background:
          'radial-gradient(1100px 600px at 85% 0%, hsl(var(--waouh-primary) / 0.18), transparent 60%),' +
          'radial-gradient(900px 500px at 0% 100%, hsl(var(--waouh-ai) / 0.18), transparent 60%),' +
          'linear-gradient(180deg, #0A0D1A 0%, #0C0F1C 100%)',
        fontFamily: '"Space Grotesk", Inter, sans-serif',
      }}
    >
      {/* grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />

      <div className="relative grid lg:grid-cols-[1.15fr_1fr] gap-8 lg:gap-12 p-6 sm:p-10 lg:p-14">
        {/* LEFT */}
        <div className="flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-[hsl(var(--waouh-primary)/0.4)] bg-[hsl(var(--waouh-primary)/0.08)] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--waouh-primary))] backdrop-blur waouh-badge-new">
            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--waouh-success))] animate-pulse" />
            LIVE
            <span className="text-white/40">•</span>
            <MapPin className="h-3 w-3" /> Cotonou
            <span className="text-white/40">•</span>
            <span className="font-mono" style={{ fontFamily: '"JetBrains Mono", monospace' }}>{time}</span>
          </div>

          <h1 className="mt-6 text-white font-bold leading-[0.95] tracking-tight text-[44px] sm:text-[68px] lg:text-[88px]">
            <span className="block">Parlez.</span>
            <span className="block italic font-medium text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg, hsl(var(--waouh-primary)), hsl(var(--waouh-ai)))' }}>
              Achetez.
            </span>
            <span className="block">Vendez.</span>
          </h1>

          <p className="mt-6 max-w-xl text-white/70 text-base sm:text-lg leading-relaxed">
            <span className="text-white font-semibold">WAOUH</span> — le premier marché conversationnel du Bénin.
            WhatsApp, voix, chat. Négociez et payez en parlant. <span className="text-white/90">Aucune app à installer.</span>
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              to="/waouh-chat"
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-[hsl(var(--waouh-primary))] px-6 py-3.5 text-[#0A0D1A] font-semibold shadow-[0_10px_40px_-10px_hsl(var(--waouh-primary)/0.6)] transition hover:brightness-110"
            >
              <Sparkles className="h-4 w-4" />
              Essayer WAOUH maintenant
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="https://wa.me/22965653468?text=Salut%20WAOUH"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#25D366]/50 bg-[#25D366]/10 px-6 py-3.5 text-[#25D366] font-semibold transition hover:bg-[#25D366]/20"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp&nbsp;<span className="font-mono text-sm" style={{ fontFamily: '"JetBrains Mono", monospace' }}>+229 65 65 34 68</span>
            </a>
          </div>

          {/* mini badges */}
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] uppercase tracking-wider text-white/40">
            <span>🛰️ Radar IA</span>
            <span>💸 Mobile Money</span>
            <span>🔒 Escrow</span>
            <span>🇧🇯 Français · Fon · Yoruba</span>
          </div>
        </div>

        {/* RIGHT — phone mock */}
        <div className="relative mx-auto w-full max-w-[360px]">
          <div
            className="absolute -inset-10 rounded-[60px] blur-3xl opacity-50"
            style={{ background: 'radial-gradient(closest-side, hsl(var(--waouh-primary)/0.4), transparent)' }}
          />
          <div className="relative aspect-[9/19] rounded-[44px] border border-white/10 bg-[#0B141A] p-3 shadow-[0_60px_120px_-30px_rgba(0,0,0,0.7)] rotate-[-2deg]">
            {/* notch */}
            <div className="absolute left-1/2 top-3 z-10 h-5 w-24 -translate-x-1/2 rounded-b-2xl bg-black" />
            {/* screen */}
            <div className="relative h-full w-full overflow-hidden rounded-[34px] bg-[#0B141A]">
              {/* WA header */}
              <div className="flex items-center gap-2.5 bg-[#202C33] px-3 py-2.5">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[hsl(var(--waouh-primary))] to-[hsl(var(--waouh-ai))] flex items-center justify-center text-[10px] font-bold text-[#0A0D1A]">W</div>
                <div className="flex-1">
                  <div className="text-[12px] text-white font-medium leading-tight">WAOUH</div>
                  <div className="text-[10px] text-white/50 leading-tight">en ligne</div>
                </div>
                <div className="text-white/40 text-[10px] font-mono" style={{ fontFamily: '"JetBrains Mono", monospace' }}>•••</div>
              </div>

              {/* bg pattern */}
              <div
                className="relative h-[calc(100%-44px)] overflow-hidden px-3 pt-3 pb-4 space-y-2"
                style={{
                  background:
                    'repeating-linear-gradient(45deg, #0E1A22 0 2px, transparent 2px 6px), #0B141A',
                }}
                key={tick}
              >
                {SCRIPT.map((b, i) => (
                  <div key={i} style={{ animationDelay: `${b.delay}ms`, animationFillMode: 'backwards' }}>
                    <ChatBubble b={b} />
                  </div>
                ))}
                <div style={{ animationDelay: `${SCRIPT[SCRIPT.length - 1].delay + 600}ms`, animationFillMode: 'backwards' }} className="animate-fade-in">
                  <div className="flex justify-start"><div className="bg-[#202C33] rounded-2xl rounded-bl-sm"><Typing /></div></div>
                </div>
              </div>
            </div>
          </div>

          {/* floating chip */}
          <div className="absolute -left-6 top-1/3 hidden sm:flex items-center gap-2 rounded-full border border-[hsl(var(--waouh-success)/0.4)] bg-[#0A0D1A]/80 backdrop-blur px-3 py-1.5 text-[11px] text-[hsl(var(--waouh-success))] shadow-xl">
            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--waouh-success))] animate-pulse" />
            +1 transaction
          </div>
          <div className="absolute -right-4 bottom-16 hidden sm:flex items-center gap-2 rounded-full border border-[hsl(var(--waouh-primary)/0.4)] bg-[#0A0D1A]/80 backdrop-blur px-3 py-1.5 text-[11px] text-[hsl(var(--waouh-primary))] shadow-xl">
            🛰️ Radar IA
          </div>
        </div>
      </div>
    </section>
  );
};
