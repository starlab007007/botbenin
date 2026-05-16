import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MessageCircle, Sparkles, MapPin } from 'lucide-react';

/**
 * WAOUH Live Hero — Sky Electric edition
 * Light vivid background, deep-navy phone (not black) with WhatsApp-style bubbles.
 */

type Bubble = { side: 'in' | 'out' | 'sys'; text: string; delay: number };

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
    <span className="waouh-typing-dot h-1.5 w-1.5 rounded-full bg-white/70" />
    <span className="waouh-typing-dot h-1.5 w-1.5 rounded-full bg-white/70" />
    <span className="waouh-typing-dot h-1.5 w-1.5 rounded-full bg-white/70" />
  </div>
);

const ChatBubble: React.FC<{ b: Bubble }> = ({ b }) => {
  if (b.side === 'sys') {
    return (
      <div
        className="mx-auto rounded-full px-3 py-1 text-[10.5px] font-medium animate-fade-in"
        style={{
          background: '#FFD23F33',
          border: '1px solid #FFD23F88',
          color: '#FFE08A',
        }}
      >
        {b.text}
      </div>
    );
  }
  const isIn = b.side === 'in';
  return (
    <div className={`flex ${isIn ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      <div
        className={`max-w-[78%] whitespace-pre-line px-3 py-2 text-[12.5px] leading-snug rounded-2xl ${
          isIn ? 'rounded-br-sm' : 'rounded-bl-sm'
        }`}
        style={
          isIn
            ? { background: '#25D366', color: '#FFFFFF' }
            : { background: '#1B3A6B', color: '#FFFFFF', border: '1px solid #2B4F8E' }
        }
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
      className="relative overflow-hidden rounded-3xl"
      style={{
        background:
          'radial-gradient(1100px 600px at 85% 0%, hsl(var(--home-accent) / 0.30), transparent 60%),' +
          'radial-gradient(900px 500px at 0% 100%, hsl(var(--home-accent-warm) / 0.30), transparent 60%),' +
          'linear-gradient(180deg, hsl(var(--home-surface)) 0%, hsl(var(--home-bg)) 100%)',
        border: '1px solid hsl(var(--home-border))',
        boxShadow: '0 30px 80px -40px hsl(var(--home-accent) / 0.45)',
        fontFamily: '"Space Grotesk", Inter, sans-serif',
      }}
    >
      {/* subtle grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            'linear-gradient(hsl(var(--home-text) / 0.6) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--home-text) / 0.6) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />

      <div className="relative grid lg:grid-cols-[1.15fr_1fr] gap-8 lg:gap-12 p-4 sm:p-8 md:p-10 lg:p-14">
        {/* LEFT */}
        <div className="flex flex-col justify-center">
          <div
            className="inline-flex items-center gap-2 self-start rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] backdrop-blur waouh-badge-new"
            style={{
              border: '1px solid hsl(var(--home-accent))',
              background: 'hsl(var(--home-accent) / 0.12)',
              color: 'hsl(var(--home-text))',
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: '#22c55e' }} />
            LIVE
            <span style={{ color: 'hsl(var(--home-text-muted))' }}>•</span>
            <MapPin className="h-3 w-3" /> Cotonou
            <span style={{ color: 'hsl(var(--home-text-muted))' }}>•</span>
            <span className="font-mono" style={{ fontFamily: '"JetBrains Mono", monospace' }}>{time}</span>
          </div>

          <h1
            className="mt-5 sm:mt-6 font-bold leading-[0.95] tracking-tight text-[34px] xs:text-[40px] sm:text-[56px] md:text-[68px] lg:text-[80px] xl:text-[88px]"
            style={{ color: 'hsl(var(--home-text))' }}
          >
            <span className="block">Parlez.</span>
            <span
              className="block italic font-medium text-transparent bg-clip-text"
              style={{
                backgroundImage: 'linear-gradient(90deg, hsl(var(--home-accent)), hsl(var(--home-accent-warm)))',
              }}
            >
              Achetez.
            </span>
            <span className="block">Vendez.</span>
          </h1>

          <p
            className="mt-5 sm:mt-6 max-w-xl text-sm sm:text-base md:text-lg leading-relaxed"
            style={{ color: 'hsl(var(--home-text-muted))' }}
          >
            <span className="font-semibold" style={{ color: 'hsl(var(--home-text))' }}>WAOUH</span> — le premier marché conversationnel du Bénin.
            WhatsApp, voix, chat. Négociez et payez en parlant.{' '}
            <span style={{ color: 'hsl(var(--home-text))' }}>Aucune app à installer.</span>
          </p>

          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              to="/waouh-chat"
              className="group inline-flex items-center justify-center gap-2 rounded-xl px-5 sm:px-6 py-3 sm:py-3.5 text-sm sm:text-base font-semibold transition hover:brightness-110"
              style={{
                background: 'hsl(var(--home-accent))',
                color: 'hsl(var(--home-text))',
                boxShadow: '0 10px 40px -10px hsl(var(--home-accent) / 0.7)',
              }}
            >
              <Sparkles className="h-4 w-4" />
              Essayer WAOUH
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="https://wa.me/22965653468?text=Salut%20WAOUH"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl px-5 sm:px-6 py-3 sm:py-3.5 text-sm sm:text-base font-semibold transition"
              style={{
                border: '1px solid #25D36680',
                background: '#25D36618',
                color: '#0E5A26',
              }}
            >
              <MessageCircle className="h-4 w-4" />
              <span className="hidden xs:inline">WhatsApp&nbsp;</span>
              <span className="font-mono text-xs sm:text-sm" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                +229 65 65 34 68
              </span>
            </a>
          </div>

          <div
            className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] uppercase tracking-wider"
            style={{ color: 'hsl(var(--home-text-muted))' }}
          >
            <span>🛰️ Radar IA</span>
            <span>💸 Mobile Money</span>
            <span>🔒 Escrow</span>
            <span>🇧🇯 Français · Fon · Yoruba</span>
          </div>
        </div>

        {/* RIGHT — phone mock (deep navy frame, not black) */}
        <div className="relative mx-auto w-full max-w-[260px] sm:max-w-[300px] md:max-w-[340px] lg:max-w-[360px]">
          <div
            className="absolute -inset-10 rounded-[60px] blur-3xl opacity-60"
            style={{ background: 'radial-gradient(closest-side, hsl(var(--home-accent) / 0.5), transparent)' }}
          />
          <div
            className="relative aspect-[9/19] rounded-[44px] p-3 rotate-[-2deg]"
            style={{
              background: '#0B2447',
              border: '1px solid #1B3A6B',
              boxShadow: '0 60px 120px -30px hsl(var(--home-accent) / 0.5), 0 0 0 6px #FFFFFF20',
            }}
          >
            {/* notch (navy not black) */}
            <div
              className="absolute left-1/2 top-3 z-10 h-5 w-24 -translate-x-1/2 rounded-b-2xl"
              style={{ background: '#0B2447' }}
            />
            {/* screen */}
            <div
              className="relative h-full w-full overflow-hidden rounded-[34px]"
              style={{ background: '#0F2F5B' }}
            >
              {/* header */}
              <div
                className="flex items-center gap-2 px-3 py-2.5"
                style={{ background: '#15396E', borderBottom: '1px solid #1F4A85' }}
              >
                <div
                  className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{ background: 'hsl(var(--home-accent))', color: '#0B2447' }}
                >
                  W
                </div>
                <div className="flex-1">
                  <div className="text-[12px] font-medium leading-tight text-white">WAOUH</div>
                  <div className="text-[10px] leading-tight text-white/60">en ligne</div>
                </div>
                <div
                  className="text-white/50 text-[10px] font-mono"
                  style={{ fontFamily: '"JetBrains Mono", monospace' }}
                >
                  •••
                </div>
              </div>

              <div
                className="relative h-[calc(100%-44px)] overflow-hidden px-3 pt-3 pb-4 space-y-2"
                style={{
                  background:
                    'repeating-linear-gradient(45deg, #133765 0 2px, transparent 2px 6px), #0F2F5B',
                }}
                key={tick}
              >
                {SCRIPT.map((b, i) => (
                  <div key={i} style={{ animationDelay: `${b.delay}ms`, animationFillMode: 'backwards' }}>
                    <ChatBubble b={b} />
                  </div>
                ))}
                <div
                  style={{
                    animationDelay: `${SCRIPT[SCRIPT.length - 1].delay + 600}ms`,
                    animationFillMode: 'backwards',
                  }}
                  className="animate-fade-in"
                >
                  <div className="flex justify-start">
                    <div
                      className="rounded-2xl rounded-bl-sm"
                      style={{ background: '#1B3A6B', border: '1px solid #2B4F8E' }}
                    >
                      <Typing />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* floating chips */}
          <div
            className="absolute -left-6 top-1/3 hidden sm:flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] shadow-xl backdrop-blur"
            style={{
              border: '1px solid #22c55e80',
              background: 'hsl(var(--home-surface) / 0.95)',
              color: '#16873A',
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: '#22c55e' }} />
            +1 transaction
          </div>
          <div
            className="absolute -right-4 bottom-16 hidden sm:flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] shadow-xl backdrop-blur"
            style={{
              border: '1px solid hsl(var(--home-accent))',
              background: 'hsl(var(--home-surface) / 0.95)',
              color: 'hsl(var(--home-text))',
            }}
          >
            🛰️ Radar IA
          </div>
        </div>
      </div>
    </section>
  );
};
