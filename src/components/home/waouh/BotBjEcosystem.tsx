import React from 'react';
import { Link } from 'react-router-dom';
import { Mic, Stethoscope, MessageCircle, Wand2, Users, ArrowUpRight } from 'lucide-react';

const modules = [
  { to: '/kpakpato',          name: 'Kpakpato',     desc: 'Agent vocal IA temps réel',           Icon: Mic,           color: 'hsl(var(--waouh-ai))' },
  { to: '/automations',       name: 'IA Clinique',  desc: 'Santé, RDV, WhatsApp + Calendar',     Icon: Stethoscope,   color: '#22c55e' },
  { to: '/whatsapp-diffusion',name: 'WhatsApp IA',  desc: 'Campagnes & diffusion intelligentes', Icon: MessageCircle, color: '#25D366' },
  { to: '/video-generation',  name: 'IA Visual',    desc: 'Vidéos & visuels Gemini 2.5',         Icon: Wand2,         color: '#FBBF24' },
  { to: '/prospects',         name: 'CRM',          desc: 'Prospects & qualification',           Icon: Users,         color: '#60a5fa' },
];

export const BotBjEcosystem: React.FC = () => (
  <section style={{ fontFamily: '"Space Grotesk", Inter, sans-serif' }}>
    <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
      <div>
        <div className="text-[11px] uppercase tracking-[0.25em] text-[hsl(var(--waouh-primary))] mb-2">L’écosystème bot.bj</div>
        <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
          Au-delà de WAOUH, <span className="text-white/40">la même IA pour tout votre business.</span>
        </h2>
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
      {/* WAOUH flagship */}
      <Link
        to="/waouh-chat"
        className="group lg:col-span-7 relative overflow-hidden rounded-2xl border border-[hsl(var(--waouh-primary)/0.4)] p-8 sm:p-10 min-h-[260px]"
        style={{
          background:
            'radial-gradient(700px 300px at 80% 0%, hsl(var(--waouh-primary) / 0.25), transparent 60%),' +
            'linear-gradient(135deg, #0A0D1A 0%, #0C0F1C 60%, #1B0F3B 100%)',
        }}
      >
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--waouh-primary)/0.5)] bg-[hsl(var(--waouh-primary)/0.1)] px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--waouh-primary))]">
          ★ Produit phare
        </div>
        <h3 className="mt-5 text-5xl sm:text-6xl font-bold text-white leading-none">WAOUH</h3>
        <p className="mt-4 max-w-md text-white/70">Le marché conversationnel — chat, WhatsApp, voix.</p>
        <div className="mt-8 inline-flex items-center gap-2 text-[hsl(var(--waouh-primary))] font-medium">
          Ouvrir WAOUH <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      </Link>

      {/* Secondary modules */}
      <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {modules.map(({ to, name, desc, Icon, color }) => (
          <Link
            key={name}
            to={to}
            className="group relative overflow-hidden rounded-2xl border border-[hsl(var(--waouh-border))] bg-[hsl(var(--waouh-bg))] p-5 hover:border-white/20 transition"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${color}1A`, border: `1px solid ${color}40` }}>
              <Icon className="h-5 w-5" style={{ color }} />
            </div>
            <h4 className="mt-4 text-base font-semibold text-white">{name}</h4>
            <p className="text-xs text-white/50 mt-1 leading-snug">{desc}</p>
            <ArrowUpRight className="absolute top-4 right-4 h-4 w-4 text-white/30 group-hover:text-white transition" />
          </Link>
        ))}
      </div>
    </div>
  </section>
);
